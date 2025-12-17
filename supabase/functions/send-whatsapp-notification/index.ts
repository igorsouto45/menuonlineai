import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderNotification {
  orderId?: string;
  customerPhone: string;
  customerName?: string;
  status: string;
  restaurantName?: string;
  orderTotal?: number;
  customMessage?: string;
  // Evolution API credentials from restaurant settings
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
}

const statusMessages: Record<string, string> = {
  confirmed: '✅ Seu pedido foi *confirmado*! Estamos preparando com carinho.',
  preparing: '👨‍🍳 Seu pedido está sendo *preparado*!',
  ready: '🎉 Seu pedido está *pronto*! Aguardando entrega/retirada.',
  out_for_delivery: '🚚 Seu pedido *saiu para entrega*! Em breve chegará até você.',
  delivered: '🚀 Seu pedido foi *entregue*! Obrigado pela preferência!',
  cancelled: '❌ Infelizmente seu pedido foi *cancelado*. Entre em contato para mais informações.',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      orderId, 
      customerPhone, 
      customerName, 
      status, 
      restaurantName, 
      orderTotal,
      customMessage,
      evolutionApiUrl,
      evolutionApiKey,
      evolutionInstanceName
    }: OrderNotification = await req.json();

    // Use credentials from request or fall back to environment variables
    const EVOLUTION_API_URL = evolutionApiUrl || Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = evolutionApiKey || Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_INSTANCE_NAME = evolutionInstanceName || Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.error('Evolution API credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured. Configure nas configurações do restaurante.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customerPhone || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customerPhone, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number (remove non-digits and ensure country code)
    let phone = customerPhone.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    // Build message
    let message = '';
    
    if (status === 'promotion' && customMessage) {
      // Custom promotional message
      message = `🎉 *${restaurantName || 'Promoção Especial'}*\n\n`;
      message += `Olá${customerName ? ` ${customerName}` : ''}!\n\n`;
      message += customMessage;
    } else {
      // Order status message
      const statusMessage = statusMessages[status] || `Status do pedido: ${status}`;
      message = `🍕 *${restaurantName || 'Restaurante'}*\n\n`;
      message += `Olá${customerName ? ` ${customerName}` : ''}!\n\n`;
      if (orderId) {
        message += `Pedido: *#${orderId.slice(0, 8).toUpperCase()}*\n`;
      }
      if (orderTotal) {
        message += `Total: *R$ ${orderTotal.toFixed(2)}*\n`;
      }
      message += `\n${statusMessage}`;
    }

    console.log(`Sending WhatsApp notification to ${phone} for order ${orderId}`);

    // Send via Evolution API
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', responseData);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: responseData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('WhatsApp notification sent successfully:', responseData);

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.key?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
