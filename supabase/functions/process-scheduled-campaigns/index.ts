import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking for scheduled campaigns...');

    // Find campaigns scheduled for now or in the past that haven't been sent
    const now = new Date().toISOString();
    const { data: campaigns, error: fetchError } = await supabase
      .from('promotion_campaigns')
      .select('*, restaurants(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('Error fetching campaigns:', fetchError);
      throw fetchError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('No scheduled campaigns to process');
      return new Response(
        JSON.stringify({ message: 'No scheduled campaigns to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${campaigns.length} campaigns to process`);

    const results = [];

    for (const campaign of campaigns) {
      console.log(`Processing campaign: ${campaign.id} - ${campaign.name}`);

      // Update status to sending
      await supabase
        .from('promotion_campaigns')
        .update({ status: 'sending' })
        .eq('id', campaign.id);

      // Get the restaurant's Evolution API credentials
      const restaurant = campaign.restaurants;
      if (!restaurant?.evolution_api_url || !restaurant?.evolution_api_key || !restaurant?.evolution_instance_name) {
        console.error(`Restaurant ${restaurant?.id} missing Evolution API credentials`);
        await supabase
          .from('promotion_campaigns')
          .update({ 
            status: 'error',
            error_count: campaign.total_recipients
          })
          .eq('id', campaign.id);
        continue;
      }

      // Get promotion_sends for this campaign (recipients)
      const { data: sends } = await supabase
        .from('promotion_sends')
        .select('*, customers(*)')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending');

      // If no sends exist, get customers directly
      let recipients = sends || [];
      
      if (recipients.length === 0) {
        // Get all customers for the restaurant
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('restaurant_id', campaign.restaurant_id)
          .limit(campaign.total_recipients || 1000);

        if (customers && customers.length > 0) {
          // Create send records
          const sendRecords = customers.map(c => ({
            campaign_id: campaign.id,
            customer_id: c.id,
            customer_phone: c.whatsapp,
            status: 'pending'
          }));

          await supabase.from('promotion_sends').insert(sendRecords);
          
          // Refetch
          const { data: newSends } = await supabase
            .from('promotion_sends')
            .select('*, customers(*)')
            .eq('campaign_id', campaign.id)
            .eq('status', 'pending');
          
          recipients = newSends || [];
        }
      }

      let successCount = 0;
      let errorCount = 0;

      for (const send of recipients) {
        try {
          const customer = send.customers;
          const phone = send.customer_phone?.replace(/\D/g, '') || '';
          const formattedPhone = phone.startsWith('55') ? phone : '55' + phone;

          // Personalize message
          const personalizedMessage = campaign.message.replace(
            /\{nome\}/gi,
            customer?.name || 'Cliente'
          );

          // Send via Evolution API
          const response = await fetch(
            `${restaurant.evolution_api_url}/message/sendText/${restaurant.evolution_instance_name}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': restaurant.evolution_api_key,
              },
              body: JSON.stringify({
                number: formattedPhone,
                text: personalizedMessage,
              }),
            }
          );

          if (response.ok) {
            successCount++;
            await supabase
              .from('promotion_sends')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', send.id);
          } else {
            errorCount++;
            const errorData = await response.json();
            await supabase
              .from('promotion_sends')
              .update({ status: 'error', error_message: JSON.stringify(errorData) })
              .eq('id', send.id);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (sendError) {
          console.error('Error sending to recipient:', sendError);
          errorCount++;
          await supabase
            .from('promotion_sends')
            .update({ status: 'error', error_message: String(sendError) })
            .eq('id', send.id);
        }
      }

      // Update campaign with final counts
      await supabase
        .from('promotion_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: successCount,
          error_count: errorCount
        })
        .eq('id', campaign.id);

      results.push({
        campaign_id: campaign.id,
        name: campaign.name,
        sent: successCount,
        errors: errorCount
      });

      console.log(`Campaign ${campaign.id} completed: ${successCount} sent, ${errorCount} errors`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing scheduled campaigns:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
