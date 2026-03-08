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
    const { stream, careerGoal, existingSkills } = await req.json();
    
    if (!stream || !careerGoal) {
      return new Response(JSON.stringify({ error: "Stream and career goal are required" }), {
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

    const systemPrompt = `You are an expert career counselor and skill development advisor for Indian students and professionals. You provide practical, actionable career guidance.

When given a student's stream, career goal, and existing skills, provide:

1. **🎯 Career Path Overview** - A brief 2-3 sentence summary of the career path and its prospects in India and globally.

2. **🗺️ Step-by-Step Roadmap** - A numbered roadmap with clear phases (e.g., Phase 1: Foundation, Phase 2: Core Skills, etc.). Each phase should have:
   - Timeline (e.g., "Month 1-3")
   - Key actions to take
   - What to learn/build

3. **📚 Recommended Next Skills** - A prioritized list of 5-7 specific skills they should learn next, considering what they already know. For each skill, briefly explain WHY it matters for their goal.

4. **💡 Pro Tips** - 3-4 practical tips specific to their situation (certifications worth getting, projects to build, communities to join, etc.)

5. **⚡ Quick Wins** - 2-3 things they can start doing TODAY to move toward their goal.

Keep the language simple, encouraging, and practical. Use emojis sparingly for visual clarity. Be specific with tool/technology names rather than generic advice.`;

    const userMessage = `**Student Profile:**
- **Stream/Branch:** ${stream}
- **Career Goal:** ${careerGoal}
- **Existing Skills:** ${existingSkills || "None specified"}

Please provide a complete career path advisory based on this profile.`;

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
    console.error("career-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
