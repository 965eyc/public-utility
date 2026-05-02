(() => {
  const url = window.PUBLIC_UTILITY_SUPABASE_URL;
  const key = window.PUBLIC_UTILITY_SUPABASE_ANON_KEY;

  if (!url || !key || key === "YOUR_SUPABASE_ANON_KEY") {
    console.warn(
      "[public-utility] Set PUBLIC_UTILITY_SUPABASE_URL and PUBLIC_UTILITY_SUPABASE_ANON_KEY in supabase-config.js"
    );
  }

  window.PublicUtility = window.PublicUtility || {};

  if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
    console.error("[public-utility] Load @supabase/supabase-js before supabase-client.js");
    return;
  }

  window.PublicUtility.supabase = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
})();
