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

  function requireSupabaseClient() {
    const client = window.PublicUtility && window.PublicUtility.supabase;
    if (!client) {
      throw new Error(
        "Supabase client missing. Initialize window.PublicUtility.supabase before calling data helpers."
      );
    }
    return client;
  }

  // 10A: Get existing wheel list or create one.
  window.PublicUtility.getOrCreateWheelList = async function getOrCreateWheelList(
    userId,
    title
  ) {
    if (!userId) {
      throw new Error("getOrCreateWheelList requires a userId.");
    }

    const listTitle = (title || "Main Wheel").trim();
    const supabase = requireSupabaseClient();

    const { data: existing, error: selectError } = await supabase
      .from("wheel_lists")
      .select("id, user_id, title, visibility")
      .eq("user_id", userId)
      .eq("title", listTitle)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }
    if (existing) {
      return existing;
    }

    const { data: created, error: insertError } = await supabase
      .from("wheel_lists")
      .insert({
        user_id: userId,
        title: listTitle,
        visibility: "private"
      })
      .select("id, user_id, title, visibility")
      .single();

    if (insertError) {
      throw insertError;
    }
    return created;
  };
})();