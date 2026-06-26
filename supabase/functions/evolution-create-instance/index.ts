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

function extractBase64(data: any): string | null {
  if (!data) return null;
  const candidates = [
    data?.qrcode?.base64,
    data?.qrcode,
    data?.base64,
    data?.qr,
    data?.instance?.qrcode?.base64,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 50) {
      return c.startsWith("data:image") ? c : `data:image/png;base64,${c.replace(/^data:image\/[a-z]+;base64,/, "")}`;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const evolutionApiUrl = String(body?.evolutionApiUrl || "").trim();
    const globalApiKey = String(body?.evolutionApiKey || "").trim();
    const instanceName = String(body?.evolutionInstanceName || "").trim();

    if (!evolutionApiUrl || !globalApiKey || !instanceName) {
      return new Response(
        JSON.stringify({ success: false, error: "Preencha URL, API Key global e nome da instância." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);
    const headers = {
      apikey: globalApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const url = `${cleanUrl}/instance/create`;
    const payload = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    };

    console.log("Creating instance:", url, instanceName);
    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    const text = await resp.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* */ }

    if (!resp.ok) {
      // 403/409: instance may already exist → return informative success so UI can proceed to QR
      const msg = String(data?.response?.message || data?.message || text).toLowerCase();
      if (resp.status === 403 || resp.status === 409 || msg.includes("already") || msg.includes("exists")) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyExists: true,
            message: "Instância já existia. Use o token original para conectar.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: data?.response?.message?.[0] || data?.message || `Falha ao criar (HTTP ${resp.status})`,
          raw: data,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const instanceApiKey =
      data?.hash?.apikey ||
      data?.hash ||
      data?.apikey ||
      data?.instance?.apikey ||
      null;

    const base64 = extractBase64(data);
    const code = data?.qrcode?.code || data?.code || null;

    return new Response(
      JSON.stringify({
        success: true,
        instanceApiKey,
        base64,
        code,
        raw: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("create-instance error", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro ao criar instância", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
