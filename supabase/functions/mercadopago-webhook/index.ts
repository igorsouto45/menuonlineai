import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

async function sendWhatsAppNotification(
  supabaseUrl: string,
  order: any,
  restaurant: any,
  status: string
) {
  try {
    logStep('Sending WhatsApp notification', { orderId: order.id, status });
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        customerPhone: order.customer_phone,
        customerName: order.customer_name,
        status: status,
        restaurantName: restaurant.name,
        orderTotal: order.total,
        evolutionApiUrl: restaurant.evolution_api_url,
        evolutionApiKey: restaurant.evolution_api_key,
        evolutionInstanceName: restaurant.evolution_instance_name,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logStep('WhatsApp notification failed', { error: errorData });
    } else {
      logStep('WhatsApp notification sent successfully');
    }
  } catch (error: any) {
    logStep('Error sending WhatsApp notification', { error: error.message });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');

    const body = await req.json();
    logStep('Webhook body', body);

    const { type, data, action } = body;

    if (type !== 'payment' && action !== 'payment.created' && action !== 'payment.updated') {
      logStep('Ignoring non-payment notification', { type, action });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      logStep('No payment ID in webhook');
      return new Response(JSON.stringify({ error: 'No payment ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Processing payment', { paymentId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find orders with this payment ID in notes
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, notes, restaurant_id, customer_name, customer_phone, total')
      .like('notes', `%${paymentId}%`)
      .eq('status', 'pending');

    if (ordersError) {
      logStep('Error fetching orders', { error: ordersError.message });
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      logStep('No pending orders found for payment', { paymentId });
      return new Response(JSON.stringify({ received: true, message: 'No matching orders' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = orders[0];
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mercado_pago_access_token, name, evolution_api_url, evolution_api_key, evolution_instance_name')
      .eq('id', order.restaurant_id)
      .single();

    if (!restaurant?.mercado_pago_access_token) {
      logStep('Restaurant has no Mercado Pago token');
      return new Response(JSON.stringify({ error: 'No access token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify payment status with Mercado Pago API
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${restaurant.mercado_pago_access_token}`,
      },
    });

    if (!mpResponse.ok) {
      logStep('Failed to fetch payment from Mercado Pago');
      return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentData = await mpResponse.json();
    logStep('Payment data from Mercado Pago', { status: paymentData.status });

    // Update order status based on payment status
    if (paymentData.status === 'approved') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          notes: `${order.notes || ''} | Pagamento aprovado em ${new Date().toISOString()}`
        })
        .eq('id', order.id);

      if (updateError) {
        logStep('Error updating order', { error: updateError.message });
        throw updateError;
      }

      logStep('Order confirmed', { orderId: order.id });

      // Send WhatsApp notification for confirmed payment
      if (order.customer_phone && restaurant.evolution_api_url) {
        await sendWhatsAppNotification(supabaseUrl, order, restaurant, 'confirmed');
      }
    } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          notes: `${order.notes || ''} | Pagamento ${paymentData.status} em ${new Date().toISOString()}`
        })
        .eq('id', order.id);

      if (updateError) {
        logStep('Error cancelling order', { error: updateError.message });
        throw updateError;
      }

      logStep('Order cancelled due to payment rejection', { orderId: order.id });

      // Send WhatsApp notification for cancelled payment
      if (order.customer_phone && restaurant.evolution_api_url) {
        await sendWhatsAppNotification(supabaseUrl, order, restaurant, 'cancelled');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    logStep('ERROR', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
