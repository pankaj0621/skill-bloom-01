import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find incomplete profiles older than 24 hours (no username AND no role/stream)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteProfiles, error: fetchError } = await supabase
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

    // Delete auth users (cascade will delete profiles)
    let deleted = 0;
    for (const userId of userIds) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
