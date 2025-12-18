import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-ORDER-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, orderId, paymentStatus } = await req.json();
    logStep('Request received', { action, orderId, paymentStatus });

    if (action === 'confirm_payment') {
      // Update order to confirmed when payment is successful
      const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId)
        .eq('status', 'pending');

      if (error) {
        logStep('Error confirming order', { error: error.message });
        throw error;
      }

      logStep('Order confirmed', { orderId });
      return new Response(
        JSON.stringify({ success: true, message: 'Pedido confirmado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel_unpaid') {
      // Cancel orders that are pending for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const { data: cancelledOrders, error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', notes: 'Cancelado automaticamente - pagamento não realizado em 10 minutos' })
        .eq('status', 'pending')
        .lt('created_at', tenMinutesAgo)
        .select('id');

      if (error) {
        logStep('Error cancelling orders', { error: error.message });
        throw error;
      }

      logStep('Orders cancelled', { count: cancelledOrders?.length || 0 });
      return new Response(
        JSON.stringify({ success: true, cancelled: cancelledOrders?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_order_status') {
      // Check and return order status
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('id', orderId)
        .single();

      if (error) {
        logStep('Error fetching order', { error: error.message });
        throw error;
      }

      // Check if order should be auto-cancelled (pending for more than 10 min)
      if (order.status === 'pending') {
        const createdAt = new Date(order.created_at).getTime();
        const tenMinutes = 10 * 60 * 1000;
        if (Date.now() - createdAt > tenMinutes) {
          await supabase
            .from('orders')
            .update({ status: 'cancelled', notes: 'Cancelado automaticamente - pagamento não realizado em 10 minutos' })
            .eq('id', orderId);
          
          logStep('Order auto-cancelled', { orderId });
          return new Response(
            JSON.stringify({ status: 'cancelled', reason: 'timeout' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ status: order.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
