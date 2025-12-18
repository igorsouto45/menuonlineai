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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');

    const body = await req.json();
    logStep('Webhook body', body);

    // Mercado Pago sends different types of notifications
    const { type, data, action } = body;

    // Only process payment notifications
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
      .select('id, status, notes, restaurant_id')
      .like('notes', `%${paymentId}%`)
      .eq('status', 'pending');

    if (ordersError) {
      logStep('Error fetching orders', { error: ordersError.message });
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      // Try to fetch payment details from Mercado Pago to get restaurant info
      logStep('No pending orders found for payment', { paymentId });
      return new Response(JSON.stringify({ received: true, message: 'No matching orders' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the restaurant's Mercado Pago access token to verify payment
    const order = orders[0];
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mercado_pago_access_token')
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
