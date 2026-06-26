import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  orderId?: string;
  restaurantId?: string;
  customerPhone: string;
  customerName?: string;
  status: string;
  restaurantName?: string;
  orderTotal?: number;
  customMessage?: string;
  // Legacy: still accepted but ignored if restaurantId is provided
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  baseUrl?: string;
}

const statusMessages: Record<string, string> = {
  pending: '📝 Recebemos seu pedido! Em breve confirmaremos.',
  confirmed: '✅ Seu pedido foi *confirmado*! Estamos preparando com carinho.',
  preparing: '👨‍🍳 Seu pedido está sendo *preparado*!',
  ready: '🎉 Seu pedido está *pronto*! Aguardando entrega/retirada.',
  out_for_delivery: '🚚 Seu pedido *saiu para entrega*! Em breve chegará até você.',
  delivered: '🚀 Seu pedido foi *entregue*! Obrigado pela preferência!',
  cancelled: '❌ Infelizmente seu pedido foi *cancelado*. Entre em contato para mais informações.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      orderId, restaurantId, customerPhone, customerName, status,
      restaurantName, orderTotal, customMessage, baseUrl,
      evolutionApiUrl: bodyApiUrl,
      evolutionApiKey: bodyApiKey,
      evolutionInstanceName: bodyInstance,
    } = body;

    if (!customerPhone || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customerPhone, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve credentials. Priority: restaurant DB → body params → env vars (legacy).
    let rawEvolutionApiUrl: string | null = null;
    let evolutionApiKey: string | null = null;
    let evolutionInstanceName: string | null = null;
    let resolvedRestaurantName = restaurantName ?? null;

    if (restaurantId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      );
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name, evolution_api_url, evolution_api_key, evolution_instance_name')
        .eq('id', restaurantId)
        .maybeSingle();
      if (restaurant) {
        rawEvolutionApiUrl = restaurant.evolution_api_url;
        evolutionApiKey = restaurant.evolution_api_key;
        evolutionInstanceName = restaurant.evolution_instance_name;
        if (!resolvedRestaurantName) resolvedRestaurantName = restaurant.name;
      }
    }

    // Fallback to body-supplied credentials (client passed them through)
    rawEvolutionApiUrl = rawEvolutionApiUrl || bodyApiUrl || null;
    evolutionApiKey = evolutionApiKey || bodyApiKey || null;
    evolutionInstanceName = evolutionInstanceName || bodyInstance || null;

    // Last resort: env vars (legacy / shared instance)
    rawEvolutionApiUrl = rawEvolutionApiUrl || Deno.env.get('EVOLUTION_API_URL') || null;
    evolutionApiKey = evolutionApiKey || Deno.env.get('EVOLUTION_API_KEY') || null;
    evolutionInstanceName = evolutionInstanceName || Deno.env.get('EVOLUTION_INSTANCE_NAME') || null;


    const EVOLUTION_API_URL = rawEvolutionApiUrl
      ? rawEvolutionApiUrl.replace(/\/+$/, '').replace(/\/manager$/, '')
      : null;

    if (!EVOLUTION_API_URL || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ error: 'Evolution GO not configured for this restaurant.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let phone = customerPhone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    let message = '';
    if (status === 'promotion' && customMessage) {
      message = `🎉 *${resolvedRestaurantName || 'Promoção Especial'}*\n\n`;
      message += `Olá${customerName ? ` ${customerName}` : ''}!\n\n`;
      message += customMessage;
    } else {
      const statusMessage = statusMessages[status] || `Status do pedido: ${status}`;
      message = `🍕 *${resolvedRestaurantName || 'Restaurante'}*\n\n`;
      message += `Olá${customerName ? ` ${customerName}` : ''}!\n\n`;
      if (orderId) message += `Pedido: *#${orderId.slice(0, 8).toUpperCase()}*\n`;
      if (orderTotal) message += `Total: *R$ ${orderTotal.toFixed(2)}*\n`;
      message += `\n${statusMessage}`;
      if (status === 'confirmed' && customMessage) message += `\n\n📢 ${customMessage}`;
      if (status === 'delivered' && orderId && baseUrl) {
        message += `\n\n⭐ *Avalie seu pedido:*\n${baseUrl}/avaliar/${orderId}`;
      }
    }

    // Evolution API v2: POST {url}/message/sendText/{instance}
    const instance = evolutionInstanceName || 'default';
    const endpoint = `${EVOLUTION_API_URL}/message/sendText/${instance}`;
    console.log(`Sending to ${endpoint}`);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify({ number: phone, text: message }),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('Evolution fetch failed:', msg);
      return new Response(
        JSON.stringify({ error: `Não foi possível conectar à Evolution API (${EVOLUTION_API_URL}). Verifique a URL configurada.`, detail: msg }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Evolution API error:', response.status, responseData);
      return new Response(
        JSON.stringify({ error: `Evolution retornou ${response.status}`, detail: responseData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    return new Response(
      JSON.stringify({ success: true, messageId: responseData.key?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
