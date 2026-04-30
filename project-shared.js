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
