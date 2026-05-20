import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BACKEND_URL = Deno.env.get("BACKEND_URL") || "http://localhost:8000";
const BACKEND_INTERNAL_SECRET = Deno.env.get("BACKEND_INTERNAL_SECRET") || "";
const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";
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
    if (!BACKEND_INTERNAL_SECRET) {
      console.error("BACKEND_INTERNAL_SECRET is not configured");
      return new Response("Service unavailable", { status: 503 });
    }

    const bodyText = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    if (!(await verifyMetaSignature(signature, bodyText))) {
      return new Response("Forbidden", { status: 403 });
    }

    let data: Record<string, any>;
    try {
      data = JSON.parse(bodyText);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

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
          // Only message the edge function sends directly
          await sendRejectMessage(fromNumber);
          continue;
        }

        // Build expanded payload for backend
        const forwardPayload: Record<string, string | null> = {
          from_number: fromNumber,
          profile_id: profile.id,
          message_type: msg.type,
          text: null,
          audio_media_id: null,
          interactive_type: null,
          interactive_reply_id: null,
          interactive_reply_title: null,
        };

        if (msg.type === "text") {
          forwardPayload.text = msg.text?.body || null;
        } else if (msg.type === "audio") {
          forwardPayload.audio_media_id = msg.audio?.id || null;
        } else if (msg.type === "interactive") {
          const interactive = msg.interactive;
          forwardPayload.interactive_type = interactive?.type || null;
          if (interactive?.type === "button_reply") {
            forwardPayload.interactive_reply_id = interactive.button_reply?.id || null;
            forwardPayload.interactive_reply_title = interactive.button_reply?.title || null;
          } else if (interactive?.type === "list_reply") {
            forwardPayload.interactive_reply_id = interactive.list_reply?.id || null;
            forwardPayload.interactive_reply_title = interactive.list_reply?.title || null;
          }
        }

        // Fire-and-forget: backend processes async and sends replies directly
        fetch(`${BACKEND_URL}/api/whatsapp/process-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Backend-Secret": BACKEND_INTERNAL_SECRET,
          },
          body: JSON.stringify(forwardPayload),
        }).catch((err) => console.error("Backend forward error:", err));
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

async function verifyMetaSignature(
  signatureHeader: string | null,
  bodyText: string
): Promise<boolean> {
  if (!WHATSAPP_APP_SECRET) {
    console.error("WHATSAPP_APP_SECRET is not configured");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WHATSAPP_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
  const expected = `sha256=${toHex(digest)}`;

  return timingSafeEqual(signatureHeader.toLowerCase(), expected);
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < leftBytes.length; index++) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function sendRejectMessage(to: string) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log(`[WhatsApp DEV] Reject: ${to}`);
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
        to,
        type: "text",
        text: {
          body: "This number is not registered. Sign up at edusi.app first.\nNomba yi ko ti forukosile. Forukosile ni edusi.app.",
        },
      }),
    }
  );
}
