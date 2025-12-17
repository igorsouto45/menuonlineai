import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionRequest {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstanceName: string;
}

function redactSensitive(text: string) {
  return text
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"***"')
    .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"***"');
}

function normalizeEvolutionUrl(rawUrl: string) {
  let cleanUrl = rawUrl.trim().replace(/\/+$/, "");
  if (cleanUrl.endsWith("/manager")) {
    cleanUrl = cleanUrl.replace("/manager", "");
  }
  return cleanUrl;
}

function getInstanceName(i: any) {
  return (
    i?.instance?.instanceName ||
    i?.instanceName ||
    i?.instance?.name ||
    i?.name ||
    ""
  );
}

function getConnectionState(i: any) {
  return (
    i?.instance?.state ||
    i?.state ||
    i?.instance?.connectionStatus ||
    i?.connectionStatus ||
    "unknown"
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<TestConnectionRequest>;
    const evolutionApiUrl = typeof body.evolutionApiUrl === "string" ? body.evolutionApiUrl.trim() : "";
    const evolutionApiKey = typeof body.evolutionApiKey === "string" ? body.evolutionApiKey.trim() : "";
    const evolutionInstanceName = typeof body.evolutionInstanceName === "string" ? body.evolutionInstanceName.trim() : "";

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstanceName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Preencha todos os campos da Evolution API",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);

    console.log(`Testing connection to ${cleanUrl} with instance ${evolutionInstanceName}`);
    console.log(`Clean URL: ${cleanUrl}`);

    const response = await fetch(
      `${cleanUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(evolutionInstanceName)}`,
      {
        method: "GET",
        headers: {
          apikey: evolutionApiKey,
        },
      },
    );

    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();

    console.log("Response status:", response.status);
    console.log("Content-Type:", contentType);
    console.log("Response preview:", redactSensitive(responseText).substring(0, 400));

    // Detect HTML error pages
    if (
      contentType.includes("text/html") ||
      responseText.trim().startsWith("<!") ||
      responseText.trim().toLowerCase().startsWith("<html")
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "URL da Evolution API inválida. Verifique se a URL está correta (não use /manager no final).",
          details: `A API retornou uma página HTML ao invés de JSON. URL testada: ${cleanUrl}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Resposta inválida da Evolution API",
          details: `Não foi possível interpretar a resposta: ${responseText.substring(0, 200)}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Evolution API response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.message || "Falha na conexão com a Evolution API",
          details: data,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const instances = Array.isArray(data) ? data : [data];
    const targetName = evolutionInstanceName.toLowerCase();

    const instance = instances.find((i: any) => {
      const name = getInstanceName(i);
      return name && name.toLowerCase() === targetName;
    });

    if (!instance) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Instância "${evolutionInstanceName}" não encontrada`,
          availableInstances: instances
            .map((i: any) => getInstanceName(i))
            .filter(Boolean),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawState = getConnectionState(instance);
    const connectionState = typeof rawState === "string" ? rawState.toLowerCase() : "unknown";
    const isConnected = connectionState === "open" || connectionState === "connected";

    return new Response(
      JSON.stringify({
        success: true,
        connected: isConnected,
        state: connectionState,
        instanceName: evolutionInstanceName,
        message: isConnected
          ? "✅ Conexão estabelecida com sucesso!"
          : `⚠️ Instância encontrada mas não conectada (estado: ${connectionState})`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error testing connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro ao testar conexão",
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
