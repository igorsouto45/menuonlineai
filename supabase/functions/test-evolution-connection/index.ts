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

function parseState(data: any): string {
  return String(
    data?.state ??
      data?.status ??
      data?.connectionStatus ??
      data?.instance?.state ??
      data?.instance?.status ??
      data?.instance?.connectionStatus ??
      "",
  ).toLowerCase();
}

function isConnectedState(state: string, data: any): boolean {
  if (data?.connected === true) return true;
  return [
    "open",
    "connected",
    "authenticated",
    "loggedin",
    "logged_in",
    "online",
  ].includes(state);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Partial<TestConnectionRequest>;
    const evolutionApiUrl = typeof body.evolutionApiUrl === "string" ? body.evolutionApiUrl.trim() : "";
    const evolutionApiKey = typeof body.evolutionApiKey === "string" ? body.evolutionApiKey.trim() : "";
    const instanceName = typeof body.evolutionInstanceName === "string" ? body.evolutionInstanceName.trim() : "";

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Preencha a URL e a chave (token) do Evolution GO." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);
    const headers = { apikey: evolutionApiKey, Accept: "application/json" };

    // Try multiple endpoints in order. Different Evolution forks expose different paths.
    const endpoints: string[] = [];
    if (instanceName) {
      endpoints.push(`${cleanUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`);
      endpoints.push(`${cleanUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`);
    }
    endpoints.push(`${cleanUrl}/instance/fetchInstances`);
    endpoints.push(`${cleanUrl}/instance/status`);

    let lastError = "";
    let lastState = "";
    let authFailed = false;

    for (const url of endpoints) {
      try {
        console.log("Checking:", url);
        const resp = await fetch(url, { method: "GET", headers });
        const ct = resp.headers.get("content-type") || "";
        const text = await resp.text();

        if (ct.includes("text/html") || text.trim().startsWith("<")) {
          lastError = "URL inválida (HTML retornado). Use a URL base sem /manager ou /swagger.";
          continue;
        }

        if (resp.status === 401 || resp.status === 403) {
          authFailed = true;
          lastError = "Token (apikey) inválido para esta instância.";
          continue;
        }

        let data: any = null;
        try { data = JSON.parse(text); } catch { /* ignore */ }

        if (!resp.ok) {
          lastError = data?.error || data?.message || `HTTP ${resp.status}`;
          continue;
        }

        // fetchInstances returns an array — find the right one
        let target = data;
        if (Array.isArray(data)) {
          target = instanceName
            ? data.find((d: any) =>
                (d?.instance?.instanceName || d?.instanceName || d?.name) === instanceName,
              ) ?? data[0]
            : data[0];
        }

        const state = parseState(target) || parseState(data);
        lastState = state || lastState;

        if (isConnectedState(state, target) || isConnectedState(state, data)) {
          return new Response(
            JSON.stringify({
              success: true,
              connected: true,
              state: state || "open",
              message: "✅ Evolution GO conectado!",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (state) {
          // We got a definitive state — return it.
          return new Response(
            JSON.stringify({
              success: true,
              connected: false,
              state,
              message: `⚠️ Instância acessível mas WhatsApp não conectado (estado: ${state}). Escaneie o QR Code.`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // No state in this response — try next endpoint
        lastError = "Resposta sem informação de estado.";
      } catch (e) {
        lastError = String(e);
      }
    }

    if (authFailed) {
      return new Response(
        JSON.stringify({ success: false, error: "Token (apikey) inválido para esta instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        connected: false,
        state: lastState || "unknown",
        message: lastError || "Não foi possível confirmar o estado da instância.",
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
