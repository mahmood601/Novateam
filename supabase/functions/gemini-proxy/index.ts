const GEMINI_MODEL = "gemini-2.0-flash-lite";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? "*"
      : ALLOWED_ORIGINS.includes(origin ?? "")
        ? (origin ?? "")
        : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, Apikey",
    Vary: "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!GEMINI_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: missing API key" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { systemContext, history, userText } = body as {
      systemContext: string;
      history: { role: string; parts: { text: string }[] }[];
      userText: string;
    };

    if (!userText || typeof userText !== "string") {
      return new Response(JSON.stringify({ error: "userText is required" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemContext ?? "" }] },
          contents: [...(history ?? []), { role: "user", parts: [{ text: userText }] }],
        }),
      },
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Gemini API Error:", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message ?? "Gemini error" }),
        {
          status: geminiRes.status,
          headers: { ...headers, "Content-Type": "application/json" },
        },
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "عذراً، لم أتمكن من معالجة الإجابة، حاول مجدداً.";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gemini-proxy error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
