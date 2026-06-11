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
  if (typeof data === "string" && data.startsWith("data:image")) return data;
  const candidates = [
    data?.base64,
    data?.qrcode?.base64,
    data?.qrcode,
    data?.qr,
    data?.qr_code,
    data?.image,
    data?.instance?.qrcode?.base64,
    data?.instance?.qrcode,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 50) {
      return c.startsWith("data:image") ? c : `data:image/png;base64,${c.replace(/^data:image\/[a-z]+;base64,/, "")}`;
    }
  }
  return null;
}

function extractCode(data: any): string | null {
  if (!data) return null;
  return data?.code || data?.qrcode?.code || data?.pairingCode || null;
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
        JSON.stringify({ success: false, error: "Preencha a URL e o token do Evolution GO." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanUrl = normalizeEvolutionUrl(evolutionApiUrl);
    const headers = { apikey: evolutionApiKey, Accept: "application/json" };

    const endpoints = [
      instanceName ? `${cleanUrl}/instance/connect/${encodeURIComponent(instanceName)}` : null,
      `${cleanUrl}/instance/connect`,
      `${cleanUrl}/instance/qrcode`,
      instanceName ? `${cleanUrl}/instance/qrcode/${encodeURIComponent(instanceName)}` : null,
    ].filter(Boolean) as string[];

    let lastError = "";
    for (const url of endpoints) {
      try {
        console.log("Trying QR endpoint:", url);
        const resp = await fetch(url, { method: "GET", headers });
        const ct = resp.headers.get("content-type") || "";
        const text = await resp.text();
        if (ct.includes("text/html") || text.trim().startsWith("<")) {
          lastError = "URL inválida (HTML retornado).";
          continue;
        }
        let data: any = {};
        try { data = JSON.parse(text); } catch { /* */ }

        if (!resp.ok) {
          lastError = data?.error || data?.message || `HTTP ${resp.status}`;
          continue;
        }

        const base64 = extractBase64(data);
        const code = extractCode(data);

        if (base64 || code) {
          return new Response(
            JSON.stringify({ success: true, base64, code, raw: data }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Maybe already connected
        const state = String(data?.state || data?.status || data?.instance?.state || "").toLowerCase();
        if (state === "open" || state === "connected") {
          return new Response(
            JSON.stringify({ success: true, alreadyConnected: true, state }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        lastError = "Resposta sem QR Code.";
      } catch (e) {
        lastError = String(e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: lastError || "Não foi possível obter o QR Code." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error fetching QR:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro ao obter QR Code", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
