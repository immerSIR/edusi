import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BACKEND_URL = Deno.env.get("BACKEND_URL") || "http://localhost:8000";
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";

Deno.serve(async (req: Request) => {
  // GET: Webhook verification challenge
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST: Incoming message
  if (req.method === "POST") {
    const data = await req.json();

    try {
      const entry = data.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages || [];

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      for (const msg of messages) {
        const fromNumber = msg.from;

        // Check allowlist
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("whatsapp_number", `+${fromNumber}`)
          .eq("whatsapp_verified", true)
          .single();

        if (!profile) {
          await sendMessage(
            fromNumber,
            "This number is not registered. Sign up at edusi.app first.\nNomba yi ko ti forukosile. Forukosile ni edusi.app."
          );
          continue;
        }

        // Forward to backend for processing
        const response = await fetch(
          `${BACKEND_URL}/api/whatsapp/process-message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from_number: fromNumber,
              message_type: msg.type,
              text: msg.text?.body || null,
              audio_url: msg.audio?.id || null,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.reply) {
            await sendMessage(fromNumber, result.reply);
          }
        }
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
});

async function sendMessage(to: string, text: string) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log(`[WhatsApp DEV] To: ${to} | ${text}`);
    return;
  }

  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  await fetch(
    `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
}
