import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function deletes incomplete profiles. Restricted to:
//   1. Service-role callers (cron / internal scheduled jobs), OR
//   2. Authenticated admins (role = 'admin' in public.user_roles).
// Anonymous or regular signed-in users are rejected.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Allow direct service-role invocation (e.g. pg_cron / scheduled job).
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      // Otherwise require a valid JWT belonging to an admin user.
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find incomplete profiles older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteProfiles, error: fetchError } = await admin
      .from("profiles")
      .select("id")
      .is("username", null)
      .is("role", null)
      .is("stream", null)
      .lt("created_at", cutoff);

    if (fetchError) throw fetchError;

    if (!incompleteProfiles || incompleteProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No incomplete profiles to clean up" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = incompleteProfiles.map((p) => p.id);

    let deleted = 0;
    for (const userId of userIds) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (!error) deleted++;
      else console.error(`Failed to delete user ${userId}:`, error.message);
    }

    return new Response(
      JSON.stringify({
        message: `Cleaned up ${deleted} incomplete profiles`,
        found: userIds.length,
        deleted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
