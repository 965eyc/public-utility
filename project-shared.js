(() => {
  const APP_KEY = "public-utility";

  if (!window.PublicUtility) {
    window.PublicUtility = {};
  }

  window.PublicUtility.version = "1.0.0";
  window.PublicUtility.loadedAt = new Date().toISOString();

  window.PublicUtility.getStorageKey = function getStorageKey(suffix) {
    return `${APP_KEY}:${suffix}`;
  };
})();

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="project-shared.js"></script>
<script src="supabase-config.js"></script>
(() => {
  const SUPABASE_URL = "https://xurjtmorywhxbultpdhb.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_1BUWnYNH4YGu_Bd0ptNmtg__9FHSzJx";

  window.PublicUtility = window.PublicUtility || {};
  window.PublicUtility.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
})();