(() => {
  const APP_KEY = "public-utility";
  const CONFIRMED_EVENT_DAY_KEY = `${APP_KEY}:confirmed-event-day`;

  if (!window.PublicUtility) {
    window.PublicUtility = {};
  }

  window.PublicUtility.version = "1.0.0";
  window.PublicUtility.loadedAt = new Date().toISOString();

  window.PublicUtility.getStorageKey = function getStorageKey(suffix) {
    return `${APP_KEY}:${suffix}`;
  };

  window.PublicUtility.getConfirmedEventDay = function getConfirmedEventDay() {
    try {
      const raw = window.localStorage.getItem(CONFIRMED_EVENT_DAY_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  };

  window.PublicUtility.setConfirmedEventDay = function setConfirmedEventDay(day) {
    const parsed = Number(day);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) return false;
    try {
      window.localStorage.setItem(CONFIRMED_EVENT_DAY_KEY, String(parsed));
      return true;
    } catch (err) {
      return false;
    }
  };
})();
