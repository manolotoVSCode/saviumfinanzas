import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Write a ping to keepalive_pings table
    const { error: insertError } = await supabaseClient
      .from("keepalive_pings")
      .insert({ pinged_at: new Date().toISOString() });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // Clean up old pings (older than 6 days)
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabaseClient
      .from("keepalive_pings")
      .delete()
      .lt("pinged_at", sixDaysAgo);

    if (deleteError) {
      console.error("Delete error:", deleteError);
    }

    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Keepalive error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});