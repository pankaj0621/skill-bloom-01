import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stream, careerPath, existingSkills } = await req.json();

    if (!careerPath) {
      return new Response(JSON.stringify({ error: "Career path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert skill gap analyst for students and professionals, especially in the Indian context. You compare a user's current skills against real industry requirements for their target career.

Given the user's stream, target career path, and existing skills, provide a detailed analysis:

1. **🔍 Industry Requirements** - List the top 10-15 skills that the industry demands for this career path right now (2026). Group them into:
   - **Must-Have Skills** (essential, non-negotiable)
   - **Good-to-Have Skills** (competitive advantage)
   - **Emerging Skills** (future-proofing)

2. **❌ Missing Skills** - Compare user's existing skills against industry requirements. For EACH missing skill:
   - Skill name
   - Why it's critical for this role
   - Estimated learning time
   - Best free/affordable resource to learn it

3. **⚠️ Skills Needing Improvement** - Skills the user has but likely needs to deepen. For each:
   - Current likely level (basic/intermediate)
   - Target level needed
   - How to level up

4. **🎯 Priority Order** - Rank ALL missing/improvement skills by priority:
   - 🔴 **Critical** (learn first, blocks other progress)
   - 🟡 **Important** (learn within 3 months)
   - 🟢 **Nice to Have** (learn within 6 months)

5. **📋 30-Day Action Plan** - A concrete week-by-week plan for the first month focusing on the highest priority gaps.

Be specific with technology names, versions, and tools. Give honest assessment - don't sugarcoat gaps. Use clear formatting.`;

    const userMessage = `**Profile:**
- **Stream/Background:** ${stream || "Not specified"}
- **Target Career Path:** ${careerPath}
- **Current Skills:** ${existingSkills || "None specified"}

Analyze the skill gap and provide a prioritized improvement plan.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("skill-gap-analyzer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
