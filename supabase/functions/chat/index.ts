// ...existing code...
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message: string = body?.message;
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing 'message' in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server not configured. Missing environment variables." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch a limited amount of data to keep context small
    const [teamsRes, playersRes, matchesRes] = await Promise.all([
      supabase.from("teams").select("id,name,points,wins,draws,losses,total_goals,fair_play_points").order("points", { ascending: false }).limit(20),
      supabase.from("players").select("id,name,team_id,goals,saves,fouls,teams(name)").order("goals", { ascending: false }).limit(50),
      supabase.from("matches").select("id,team_a_id,team_b_id,team_a_goals,team_b_goals,played_at,created_at").order("played_at", { ascending: false }).limit(10),
    ]);

    const teams = teamsRes.data || [];
    const players = playersRes.data || [];
    const matches = matchesRes.data || [];

    const context = `
TEAMS:
${teams.map(t => `- ${t.name}: ${t.points ?? 0} pts (${t.wins ?? 0}W-${t.draws ?? 0}D-${t.losses ?? 0}L), Goals: ${t.total_goals ?? 0}, Fair Play: ${t.fair_play_points ?? 50}`).join('\n')}

TOP PLAYERS:
${players.map(p => `- ${p.name} (${p.teams?.name ?? '—'}): goals ${p.goals ?? 0}, saves ${p.saves ?? 0}`).join('\n')}

RECENT MATCHES:
${matches.map(m => `- ${m.team_a_id} ${m.team_a_goals ?? 0}-${m.team_b_goals ?? 0} ${m.team_b_id} (${m.played_at ?? m.created_at ?? 'unknown'})`).join('\n')}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: context },
          { role: "user", content: message }
        ],
        // keep request smaller
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      const status = response.status === 429 ? 429 : response.status === 402 ? 402 : 502;
      return new Response(JSON.stringify({ error: `AI gateway error: ${response.status}`, details: errorText }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "No response from AI";

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Chat function error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});