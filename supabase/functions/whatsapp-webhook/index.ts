import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  pushName?: string;
}

interface WebhookPayload {
  event: string;
  instance: string;
  data: WhatsAppMessage;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // Only process incoming messages (not sent by us)
    if (payload.event !== 'messages.upsert' || payload.data?.key?.fromMe) {
      console.log('Ignoring event:', payload.event, 'fromMe:', payload.data?.key?.fromMe);
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = payload.data?.message?.conversation || 
                    payload.data?.message?.extendedTextMessage?.text;
    
    if (!message) {
      console.log('No message text found');
      return new Response(JSON.stringify({ success: true, noMessage: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerPhone = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
    const customerName = payload.data.pushName || 'Cliente';
    const instanceName = payload.instance;

    console.log(`Processing message from ${customerName} (${customerPhone}): ${message}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find restaurant by Evolution instance name
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('evolution_instance_name', instanceName)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found for instance:', instanceName);
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch restaurant data for AI context
    const [categoriesResult, productsResult, ordersResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('products')
        .select(`
          *,
          categories(name),
          product_variations(*),
          product_additionals(*)
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true),
      supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const categories = categoriesResult.data || [];
    const products = productsResult.data || [];
    const customerOrders = ordersResult.data || [];

    // Check if customer is asking about a specific order
    const orderIdMatch = message.match(/pedido\s*#?([A-F0-9]{8})/i) || 
                         message.match(/#([A-F0-9]{8})/i);
    
    let specificOrder = null;
    if (orderIdMatch) {
      const orderId = orderIdMatch[1].toLowerCase();
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .ilike('id', `${orderId}%`)
        .single();
      specificOrder = orderData;
    }

    // Build context for AI
    const menuContext = products.map(p => {
      let productInfo = `- ${p.name}: R$ ${p.price.toFixed(2)}`;
      if (p.description) productInfo += ` (${p.description})`;
      if (p.product_variations?.length > 0) {
        productInfo += ` | Variações: ${p.product_variations.map((v: any) => `${v.name} R$${v.price.toFixed(2)}`).join(', ')}`;
      }
      if (p.product_additionals?.length > 0) {
        productInfo += ` | Adicionais: ${p.product_additionals.map((a: any) => `${a.name} +R$${a.price.toFixed(2)}`).join(', ')}`;
      }
      return productInfo;
    }).join('\n');

    const categoriesContext = categories.map(c => c.name).join(', ');

    const statusTranslations: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Pronto',
      out_for_delivery: 'Saiu para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };

    const ordersContext = customerOrders.length > 0 
      ? customerOrders.map(o => 
          `Pedido #${o.id.slice(0, 8).toUpperCase()}: ${statusTranslations[o.status] || o.status} - R$ ${o.total.toFixed(2)} (${new Date(o.created_at).toLocaleDateString('pt-BR')})`
        ).join('\n')
      : 'Nenhum pedido anterior encontrado.';

    const specificOrderContext = specificOrder 
      ? `\n\n📋 PEDIDO CONSULTADO:\nNúmero: #${specificOrder.id.slice(0, 8).toUpperCase()}\nStatus: ${statusTranslations[specificOrder.status] || specificOrder.status}\nTotal: R$ ${specificOrder.total.toFixed(2)}\nData: ${new Date(specificOrder.created_at).toLocaleDateString('pt-BR')}`
      : '';

    const systemPrompt = `Você é um atendente virtual do restaurante "${restaurant.name}". Seja simpático, profissional e objetivo.

INFORMAÇÕES DO RESTAURANTE:
- Nome: ${restaurant.name}
- Endereço: ${restaurant.address || 'Não informado'}
- WhatsApp: ${restaurant.whatsapp}
- Horário: ${restaurant.opening_hours || 'Consulte nosso cardápio'}
${restaurant.description ? `- Sobre: ${restaurant.description}` : ''}

CATEGORIAS DISPONÍVEIS:
${categoriesContext}

CARDÁPIO:
${menuContext}

PEDIDOS DO CLIENTE:
${ordersContext}${specificOrderContext}

REGRAS:
1. Responda APENAS sobre o restaurante, cardápio, pedidos e informações gerais
2. Se perguntarem sobre preços, consulte o cardápio acima
3. Se perguntarem sobre status de pedido, use as informações dos pedidos do cliente
4. Para fazer pedido, oriente o cliente a acessar o cardápio digital ou informar os itens
5. Seja breve e direto nas respostas (máximo 3-4 frases)
6. Use emojis com moderação para deixar a conversa mais amigável
7. Se não souber algo, diga que vai verificar com a equipe

IMPORTANTE: Formate a resposta para WhatsApp (use *negrito* e _itálico_ quando apropriado).`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling AI with context...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || 
      'Desculpe, não consegui processar sua mensagem. Por favor, tente novamente.';

    console.log('AI response:', responseText);

    // Send response via Evolution API
    if (restaurant.evolution_api_url && restaurant.evolution_api_key) {
      const sendResponse = await fetch(
        `${restaurant.evolution_api_url}/message/sendText/${restaurant.evolution_instance_name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': restaurant.evolution_api_key,
          },
          body: JSON.stringify({
            number: customerPhone,
            text: responseText,
          }),
        }
      );

      const sendData = await sendResponse.json();
      console.log('Message sent:', sendData);

      if (!sendResponse.ok) {
        console.error('Failed to send WhatsApp message:', sendData);
      }
    } else {
      console.error('Evolution API credentials not configured for restaurant');
    }

    return new Response(
      JSON.stringify({ success: true, response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
