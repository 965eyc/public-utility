(function () {
  const PU = window.PublicUtility;
  const triggers = document.querySelectorAll(".section3-popup-trigger[data-popup-target]");
  const popups = document.querySelectorAll(".section3-popup");
  const schedulePopup = document.getElementById("section7-schedule-popup");
  const scheduleInput = document.getElementById("section7-schedule-input");
  const scheduleCards = document.getElementById("section7-schedule-cards");
  const confirmBtn = document.getElementById("section7-schedule-confirm");
  const scheduleEditTrigger = document.getElementById("section7-schedule-edit-trigger");
  const schedulePlusLineV = document.getElementById("section7-schedule-plus-v");
  const schedulePlusLineH = document.getElementById("section7-schedule-plus-h");
  const viewedUserId = new URLSearchParams(window.location.search).get("user");
  let editingCard = null;
  let activeUserId = null;
  let targetUserId = null;
  let canEdit = true;

  if (!triggers.length || !popups.length) return;

  if (viewedUserId) {
    document.body.classList.add("section7-from-avatar");
    if (scheduleEditTrigger) {
      scheduleEditTrigger.style.display = "none";
      scheduleEditTrigger.setAttribute("aria-hidden", "true");
    }
    [schedulePlusLineV, schedulePlusLineH].forEach(function (line) {
      if (!line) return;
      line.style.display = "none";
    });
  }

  const parseScheduleInput = function (raw) {
    const t = raw.trim();
    if (!t) return null;
    const idx = t.indexOf("\n");
    if (idx === -1) return { days: t, times: "" };
    return {
      days: t.slice(0, idx).trim(),
      times: t.slice(idx + 1).replace(/\n+/g, " ").trim(),
    };
  };

  const cardTextToInputValue = function (card) {
    const daysEl = card.querySelector(".section7-schedule-card__days");
    const timesEl = card.querySelector(".section7-schedule-card__times");
    const d = daysEl ? daysEl.textContent.trim() : "";
    const t = timesEl ? timesEl.textContent.trim() : "";
    if (t) return d + "\n" + t;
    return d;
  };

  const updateCardFromParts = function (card, parts) {
    let daysEl = card.querySelector(".section7-schedule-card__days");
    let timesEl = card.querySelector(".section7-schedule-card__times");
    if (!daysEl) {
      daysEl = document.createElement("div");
      daysEl.className = "section7-schedule-card__days";
      card.insertBefore(daysEl, card.firstChild);
    }
    daysEl.textContent = parts.days;
    if (parts.times) {
      if (!timesEl) {
        timesEl = document.createElement("div");
        timesEl.className = "section7-schedule-card__times";
        card.appendChild(timesEl);
      }
      timesEl.textContent = parts.times;
    } else if (timesEl) {
      timesEl.remove();
    }
  };

  const createCardFromParts = function (parts) {
    const card = document.createElement("article");
    card.className = "section7-schedule-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    updateCardFromParts(card, parts);
    return card;
  };

  function serializeScheduleCards() {
    return Array.from(scheduleCards.querySelectorAll(".section7-schedule-card")).map(function (card) {
      const daysEl = card.querySelector(".section7-schedule-card__days");
      const timesEl = card.querySelector(".section7-schedule-card__times");
      return {
        days: daysEl ? daysEl.textContent.trim() : "",
        times: timesEl ? timesEl.textContent.trim() : "",
      };
    });
  }

  function persistSection7() {
    if (!canEdit) return;
    if (!PU || typeof PU.setProgramSection !== "function") return;
    PU.setProgramSection("section7", { cards: serializeScheduleCards() }).catch(function (err) {
      console.error("[section7] persist", err);
    });
    persistSchedulesTable().catch(function (err) {
      console.error("[section7] persist schedules table", err);
    });
  }

  async function getActiveUserId() {
    if (activeUserId) return activeUserId;
    if (!PU || !PU.supabase) return null;
    const {
      data: { session },
    } = await PU.supabase.auth.getSession();
    if (!session || !session.user) return null;
    activeUserId = session.user.id;
    return activeUserId;
  }

  async function persistSchedulesTable() {
    if (!canEdit) return;
    if (!PU || !PU.supabase) return;
    const userId = await getActiveUserId();
    if (!userId) return;
    const rows = serializeScheduleCards().map(function (row) {
      return {
        user_id: userId,
        days: row.days,
        times: row.times || "",
      };
    });
    const del = await PU.supabase.from("schedules").delete().eq("user_id", userId);
    if (del.error) throw del.error;
    if (rows.length === 0) return;
    const ins = await PU.supabase.from("schedules").insert(rows);
    if (ins.error) throw ins.error;
  }

  const openSchedulePopupNew = function () {
    if (!canEdit) return;
    editingCard = null;
    schedulePopup.hidden = false;
    scheduleInput.value = "";
    scheduleInput.focus();
  };

  const openSchedulePopupEdit = function (card) {
    if (!canEdit) return;
    editingCard = card;
    schedulePopup.hidden = false;
    scheduleInput.value = cardTextToInputValue(card);
    scheduleInput.focus();
    scheduleInput.select();
  };

  const openPopup = function (popupId) {
    if (!canEdit) return;
    const popup = document.getElementById(popupId);
    if (!popup) return;
    popup.hidden = false;
    if (popupId === "section7-schedule-popup" && scheduleInput) {
      openSchedulePopupNew();
    }
  };

  const applyEditabilityState = function () {
    if (scheduleEditTrigger) {
      if (canEdit) {
        scheduleEditTrigger.style.display = "";
        scheduleEditTrigger.style.pointerEvents = "";
        scheduleEditTrigger.removeAttribute("aria-hidden");
        scheduleEditTrigger.setAttribute("tabindex", "0");
        scheduleEditTrigger.setAttribute("aria-label", "Add or edit schedule line");
      } else {
        scheduleEditTrigger.style.display = "none";
        scheduleEditTrigger.style.pointerEvents = "none";
        scheduleEditTrigger.setAttribute("aria-hidden", "true");
        scheduleEditTrigger.setAttribute("tabindex", "-1");
        scheduleEditTrigger.removeAttribute("aria-label");
      }
    }
    [schedulePlusLineV, schedulePlusLineH].forEach(function (line) {
      if (!line) return;
      line.style.display = canEdit ? "" : "none";
    });
    document.body.classList.toggle("section7-from-avatar", !canEdit);
  };

  const closePopup = function (popup) {
    if (!popup) return;
    popup.hidden = true;
    if (popup === schedulePopup) {
      editingCard = null;
      if (scheduleInput) scheduleInput.value = "";
    }
  };

  triggers.forEach(function (trigger) {
    const targetId = trigger.getAttribute("data-popup-target");
    if (!targetId) return;

    trigger.addEventListener("click", function () {
      openPopup(targetId);
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPopup(targetId);
      }
    });
  });

  popups.forEach(function (popup) {
    const closeTargets = popup.querySelectorAll("[data-popup-close]");
    closeTargets.forEach(function (target) {
      target.addEventListener("click", function () {
        closePopup(popup);
      });
    });
  });

  if (confirmBtn && schedulePopup && scheduleInput && scheduleCards) {
    confirmBtn.addEventListener("click", function () {
      if (!canEdit) return;
      const parts = parseScheduleInput(scheduleInput.value);
      const target = editingCard;
      if (target) {
        if (!parts) {
          target.remove();
        } else {
          updateCardFromParts(target, parts);
        }
      } else if (parts) {
        scheduleCards.appendChild(createCardFromParts(parts));
      }
      closePopup(schedulePopup);
      persistSection7();
    });
  }

  if (scheduleCards && schedulePopup) {
    scheduleCards.addEventListener("click", function (event) {
      if (!canEdit) return;
      const card = event.target.closest(".section7-schedule-card");
      if (!card || !scheduleCards.contains(card)) return;
      openSchedulePopupEdit(card);
    });

    scheduleCards.addEventListener("keydown", function (event) {
      if (!canEdit) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest(".section7-schedule-card");
      if (!card || !scheduleCards.contains(card)) return;
      if (event.key === " ") event.preventDefault();
      openSchedulePopupEdit(card);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    popups.forEach(function (popup) {
      if (!popup.hidden) {
        closePopup(popup);
      }
    });
  });

  function hydrateSection7() {
    if (!PU || !PU.supabase) return;
    getActiveUserId()
      .then(function (currentUserId) {
        if (!currentUserId) return [];
        targetUserId = viewedUserId || currentUserId;
        canEdit = !viewedUserId || viewedUserId === currentUserId;
        applyEditabilityState();
        return PU.supabase
          .from("schedules")
          .select("days, times, created_at")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: true });
      })
      .then(function (res) {
        if (!res || res.error) {
          if (res && res.error) console.error("[section7] load schedules table", res.error);
          return;
        }
        scheduleCards.innerHTML = "";
        (res.data || []).forEach(function (parts) {
          if (parts && (parts.days || parts.times)) {
            scheduleCards.appendChild(
              createCardFromParts({
                days: parts.days || "",
                times: parts.times || "",
              })
            );
          }
        });
        if (res.data && res.data.length) return;
        if (!canEdit) return;
        if (!PU || typeof PU.ensureProgramPayload !== "function") return;
        return PU.ensureProgramPayload().then(function () {
          const s7 = PU.programPayload.section7;
          if (s7 && Array.isArray(s7.cards)) {
            s7.cards.forEach(function (parts) {
              if (parts && (parts.days || parts.times)) {
                scheduleCards.appendChild(createCardFromParts(parts));
              }
            });
          }
        });
      })
      .catch(function (err) {
        console.error("[section7] hydrate", err);
      });
  }

  hydrateSection7();
})();
