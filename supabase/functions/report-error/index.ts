const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TG_CHAT = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";

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

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  if (!TG_TOKEN || !TG_CHAT) {
    console.warn("Telegram credentials not configured");
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { message, stack, info, url, userAgent, timestamp } = body as {
      message: string;
      stack?: string;
      info?: string;
      url: string;
      userAgent: string;
      timestamp: string;
    };

    const text = [
      "🔴 *خطأ جديد في Nova App*",
      "",
      `📍 *URL:* \`${url ?? "غير معروف"}\``,
      `🕐 *الوقت:* ${timestamp ?? new Date().toISOString()}`,
      "",
      `❌ *الخطأ:* \`${(message ?? "").slice(0, 300)}\``,
      info ? `\nℹ️ *معلومات إضافية:* ${escapeMarkdown(info.slice(0, 200))}` : "",
      "",
      `📋 *Stack:*\n\`\`\`\n${(stack ?? "").slice(0, 800)}\n\`\`\``,
      "",
      `🌐 *المتصفح:* ${(userAgent ?? "").slice(0, 150)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text,
          parse_mode: "Markdown",
        }),
      },
    );

    if (!tgRes.ok) {
      const err = await tgRes.json();
      console.error("Telegram API error:", err);
    }

    return new Response(JSON.stringify({ ok: tgRes.ok }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("report-error handler:", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
