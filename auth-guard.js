(() => {
  async function guard() {
    const PU = window.PublicUtility;
    if (!PU || !PU.supabase) return;
    const {
      data: { session },
    } = await PU.supabase.auth.getSession();
    if (!session) {
      window.location.replace("index.html");
      return;
    }
    await PU.ensureProgramPayload();
  }
  guard();
})();
