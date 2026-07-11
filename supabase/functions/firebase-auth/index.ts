import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')!;

function base64UrlToBase64(str: string) {
  return str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
}

function base64UrlDecode(str: string) {
  const base64 = base64UrlToBase64(str);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

let publicKeysCache: Record<string, string> | null = null;
let publicKeysExpiry = 0;

async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  if (publicKeysCache && publicKeysExpiry > Date.now()) {
    return publicKeysCache;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${res.status} ${await res.text()}`);
  }
  const keys = await res.json();
  publicKeysCache = keys;
  publicKeysExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  return keys;
}

async function importPublicKey(pemCert: string): Promise<CryptoKey> {
  const pem = pemCert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'spki',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; phone?: string }> {
  const [headerB64, payloadB64, signatureB64] = idToken.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid token format');
  }
  const header = JSON.parse(base64UrlDecode(headerB64));
  const kid = header.kid;
  if (!kid) throw new Error('Missing key ID');

  const keys = await getFirebasePublicKeys();
  const cert = keys[kid];
  if (!cert) throw new Error('Unknown key ID');

  const cryptoKey = await importPublicKey(cert);

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = Uint8Array.from(atob(base64UrlToBase64(signatureB64)), (c) => c.charCodeAt(0));

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, data);
  if (!valid) throw new Error('Invalid token signature');

  const payload = JSON.parse(base64UrlDecode(payloadB64));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now) throw new Error('Token expired');
  if (payload.iat > now) throw new Error('Token issued in future');
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Invalid token issuer');
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Invalid token audience');
  if (!payload.sub) throw new Error('Missing subject');
  if (payload.auth_time > now) throw new Error('Invalid auth time');

  return { uid: payload.sub, phone: payload.phone_number };
}

function generatePassword(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { idToken } = await req.json().catch(() => ({}));
    if (!idToken || typeof idToken !== 'string') {
      return jsonResponse({ error: 'Missing idToken' }, 400);
    }
    if (!FIREBASE_PROJECT_ID) {
      return jsonResponse({ error: 'Firebase project not configured' }, 500);
    }

    const { uid, phone } = await verifyFirebaseIdToken(idToken);
    if (!phone) {
      return jsonResponse({ error: 'Phone number not available in Firebase token' }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('firebase_auth_users')
      .select('user_id')
      .eq('firebase_uid', uid)
      .maybeSingle();

    if (mappingError) throw mappingError;

    const tempPassword = generatePassword();
    let userId: string;

    if (mapping?.user_id) {
      userId = mapping.user_id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        phone,
        phone_confirm: true,
        user_metadata: { firebase_uid: uid, phone },
      });
      if (updateError) throw updateError;
    } else {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;

      const existingUser = users.users.find((u) => u.phone === phone);

      if (existingUser) {
        userId = existingUser.id;
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: tempPassword,
          user_metadata: { firebase_uid: uid, phone },
        });
        if (updateError) throw updateError;
      } else {
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone,
          phone_confirm: true,
          password: tempPassword,
          user_metadata: { firebase_uid: uid, phone },
        });
        if (createError) throw createError;
        userId = createData.user!.id;
      }

      const { error: insertError } = await supabaseAdmin.from('firebase_auth_users').insert({
        firebase_uid: uid,
        user_id: userId,
        phone_number: phone,
      });
      if (insertError) throw insertError;
    }

    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ phone, password: tempPassword }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const tokens = await tokenRes.json();

    return jsonResponse({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      user: tokens.user,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('firebase-auth error:', err);
    return jsonResponse({ error: message }, 400);
  }
});
