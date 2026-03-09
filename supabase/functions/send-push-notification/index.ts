import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push uses VAPID for authentication. We implement the protocol manually using Web Crypto.
// This avoids needing a `web-push` npm library in Deno.

async function generateVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const enc = new TextEncoder();

  function base64UrlEncode(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function base64UrlEncodeStr(str: string): string {
    return base64UrlEncode(enc.encode(str));
  }

  // Import private key
  const rawPrivateKey = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/") + "=="),
    (c) => c.charCodeAt(0)
  );
  const rawPublicKey = Uint8Array.from(
    atob(vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/") + "=="),
    (c) => c.charCodeAt(0)
  );

  // Build JWK for import
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(rawPublicKey.slice(1, 33)),
    y: base64UrlEncode(rawPublicKey.slice(33, 65)),
    d: base64UrlEncode(rawPrivateKey),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const unsignedToken = `${base64UrlEncodeStr(JSON.stringify(header))}.${base64UrlEncodeStr(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigArray.length === 64) {
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  } else {
    // DER encoded
    let offset = 2;
    const rLen = sigArray[offset + 1];
    offset += 2;
    r = sigArray.slice(offset, offset + rLen);
    offset += rLen;
    const sLen = sigArray[offset + 1];
    offset += 2;
    s = sigArray.slice(offset, offset + sLen);

    // Pad/trim to 32 bytes
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) { const t = new Uint8Array(32); t.set(r, 32 - r.length); r = t; }
    if (s.length < 32) { const t = new Uint8Array(32); t.set(s, 32 - s.length); s = t; }
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const token = `${unsignedToken}.${base64UrlEncode(rawSig)}`;

  return {
    authorization: `vapid t=${token}, k=${vapidPublicKey}`,
  };
}

async function sendPushToEndpoint(
  endpoint: string,
  keys: { p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status: number; gone: boolean }> {
  try {
    // For the encryption, we use the simplified approach via the Web Push protocol
    // The payload needs to be encrypted using the client's public key
    // For simplicity and reliability, we'll send a simple push with the payload

    const { authorization } = await generateVapidAuthHeader(
      endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      "mailto:notify@scorz.live"
    );

    // Encrypt the payload using Web Push encryption (aes128gcm)
    const payloadBytes = new TextEncoder().encode(payload);

    // Import client public key
    const clientPublicKeyBytes = Uint8Array.from(
      atob(keys.p256dh.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const clientAuthBytes = Uint8Array.from(
      atob(keys.auth.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    // Generate a local ECDH key pair for encryption
    const localKeyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );

    const clientKey = await crypto.subtle.importKey(
      "raw",
      clientPublicKeyBytes,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );

    const sharedSecret = await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    );

    const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
    const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

    // HKDF-based key derivation for aes128gcm
    const enc = new TextEncoder();

    // auth_info = "WebPush: info\0" || client_public || local_public
    const authInfo = new Uint8Array([
      ...enc.encode("WebPush: info\0"),
      ...clientPublicKeyBytes,
      ...localPublicKeyBytes,
    ]);

    // IKM = HKDF(auth_secret, shared_secret, auth_info, 32)
    const authHkdfKey = await crypto.subtle.importKey("raw", clientAuthBytes, { name: "HKDF" }, false, ["deriveBits"]);
    // Actually we need to use shared_secret as the IKM for HKDF with auth as salt
    const prk = await crypto.subtle.importKey("raw", new Uint8Array(sharedSecret), { name: "HKDF" }, false, ["deriveBits"]);
    
    const ikm = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: clientAuthBytes, info: authInfo },
        prk,
        256
      )
    );

    // CEK = HKDF(salt, IKM, "Content-Encoding: aes128gcm\0", 16)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const ikmKey = await crypto.subtle.importKey("raw", ikm, { name: "HKDF" }, false, ["deriveBits"]);

    const cekBits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: enc.encode("Content-Encoding: aes128gcm\0") },
      ikmKey,
      128
    );

    const nonceBits = await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info: enc.encode("Content-Encoding: nonce\0") },
      ikmKey,
      96
    );

    // Encrypt with AES-128-GCM
    const aesKey = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);

    // Add padding delimiter (RFC 8188)
    const paddedPayload = new Uint8Array(payloadBytes.length + 1);
    paddedPayload.set(payloadBytes);
    paddedPayload[payloadBytes.length] = 2; // record delimiter

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBits, tagLength: 128 },
      aesKey,
      paddedPayload
    );

    // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65)
    const rs = 4096;
    const header = new Uint8Array(16 + 4 + 1 + localPublicKeyBytes.length);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(16, rs);
    header[20] = localPublicKeyBytes.length;
    header.set(localPublicKeyBytes, 21);

    const body = new Uint8Array(header.length + new Uint8Array(encrypted).length);
    body.set(header);
    body.set(new Uint8Array(encrypted), header.length);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
      },
      body,
    });

    return { success: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 410 };
  } catch (err) {
    console.error("Push send error:", err);
    return { success: false, status: 0, gone: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Action: return VAPID public key (for client subscription)
    if (body.action === "get-vapid-key") {
      const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
      if (!vapidPublicKey) throw new Error("VAPID_PUBLIC_KEY not configured");
      return new Response(JSON.stringify({ vapidPublicKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: send push notifications
    const { user_ids, title, body: msgBody, link } = body;
    if (!user_ids?.length || !title) throw new Error("user_ids and title required");

    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error("VAPID keys not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", user_ids);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: msgBody || "", link: link || "/" });
    let sent = 0;
    const goneEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushToEndpoint(
        sub.endpoint,
        sub.keys as { p256dh: string; auth: string },
        payload,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );
      if (result.success) sent++;
      if (result.gone) goneEndpoints.push(sub.endpoint);
    }

    // Clean up expired subscriptions
    if (goneEndpoints.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", goneEndpoints);
    }

    console.log(`send-push-notification: sent ${sent}/${subscriptions.length} pushes`);

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push-notification error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
