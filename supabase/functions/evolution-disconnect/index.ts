import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEvolutionUrl(rawUrl: string) {
  let cleanUrl = rawUrl.trim().replace(/\/+$/, "");
  if (cleanUrl.endsWith("/manager")) cleanUrl = cleanUrl.replace("/manager", "");
  if (cleanUrl.endsWith("/swagger/index.html")) cleanUrl = cleanUrl.replace("/swagger/index.html", "");
  return cleanUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const evolutionApiUrl = String(body?.evolutionApiUrl || "").trim();
    const evolutionApiKey = String(body?.evolutionApiKey || "").trim();
    const instanceName = String(body?.evolutionInstanceName || "").trim();

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Preencha URL e token do Evolution GO." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);
    const headers = { apikey: evolutionApiKey, Accept: "application/json" };

    const endpoints = [
      instanceName ? `${cleanUrl}/instance/logout/${encodeURIComponent(instanceName)}` : null,
      `${cleanUrl}/instance/logout`,
      `${cleanUrl}/instance/disconnect`,
    ].filter(Boolean) as string[];

    let lastError = "";
    for (const url of endpoints) {
      try {
        console.log("Trying logout:", url);
        const resp = await fetch(url, { method: "DELETE", headers });
        // some implementations expect POST
        const finalResp = resp.status === 404 || resp.status === 405
          ? await fetch(url, { method: "POST", headers })
          : resp;

        const text = await finalResp.text();
        if (finalResp.ok) {
          return new Response(
            JSON.stringify({ success: true, message: "WhatsApp desconectado." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        lastError = text || `HTTP ${finalResp.status}`;
      } catch (e) {
        lastError = String(e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: lastError || "Não foi possível desconectar." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("disconnect error", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro ao desconectar", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
