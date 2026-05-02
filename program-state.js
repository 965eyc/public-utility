(() => {
  window.PublicUtility = window.PublicUtility || {};
  const PU = window.PublicUtility;

  PU.programPayload = PU.programPayload || null;
  PU._programPayloadLoaded = false;

  PU.invalidateProgramPayloadCache = function invalidateProgramPayloadCache() {
    PU.programPayload = null;
    PU._programPayloadLoaded = false;
  };

  PU.ensureProgramPayload = async function ensureProgramPayload() {
    if (PU._programPayloadLoaded && PU.programPayload) {
      return PU.programPayload;
    }
    const supa = PU.supabase;
    if (!supa) {
      PU.programPayload = {};
      PU._programPayloadLoaded = true;
      return PU.programPayload;
    }
    const {
      data: { session },
    } = await supa.auth.getSession();
    if (!session) {
      PU.programPayload = {};
      PU._programPayloadLoaded = true;
      return PU.programPayload;
    }
    const { data, error } = await supa
      .from("program_state")
      .select("payload")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.error("[public-utility] load program_state", error);
      PU.programPayload = {};
    } else if (data && data.payload && typeof data.payload === "object") {
      PU.programPayload = data.payload;
    } else {
      PU.programPayload = {};
    }
    PU._programPayloadLoaded = true;
    return PU.programPayload;
  };

  PU.saveProgramPayload = async function saveProgramPayload() {
    const supa = PU.supabase;
    if (!supa) return;
    const {
      data: { session },
    } = await supa.auth.getSession();
    if (!session) return;
    const payload = PU.programPayload || {};
    const { error } = await supa.from("program_state").upsert(
      {
        user_id: session.user.id,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) console.error("[public-utility] save program_state", error);
  };

  /**
   * Replace one section key in payload and persist to Supabase.
   */
  PU.setProgramSection = async function setProgramSection(sectionKey, sectionValue) {
    await PU.ensureProgramPayload();
    PU.programPayload[sectionKey] = sectionValue;
    await PU.saveProgramPayload();
  };

  if (PU.supabase) {
    PU.supabase.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_OUT") {
        PU.invalidateProgramPayloadCache();
      }
    });
  }
})();
