import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstanceName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evolutionApiUrl, evolutionApiKey, evolutionInstanceName }: TestConnectionRequest = await req.json();

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Preencha todos os campos da Evolution API' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing connection to ${evolutionApiUrl} with instance ${evolutionInstanceName}`);

    // Clean up URL - remove trailing slashes and /manager if present
    let cleanUrl = evolutionApiUrl.trim().replace(/\/+$/, '');
    if (cleanUrl.endsWith('/manager')) {
      cleanUrl = cleanUrl.replace('/manager', '');
    }

    console.log(`Clean URL: ${cleanUrl}`);

    // Test connection by fetching instance info
    const response = await fetch(
      `${cleanUrl}/instance/fetchInstances?instanceName=${evolutionInstanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
        },
      }
    );

    // Check content type before parsing
    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Content-Type:', contentType);
    console.log('Response preview:', responseText.substring(0, 500));

    // Check if response is HTML (error page)
    if (contentType.includes('text/html') || responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'URL da Evolution API inválida. Verifique se a URL está correta (não use /manager no final).',
          details: `A API retornou uma página HTML ao invés de JSON. URL testada: ${cleanUrl}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resposta inválida da Evolution API',
          details: `Não foi possível interpretar a resposta: ${responseText.substring(0, 200)}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Evolution API response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || 'Falha na conexão com a Evolution API',
          details: data
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if instance exists and is connected
    const instances = Array.isArray(data) ? data : [data];
    const instance = instances.find((i: any) => i.instance?.instanceName === evolutionInstanceName || i.instanceName === evolutionInstanceName);

    if (!instance) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Instância "${evolutionInstanceName}" não encontrada`,
          availableInstances: instances.map((i: any) => i.instance?.instanceName || i.instanceName).filter(Boolean)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connectionState = instance.instance?.state || instance.state || 'unknown';
    const isConnected = connectionState === 'open' || connectionState === 'connected';

    return new Response(
      JSON.stringify({ 
        success: true, 
        connected: isConnected,
        state: connectionState,
        instanceName: evolutionInstanceName,
        message: isConnected 
          ? '✅ Conexão estabelecida com sucesso!' 
          : `⚠️ Instância encontrada mas não conectada (estado: ${connectionState})`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error testing connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro ao testar conexão',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
