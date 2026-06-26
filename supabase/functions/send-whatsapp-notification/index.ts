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

type ErrorType =
  | 'CONFIGURATION_ERROR'
  | 'EVOLUTION_AUTH_ERROR'
  | 'EVOLUTION_INSTANCE_NOT_FOUND'
  | 'EVOLUTION_CONNECTION_ERROR'
  | 'EVOLUTION_RATE_LIMIT'
  | 'EVOLUTION_BAD_NUMBER'
  | 'EVOLUTION_API_ERROR'
  | 'INTERNAL_ERROR';

interface NotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorType?: ErrorType;
  hint?: string;
  fallback?: boolean;
  statusCode?: number;
  detail?: unknown;
}

// Maps common Evolution API failures to actionable, user-friendly Portuguese messages.
function classifyEvolutionError(
  status: number,
  message: string,
): { errorType: ErrorType; error: string; hint: string } {
  const m = message.toLowerCase();

  if (status === 401 || status === 403 || /unauthorized|invalid\s*(api)?\s*key|apikey|token/i.test(m)) {
    return {
      errorType: 'EVOLUTION_AUTH_ERROR',
      error: 'Autenticação inválida na Evolution API.',
      hint: 'Verifique a API Key da instância em Configurações → WhatsApp. Se você recriou a instância, gere um novo token e cole-o no campo "Chave da API".',
    };
  }

  if (status === 404 || /not\s+found|does not exist|instance.*(missing|inex)/i.test(m)) {
    return {
      errorType: 'EVOLUTION_INSTANCE_NOT_FOUND',
      error: 'Instância não encontrada na Evolution API.',
      hint: 'Confira se o nome da instância está exatamente igual ao do servidor Evolution. Se ela foi removida, clique em "Criar instância e gerar QR Code" no wizard.',
    };
  }

  if (status === 429 || /rate\s*limit|too many requests/i.test(m)) {
    return {
      errorType: 'EVOLUTION_RATE_LIMIT',
      error: 'Limite de envios atingido na Evolution API.',
      hint: 'Aguarde 1-2 minutos antes de enviar novamente. Se acontece com frequência, reduza o volume da campanha ou aumente o intervalo entre mensagens.',
    };
  }

  if (/connection\s+closed|not\s+connected|desconect|logged\s*out|qr/i.test(m)) {
    return {
      errorType: 'EVOLUTION_CONNECTION_ERROR',
      error: 'WhatsApp desconectado na Evolution API.',
      hint: 'Abra Configurações → WhatsApp → Conectar WhatsApp, escaneie o novo QR Code com o celular e clique em "Testar conexão" antes de tentar novamente.',
    };
  }

  if (/exists.*whatsapp|number.*invalid|bad\s*request.*number/i.test(m)) {
    return {
      errorType: 'EVOLUTION_BAD_NUMBER',
      error: 'Número do cliente inválido ou sem WhatsApp.',
      hint: 'Confirme o DDD e os 9 dígitos do celular do cliente. Números fixos e sem WhatsApp são rejeitados pela Evolution API.',
    };
  }

  return {
    errorType: 'EVOLUTION_API_ERROR',
    error: `Evolution API retornou ${status}${message ? `: ${message.slice(0, 160)}` : ''}.`,
    hint: 'Verifique o status do servidor Evolution e o log da instância. Se o erro persistir, reinicie a instância e teste novamente.',
  };
}

const jsonResponse = (payload: NotificationResponse | { error: string }, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
};

const parseEvolutionResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const normalizeEvolutionUrl = (rawUrl: string): string => {
  let cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (cleanUrl.endsWith('/manager')) cleanUrl = cleanUrl.replace('/manager', '');
  if (cleanUrl.endsWith('/swagger/index.html')) cleanUrl = cleanUrl.replace('/swagger/index.html', '');
  return cleanUrl;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getNestedRecord = (value: unknown, key: string): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  const nested = value[key];
  return isRecord(nested) ? nested : null;
};

const getStringValue = (value: unknown, keys: string[]): string => {
  for (const key of keys) {
    if (!isRecord(value)) continue;
    const candidate = value[key];
    if (typeof candidate === 'string') return candidate;
  }
  return '';
};

const getBooleanValue = (value: unknown, keys: string[]): boolean => {
  for (const key of keys) {
    if (!isRecord(value)) continue;
    if (value[key] === true) return true;
  }
  return false;
};

const parseConnectionState = (payload: unknown): string => {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const instance = getNestedRecord(data, 'instance');
  return (
    getStringValue(data, ['state', 'status', 'connectionStatus', 'State', 'Status', 'ConnectionStatus']) ||
    getStringValue(instance, ['state', 'status', 'connectionStatus', 'State', 'Status', 'ConnectionStatus'])
  ).toLowerCase();
};

const isConnectedPayload = (payload: unknown): boolean => {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  const instance = getNestedRecord(data, 'instance');
  const state = parseConnectionState(payload);

  return (
    getBooleanValue(data, ['connected', 'Connected', 'loggedIn', 'LoggedIn']) ||
    getBooleanValue(instance, ['connected', 'Connected', 'loggedIn', 'LoggedIn']) ||
    ['open', 'connected', 'authenticated', 'loggedin', 'logged_in', 'online'].includes(state)
  );
};

const extractEvolutionMessage = (payload: unknown): string => {
  if (typeof payload === 'string') return payload;
  if (!isRecord(payload)) return '';

  const response = getNestedRecord(payload, 'response');
  const responseMessage = response?.message;
  if (Array.isArray(responseMessage)) return responseMessage.map(String).join(' ');
  if (typeof responseMessage === 'string') return responseMessage;

  const message = payload.message;
  if (Array.isArray(message)) return message.map(String).join(' ');
  if (typeof message === 'string') return message;
  if (typeof payload.error === 'string') return payload.error;
  if (typeof payload.raw === 'string') return payload.raw;

  return '';
};

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
      return jsonResponse({ error: 'Missing required fields: customerPhone, status' }, 400);
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


    const EVOLUTION_API_URL = rawEvolutionApiUrl ? normalizeEvolutionUrl(rawEvolutionApiUrl) : null;

    if (!EVOLUTION_API_URL || !evolutionApiKey) {
      return jsonResponse({
        success: false,
        error: 'WhatsApp não configurado para este restaurante.',
        errorType: 'CONFIGURATION_ERROR',
        fallback: true,
      });
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

    // Evolution API v2 requires the exact instance name in the route.
    const instance = evolutionInstanceName?.trim();
    if (!instance) {
      return jsonResponse({
        success: false,
        error: 'Nome da instância da Evolution API não configurado para este restaurante.',
        errorType: 'CONFIGURATION_ERROR',
        fallback: true,
      });
    }

    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'apikey': evolutionApiKey };

    // Pre-check: only BLOCK when the instance reports an explicit disconnected state.
    // Anything ambiguous (unknown/connecting/missing field) falls through to the actual send,
    // which is the source of truth — avoids false negatives that contradict "Testar conexão".
    try {
      const encodedInstance = encodeURIComponent(instance);
      const statusEndpoint = `${EVOLUTION_API_URL}/instance/connectionState/${encodedInstance}`;
      const statusResponse = await fetch(statusEndpoint, { method: 'GET', headers });
      const statusData = await parseEvolutionResponse(statusResponse);

      if (statusResponse.ok) {
        const state = parseConnectionState(statusData);
        const explicitlyDisconnected = ['close', 'closed', 'disconnected', 'logout', 'logged_out'].includes(state);
        if (explicitlyDisconnected && !isConnectedPayload(statusData)) {
          return jsonResponse({
            success: false,
            error: `WhatsApp desconectado na Evolution API (estado: ${state}).`,
            errorType: 'EVOLUTION_CONNECTION_ERROR',
            hint: 'Abra Configurações → WhatsApp → Conectar WhatsApp, escaneie o QR Code novamente e clique em "Testar conexão" antes de mover pedidos.',
            fallback: true,
            statusCode: statusResponse.status,
            detail: statusData,
          });
        }
      }
    } catch (statusErr) {
      console.warn('Could not pre-check Evolution connection state:', getErrorMessage(statusErr));
    }

    const endpoint = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(instance)}`;
    console.log(`Sending to ${endpoint}`);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ number: phone, text: message, delay: 1200, linkPreview: false }),
      });
    } catch (fetchErr) {
      const msg = getErrorMessage(fetchErr);
      console.error('Evolution fetch failed:', msg);
      return jsonResponse({
        success: false,
        error: 'Não foi possível alcançar o servidor da Evolution API.',
        errorType: 'EVOLUTION_CONNECTION_ERROR',
        hint: 'Confirme se a URL da Evolution API está correta (sem /manager ou /swagger), se o servidor está online e se há rede liberada para chamá-lo.',
        fallback: true,
        detail: msg,
      });
    }

    let responseData = await parseEvolutionResponse(response);

    // Auto-recover from "Connection Closed": call /instance/connect and retry once.
    if (!response.ok) {
      const evolutionMessage = extractEvolutionMessage(responseData);
      const isConnClosed = /connection\s+closed|not\s+connected/i.test(evolutionMessage);
      if (isConnClosed) {
        console.warn('Connection Closed detected, attempting auto-reconnect...');
        try {
          await fetch(`${EVOLUTION_API_URL}/instance/connect/${encodeURIComponent(instance)}`, {
            method: 'GET',
            headers,
          });
          await new Promise((r) => setTimeout(r, 2500));
          const retry = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ number: phone, text: message, delay: 1200, linkPreview: false }),
          });
          const retryData = await parseEvolutionResponse(retry);
          if (retry.ok) {
            console.log('Auto-reconnect retry succeeded');
            response = retry;
            responseData = retryData;
          } else {
            console.error('Retry after auto-reconnect failed:', retry.status, retryData);
            responseData = retryData;
          }
        } catch (reErr) {
          console.error('Auto-reconnect attempt failed:', getErrorMessage(reErr));
        }
      }
    }

    if (!response.ok) {
      console.error('Evolution API error:', response.status, responseData);
      const evolutionMessage = extractEvolutionMessage(responseData);
      const classified = classifyEvolutionError(response.status, evolutionMessage);

      return jsonResponse({
        success: false,
        error: classified.error,
        errorType: classified.errorType,
        hint: classified.hint,
        fallback: true,
        statusCode: response.status,
        detail: responseData,
      });
    }

    const messageId = typeof responseData === 'object' && responseData !== null && 'key' in responseData
      ? (responseData as { key?: { id?: string } }).key?.id
      : undefined;

    return jsonResponse({ success: true, messageId });
  } catch (error) {
    const msg = getErrorMessage(error);
    console.error('Error sending WhatsApp notification:', msg);
    return jsonResponse({
      success: false,
      error: 'Falha interna ao preparar a notificação do WhatsApp.',
      errorType: 'INTERNAL_ERROR',
      fallback: true,
      detail: msg,
    });
  }
});
