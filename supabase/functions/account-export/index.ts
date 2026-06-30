// Account export — returns a JSON dump of the authenticated user's data.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [profile, settings, progress, customSkills, badges, notifications, feedback, sent, received, guidance] = await Promise.all([
      admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      admin.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("user_skill_progress").select("*, skills(name)").eq("user_id", userId),
      admin.from("user_custom_skills").select("*").eq("user_id", userId),
      admin.from("user_badges").select("*").eq("user_id", userId),
      admin.from("notifications").select("*").eq("user_id", userId),
      admin.from("feedback").select("*").eq("user_id", userId),
      admin.from("peer_messages").select("*").eq("from_user_id", userId),
      admin.from("peer_messages").select("*").eq("to_user_id", userId),
      admin.from("peer_guidance_requests").select("*").eq("user_id", userId),
    ]);

    const dump = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data,
      settings: settings.data,
      progress: progress.data,
      custom_skills: customSkills.data,
      badges: badges.data,
      notifications: notifications.data,
      feedback: feedback.data,
      messages_sent: sent.data,
      messages_received: received.data,
      guidance_requests: guidance.data,
    };

    await admin.from("audit_logs").insert({
      event: "account_export",
      actor_user_id: userId,
      target_user_id: userId,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return new Response(JSON.stringify(dump, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="levelup-export-${userId}.json"`,
      },
    });
  } catch (err) {
    console.error("export error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
