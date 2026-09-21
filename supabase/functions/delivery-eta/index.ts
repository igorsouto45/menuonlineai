import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Calcula a previsão de chegada da entrega.
 *
 * Fluxo:
 *  1. Valida o acesso temporário do entregador (order_id + session_token).
 *  2. Geocodifica o endereço de entrega uma única vez e guarda as coordenadas.
 *  3. Calcula a rota (Google Routes) da posição atual do entregador até o destino.
 *  4. Grava a previsão no pedido para o cliente acompanhar.
 *
 * As credenciais do Google ficam somente aqui no servidor.
 */

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';
const THROTTLE_SECONDS = 60;

interface DeliverySession {
  order_id: string;
  lat: number | null;
  lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  eta_updated_at: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function googleHeaders(lovableKey: string, mapsKey: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': mapsKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Traduz erros de chave restrita do Google para mensagens acionáveis. */
async function describeGoogleError(response: Response): Promise<string> {
  const text = await response.text();
  if (response.status === 403) {
    try {
      const details: Array<{ reason?: string }> = JSON.parse(text)?.error?.details ?? [];
      const reason = details.find((d) => d.reason)?.reason;
      if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED') {
        return 'A chave do Google Maps está restrita por domínio. Ajuste as restrições da chave de servidor para "Nenhuma" ou "Endereços IP".';
      }
      if (reason === 'API_KEY_SERVICE_BLOCKED') {
        return 'A chave do Google Maps não permite esta API. Adicione-a à lista de APIs liberadas da chave de servidor.';
      }
    } catch {
      // corpo não-JSON: usa o texto bruto abaixo
    }
  }
  return `Google respondeu ${response.status}: ${text}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableKey || !mapsKey) {
      return jsonResponse({ error: 'Integração de mapas não configurada.' }, 503);
    }
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: 'Configuração do servidor incompleta.' }, 500);
    }

    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;
    const token = body?.token;

    if (!isUuid(orderId) || !isUuid(token)) {
      return jsonResponse({ error: 'Dados inválidos para calcular a previsão.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1. Sessão de entrega válida (o token é a autorização do entregador)
    const { data: session, error: sessionError } = await admin
      .from('delivery_sessions')
      .select('order_id, lat, lng, dest_lat, dest_lng, eta_updated_at')
      .eq('order_id', orderId)
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle<DeliverySession>();

    if (sessionError) {
      console.error('Erro ao carregar sessão de entrega:', sessionError.message);
      return jsonResponse({ error: 'Erro ao carregar a entrega.' }, 500);
    }
    if (!session) {
      return jsonResponse({ error: 'Entrega não encontrada ou acesso expirado.' }, 403);
    }
    if (session.lat === null || session.lng === null) {
      return jsonResponse({ error: 'Ainda sem localização do entregador.' }, 409);
    }

    // Evita recalcular a rota a cada posição recebida
    if (session.eta_updated_at) {
      const elapsed = (Date.now() - new Date(session.eta_updated_at).getTime()) / 1000;
      if (elapsed < THROTTLE_SECONDS) {
        return jsonResponse({ skipped: true, reason: 'throttled' });
      }
    }

    // 2. Destino: geocodifica o endereço uma única vez
    let destLat = session.dest_lat;
    let destLng = session.dest_lng;

    if (destLat === null || destLng === null) {
      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('customer_address')
        .eq('id', orderId)
        .maybeSingle<{ customer_address: string | null }>();

      if (orderError) {
        console.error('Erro ao carregar pedido:', orderError.message);
        return jsonResponse({ error: 'Erro ao carregar o pedido.' }, 500);
      }
      const address = order?.customer_address?.trim();
      if (!address) {
        return jsonResponse({ error: 'Pedido sem endereço de entrega.' }, 422);
      }

      const geoResponse = await fetch(
        `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
        { headers: googleHeaders(lovableKey, mapsKey) },
      );
      if (!geoResponse.ok) {
        const details = await describeGoogleError(geoResponse);
        console.error('Geocodificação falhou:', details);
        return jsonResponse({ error: details }, geoResponse.status);
      }
      const geo = await geoResponse.json();
      const location = geo?.results?.[0]?.geometry?.location;
      if (!location) {
        return jsonResponse({ error: 'Não foi possível localizar o endereço de entrega no mapa.' }, 422);
      }
      destLat = location.lat;
      destLng = location.lng;

      await admin
        .from('delivery_sessions')
        .update({ dest_lat: destLat, dest_lng: destLng })
        .eq('order_id', orderId);
    }

    // 3. Rota do entregador até o destino
    const routeResponse = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: googleHeaders(lovableKey, mapsKey, {
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      }),
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: session.lat, longitude: session.lng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: 'TWO_WHEELER',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    if (!routeResponse.ok) {
      const details = await describeGoogleError(routeResponse);
      console.error('Cálculo de rota falhou:', details);
      return jsonResponse({ error: details }, routeResponse.status);
    }

    const route = (await routeResponse.json())?.routes?.[0];
    const durationSeconds = Number.parseInt(String(route?.duration ?? '').replace('s', ''), 10);
    if (!Number.isFinite(durationSeconds)) {
      return jsonResponse({ error: 'Não foi possível calcular a previsão agora.' }, 502);
    }
    const distanceMeters = Number.isFinite(route?.distanceMeters) ? route.distanceMeters : null;

    // 4. Grava a previsão para o cliente
    const now = new Date();
    const estimatedArrival = new Date(now.getTime() + durationSeconds * 1000);

    await admin
      .from('delivery_sessions')
      .update({
        eta_seconds: durationSeconds,
        eta_distance_m: distanceMeters,
        eta_updated_at: now.toISOString(),
      })
      .eq('order_id', orderId);

    await admin
      .from('orders')
      .update({ estimated_delivery_at: estimatedArrival.toISOString() })
      .eq('id', orderId);

    return jsonResponse({
      etaSeconds: durationSeconds,
      distanceMeters,
      estimatedDeliveryAt: estimatedArrival.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('delivery-eta falhou:', message);
    return jsonResponse({ error: message }, 500);
  }
});
