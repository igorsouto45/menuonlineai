import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Anti-blocking configuration
const BATCH_SIZE = 10; // Send 10 messages per batch
const MIN_DELAY_MS = 3000; // Minimum 3 seconds between messages
const MAX_DELAY_MS = 10000; // Maximum 10 seconds between messages
const MIN_PAUSE_MS = 120000; // Minimum 2 minutes pause after batch
const MAX_PAUSE_MS = 300000; // Maximum 5 minutes pause after batch

// Random delay helper
const randomDelay = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      .in('status', ['scheduled', 'sending'])
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

      // Update status to sending if not already
      if (campaign.status !== 'sending') {
        await supabase
          .from('promotion_campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);
      }

      // Get the restaurant's Evolution GO credentials (URL + apikey/token)
      const restaurant = campaign.restaurants;
      if (!restaurant?.evolution_api_url || !restaurant?.evolution_api_key) {
        console.error(`Restaurant ${restaurant?.id} missing Evolution GO credentials`);
        await supabase
          .from('promotion_campaigns')
          .update({ 
            status: 'error',
            error_count: campaign.total_recipients
          })
          .eq('id', campaign.id);
        continue;
      }
      const evolutionBaseUrl = String(restaurant.evolution_api_url).replace(/\/+$/, '').replace(/\/manager$/, '');

      // Get pending sends for this campaign
      let { data: sends } = await supabase
        .from('promotion_sends')
        .select('*, customers(*)')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending');

      // If no sends exist, get customers directly and create send records
      if (!sends || sends.length === 0) {
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
          
          sends = newSends || [];
        }
      }

      if (!sends || sends.length === 0) {
        console.log(`No pending sends for campaign ${campaign.id}`);
        await supabase
          .from('promotion_campaigns')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', campaign.id);
        continue;
      }

      let successCount = campaign.sent_count || 0;
      let errorCount = campaign.error_count || 0;
      let batchCount = 0;

      console.log(`Processing ${sends.length} pending sends for campaign ${campaign.id}`);
      console.log(`Anti-blocking: Batch size ${BATCH_SIZE}, delay ${MIN_DELAY_MS}-${MAX_DELAY_MS}ms, pause ${MIN_PAUSE_MS/1000}-${MAX_PAUSE_MS/1000}s`);

      for (let i = 0; i < sends.length; i++) {
        const send = sends[i];
        
        try {
          const customer = send.customers;
          const phone = send.customer_phone?.replace(/\D/g, '') || '';
          const formattedPhone = phone.startsWith('55') ? phone : '55' + phone;

          // Personalize message
          const personalizedMessage = campaign.message.replace(
            /\{nome\}/gi,
            customer?.name || 'Cliente'
          );

          console.log(`Sending message ${i + 1}/${sends.length} to ${formattedPhone}`);

          // Send via Evolution GO
          const response = await fetch(
            `${evolutionBaseUrl}/send/text`,
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
            console.log(`Message sent successfully to ${formattedPhone}`);
          } else {
            errorCount++;
            const errorData = await response.json();
            await supabase
              .from('promotion_sends')
              .update({ status: 'error', error_message: JSON.stringify(errorData) })
              .eq('id', send.id);
            console.error(`Failed to send to ${formattedPhone}:`, errorData);
          }

          batchCount++;

          // Update campaign progress periodically
          if (batchCount % BATCH_SIZE === 0) {
            await supabase
              .from('promotion_campaigns')
              .update({ sent_count: successCount, error_count: errorCount })
              .eq('id', campaign.id);
          }

          // Anti-blocking: delay between messages (3-10 seconds)
          if (i < sends.length - 1) {
            const messageDelay = randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
            console.log(`Waiting ${messageDelay}ms before next message...`);
            await sleep(messageDelay);
          }

          // Anti-blocking: pause after every batch of 10 messages (2-5 minutes)
          if (batchCount === BATCH_SIZE && i < sends.length - 1) {
            const batchPause = randomDelay(MIN_PAUSE_MS, MAX_PAUSE_MS);
            console.log(`Batch complete. Pausing for ${Math.round(batchPause/1000)} seconds to avoid blocking...`);
            
            // Update progress before pause
            await supabase
              .from('promotion_campaigns')
              .update({ sent_count: successCount, error_count: errorCount })
              .eq('id', campaign.id);
            
            await sleep(batchPause);
            batchCount = 0; // Reset batch counter
            console.log('Resuming message sending...');
          }

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