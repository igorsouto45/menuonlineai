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

    // Test connection by fetching instance info
    const response = await fetch(
      `${evolutionApiUrl}/instance/fetchInstances?instanceName=${evolutionInstanceName}`,
      {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey,
        },
      }
    );

    const data = await response.json();
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
