import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  subtotal: number;
  selectedVariation?: { name: string; price: number } | null;
  selectedAdditionals?: { name: string; price: number }[];
}

interface PreferenceRequest {
  items: CartItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryFee: number;
  restaurantId: string;
  total: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      items, 
      customerName, 
      customerEmail, 
      customerPhone, 
      deliveryAddress, 
      deliveryFee,
      restaurantId,
      total
    }: PreferenceRequest = await req.json();

    console.log('Creating Mercado Pago preference for restaurant:', restaurantId);

    // Get restaurant's Mercado Pago credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('mercado_pago_access_token, mercado_pago_enabled, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error('Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ error: 'Restaurante não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!restaurant.mercado_pago_enabled || !restaurant.mercado_pago_access_token) {
      console.error('Mercado Pago not configured');
      return new Response(
        JSON.stringify({ error: 'Mercado Pago não configurado para este restaurante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build preference items
    const preferenceItems = items.map(item => {
      let itemName = item.product.name;
      if (item.selectedVariation) {
        itemName += ` - ${item.selectedVariation.name}`;
      }
      if (item.selectedAdditionals && item.selectedAdditionals.length > 0) {
        itemName += ` + ${item.selectedAdditionals.map(a => a.name).join(', ')}`;
      }

      return {
        title: itemName,
        quantity: item.quantity,
        unit_price: item.subtotal / item.quantity,
        currency_id: 'BRL',
      };
    });

    // Add delivery fee if applicable
    if (deliveryFee > 0) {
      preferenceItems.push({
        title: 'Taxa de entrega',
        quantity: 1,
        unit_price: deliveryFee,
        currency_id: 'BRL',
      });
    }

    // Create Mercado Pago preference
    const preference = {
      items: preferenceItems,
      payer: {
        name: customerName,
        email: customerEmail,
        phone: {
          number: customerPhone.replace(/\D/g, ''),
        },
      },
      back_urls: {
        success: `${req.headers.get('origin')}/menu/${restaurantId}?payment=success`,
        failure: `${req.headers.get('origin')}/menu/${restaurantId}?payment=failure`,
        pending: `${req.headers.get('origin')}/menu/${restaurantId}?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: `${restaurantId}_${Date.now()}`,
      statement_descriptor: restaurant.name.substring(0, 22),
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
    };

    console.log('Creating preference with items:', preferenceItems.length);

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${restaurant.mercado_pago_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Mercado Pago error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar preferência de pagamento', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpData = await mpResponse.json();
    console.log('Preference created successfully:', mpData.id);

    // Create order in database
    const orderItems = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.subtotal / item.quantity,
      subtotal: item.subtotal,
      variation: item.selectedVariation?.name || null,
      additionals: item.selectedAdditionals?.map(a => a.name) || [],
    }));

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: deliveryAddress || null,
        items: orderItems,
        total: total,
        status: 'pending',
        notes: `Pagamento via Mercado Pago - ID: ${mpData.id}`,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
    }

    return new Response(
      JSON.stringify({
        id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        orderId: order?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-mercadopago-preference:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
