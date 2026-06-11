import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestConnectionRequest {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstanceName?: string;
}

function normalizeEvolutionUrl(rawUrl: string) {
  let cleanUrl = rawUrl.trim().replace(/\/+$/, "");
  if (cleanUrl.endsWith("/manager")) cleanUrl = cleanUrl.replace("/manager", "");
  if (cleanUrl.endsWith("/swagger/index.html")) cleanUrl = cleanUrl.replace("/swagger/index.html", "");
  return cleanUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Partial<TestConnectionRequest>;
    const evolutionApiUrl = typeof body.evolutionApiUrl === "string" ? body.evolutionApiUrl.trim() : "";
    const evolutionApiKey = typeof body.evolutionApiKey === "string" ? body.evolutionApiKey.trim() : "";

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Preencha a URL e a chave (token) do Evolution GO." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);
    console.log(`Testing Evolution GO at ${cleanUrl}`);

    const response = await fetch(`${cleanUrl}/instance/status`, {
      method: "GET",
      headers: { apikey: evolutionApiKey, Accept: "application/json" },
    });

    const contentType = response.headers.get("content-type") || "";
    const responseText = await response.text();
    console.log("Status:", response.status, "CT:", contentType);

    if (contentType.includes("text/html") || responseText.trim().startsWith("<")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "URL inválida. Use a URL base do Evolution GO (sem /swagger ou /manager).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let data: any = {};
    try { data = JSON.parse(responseText); } catch { /* keep raw */ }

    if (response.status === 401 || response.status === 403) {
      return new Response(
        JSON.stringify({ success: false, error: "Token (apikey) inválido para esta instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data?.error || data?.message || "Falha ao consultar o Evolution GO." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Evolution GO status response is flexible; check common fields.
    const rawState = String(
      data?.status ?? data?.state ?? data?.connectionStatus ?? data?.instance?.state ?? data?.instance?.status ?? "",
    ).toLowerCase();
    const isConnected =
      data?.connected === true ||
      rawState === "open" ||
      rawState === "connected" ||
      rawState === "authenticated" ||
      rawState === "loggedin" ||
      rawState === "logged_in";

    return new Response(
      JSON.stringify({
        success: true,
        connected: isConnected,
        state: rawState || "unknown",
        message: isConnected
          ? "✅ Evolution GO conectado!"
          : `⚠️ Instância acessível mas WhatsApp não conectado (estado: ${rawState || "desconhecido"}). Escaneie o QR Code.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error testing Evolution GO connection:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro ao testar conexão", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
