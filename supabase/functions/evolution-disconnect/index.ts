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

    if (!evolutionApiUrl || !evolutionApiKey || !instanceName) {
      return new Response(
        JSON.stringify({ success: false, error: "Preencha URL, token e nome da instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);
    const headers = { apikey: evolutionApiKey, Accept: "application/json" };
    const inst = encodeURIComponent(instanceName);

    // Evolution API v2: DELETE /instance/logout/{instance}
    const attempts: Array<{ url: string; method: string }> = [
      { url: `${cleanUrl}/instance/logout/${inst}`, method: "DELETE" },
      { url: `${cleanUrl}/instance/logout/${inst}`, method: "POST" },
      { url: `${cleanUrl}/instance/disconnect/${inst}`, method: "DELETE" },
      { url: `${cleanUrl}/instance/disconnect/${inst}`, method: "POST" },
    ];

    let lastError = "";
    let lastStatus = 0;
    for (const { url, method } of attempts) {
      try {
        console.log(`Trying logout ${method}:`, url);
        const resp = await fetch(url, { method, headers });
        const text = await resp.text();
        if (resp.ok) {
          return new Response(
            JSON.stringify({ success: true, message: "WhatsApp desconectado." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const lower = text.toLowerCase();
        if (
          resp.status === 400 &&
          (lower.includes("not connected") || lower.includes("not logged") || lower.includes("close") || lower.includes("disconnect"))
        ) {
          return new Response(
            JSON.stringify({ success: true, message: "WhatsApp já estava desconectado." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        lastError = text || `HTTP ${resp.status}`;
        lastStatus = resp.status;
      } catch (e) {
        lastError = String(e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: lastError || "Não foi possível desconectar.", status: lastStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("disconnect error", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro ao desconectar", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
