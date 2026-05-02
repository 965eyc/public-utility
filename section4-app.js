(function () {
  const PU = window.PublicUtility;
  const entryInputEl = document.getElementById("entryInput");
  const confirmEntryBtn = document.getElementById("confirmEntryBtn");
  const entryListEl = document.getElementById("entryList");
  const entryCount = document.getElementById("entryCount");
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const spinTriggerBtn = document.getElementById("spinTriggerBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");
  const overlayFilterDropdown = document.getElementById("overlayFilterDropdown");
  const openEntryPopupBtn = document.getElementById("openEntryPopupBtn");
  const closeEntryPopupBtn = document.getElementById("closeEntryPopupBtn");
  const entryPopup = document.getElementById("entryPopup");
  const tagButtons = Array.from(entryPopup.querySelectorAll("[data-entry-tag]"));

  const modal = document.getElementById("winnerModal");
  const winnerText = document.getElementById("winnerText");
  const closeModalBtn = document.getElementById("closeModalBtn");

  const tagPalette = {
    line: { bg: "#FFD0C2", text: "#1f285b" },
    circle: { bg: "#B1C7FF", text: "#1f285b" },
    diamond: { bg: "#FFE78F", text: "#1f285b" },
    triangle: { bg: "#FFD741", text: "#1f285b" },
    square: { bg: "#4379FF", text: "#ffffff" },
    star: { bg: "#FF3C00", text: "#ffffff" },
    default: { bg: "#ecf0ff", text: "#1f285b" },
  };

  let entries = [];
  let editingIndex = null;
  let isSpinning = false;
  let currentRotation = 0;
  let activeTagFilter = null;
  let pendingEntryTag = null;
  let persistTimer = null;
  let activeUserId = null;
  let activeUser = null;

  const DEFAULT_ENTRIES = [
    { id: "a1", name: "Going to Brunch", tag: "circle" },
    { id: "a2", name: "Going on a Hike", tag: "star" },
    { id: "a3", name: "Have a Craft Night", tag: "square" },
    { id: "a4", name: "Go to a Concert", tag: "diamond" },
    { id: "a5", name: "Have a Movie Marathon", tag: "triangle" },
  ];

  function schedulePersistSection4() {
    if (!PU || typeof PU.setProgramSection !== "function") return;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      PU.setProgramSection("section4", {
        entries: entries,
        activeTagFilter: activeTagFilter,
        currentRotation: currentRotation,
      }).catch(function (err) {
        console.error("[section4] persist", err);
      });
      persistWheelEntriesTable().catch(function (err) {
        console.error("[section4] persist wheel_entries table", err);
      });
    }, 350);
  }

  async function getActiveUserId() {
    if (activeUserId) return activeUserId;
    if (!PU || !PU.supabase) return null;
    const {
      data: { session },
    } = await PU.supabase.auth.getSession();
    if (!session || !session.user) return null;
    activeUserId = session.user.id;
    activeUser = session.user;
    return activeUserId;
  }

  async function ensureProfileForActiveUser() {
    if (!PU || !PU.supabase) return null;
    const userId = await getActiveUserId();
    if (!userId) return null;
    const fallbackFromEmail = activeUser && activeUser.email ? activeUser.email.split("@")[0] : "user";
    const fullName =
      (activeUser && activeUser.user_metadata && activeUser.user_metadata.full_name) ||
      fallbackFromEmail;
    const username =
      (activeUser && activeUser.user_metadata && activeUser.user_metadata.username) ||
      fallbackFromEmail;
    const up = await PU.supabase
      .from("profiles")
      .upsert({ id: userId, full_name: fullName, username: username }, { onConflict: "id" });
    if (up.error) throw up.error;
    return userId;
  }

  function serializeEntries() {
    return entries.map(function (entry, index) {
      return {
        entry_name: entry.name || "",
        entry_tag: entry.tag || null,
        sort_order: index,
      };
    });
  }

  async function persistWheelEntriesTable() {
    if (!PU || !PU.supabase) return;
    const userId = await ensureProfileForActiveUser();
    if (!userId) return;
    const rows = serializeEntries().map(function (row) {
      return {
        user_id: userId,
        entry_name: row.entry_name,
        entry_tag: row.entry_tag,
        sort_order: row.sort_order,
      };
    });
    const del = await PU.supabase.from("wheel_entries").delete().eq("user_id", userId);
    if (del.error) throw del.error;
    if (!rows.length) return;
    const ins = await PU.supabase.from("wheel_entries").insert(rows);
    if (ins.error) throw ins.error;
  }

  function getVisibleEntries() {
    if (!activeTagFilter) return entries;
    return entries.filter(function (entry) {
      return entry.tag === activeTagFilter;
    });
  }

  function updateTagButtons() {
    tagButtons.forEach(function (btn) {
      const tag = btn.getAttribute("data-entry-tag");
      const isActive = tag === activeTagFilter;
      const palette = tagPalette[tag] || tagPalette.default;
      btn.style.backgroundColor = palette.bg;
      btn.style.color = palette.text;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function updateEntryCount() {
    entryCount.textContent = "";
  }

  function renderEntryList() {
    entryListEl.innerHTML = "";
    getVisibleEntries().forEach(function (entry) {
      const palette = tagPalette[entry.tag] || tagPalette.default;
      const card = document.createElement("div");
      card.className = "entry-list__card";
      card.setAttribute("role", "listitem");
      card.setAttribute("tabindex", "0");
      card.setAttribute("data-entry-id", String(entry.id));
      card.style.backgroundColor = palette.bg;
      card.style.borderColor = palette.bg;
      card.style.color = palette.text;
      const nameEl = document.createElement("span");
      nameEl.className = "entry-list__name";
      nameEl.textContent = entry.name;
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "entry-list__delete";
      deleteBtn.setAttribute("data-entry-delete", "true");
      deleteBtn.setAttribute("aria-label", "Delete " + entry.name);
      deleteBtn.textContent = "x";
      card.appendChild(nameEl);
      card.appendChild(deleteBtn);
      entryListEl.appendChild(card);
    });
  }

  function syncEntriesView() {
    updateTagButtons();
    updateEntryCount();
    renderEntryList();
    drawWheel();
    schedulePersistSection4();
  }

  function resetEntryEditor() {
    editingIndex = null;
    entryInputEl.value = "";
    pendingEntryTag = activeTagFilter;
  }

  function openEntryPopupNew() {
    resetEntryEditor();
    entryPopup.hidden = false;
    entryInputEl.focus();
  }

  function openEntryPopupEdit(index) {
    if (index < 0 || index >= entries.length) return;
    editingIndex = index;
    entryPopup.hidden = false;
    entryInputEl.value = entries[index].name;
    pendingEntryTag = entries[index].tag || null;
    activeTagFilter = pendingEntryTag;
    updateTagButtons();
    entryInputEl.focus();
    entryInputEl.select();
  }

  function applyEntryInput() {
    const value = entryInputEl.value.trim();
    if (editingIndex !== null) {
      if (!value) {
        entries.splice(editingIndex, 1);
      } else {
        entries[editingIndex] = {
          id: entries[editingIndex].id,
          name: value,
          tag: pendingEntryTag,
        };
      }
    } else if (value) {
      entries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        name: value,
        tag: pendingEntryTag,
      });
    }
    activeTagFilter = pendingEntryTag;
    resetEntryEditor();
    syncEntriesView();
  }

  function drawWheel() {
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12;
    const visibleEntries = getVisibleEntries();
    const n = visibleEntries.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentRotation);

    if (n === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#eef1ff";
      ctx.fill();
      ctx.strokeStyle = "#d4dbfb";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#6f7696";
      ctx.font = "600 28px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add entries to begin", 0, 0);
      ctx.restore();
      return;
    }

    const segmentAngle = (Math.PI * 2) / n;
    for (let i = 0; i < n; i += 1) {
      const start = i * segmentAngle;
      const end = start + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = (tagPalette[visibleEntries[i].tag] || tagPalette.default).bg;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 24px Inter, sans-serif";
      const label =
        visibleEntries[i].name.length > 22
          ? visibleEntries[i].name.slice(0, 22) + "..."
          : visibleEntries[i].name;
      ctx.fillText(label, radius - 20, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#cdd8ff";
    ctx.stroke();

    ctx.restore();
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function spin() {
    const visibleEntries = getVisibleEntries();
    if (visibleEntries.length < 2 || isSpinning) return;

    isSpinning = true;

    const winningIndex = Math.floor(Math.random() * visibleEntries.length);
    const n = visibleEntries.length;
    const segmentAngle = (Math.PI * 2) / n;
    const centerOfWinner = winningIndex * segmentAngle + segmentAngle / 2;

    const desiredFinal = -Math.PI / 2 - centerOfWinner;
    const minTurns = 6;
    const maxTurns = 10;
    const fullTurns = minTurns + Math.floor(Math.random() * (maxTurns - minTurns + 1));

    const baseRotation = currentRotation % (Math.PI * 2);
    let delta = desiredFinal - baseRotation;
    while (delta < 0) delta += Math.PI * 2;
    const targetRotation = currentRotation + delta + fullTurns * Math.PI * 2;

    const duration = 4200;
    const start = performance.now();
    const startRotation = currentRotation;

    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      currentRotation = startRotation + (targetRotation - startRotation) * eased;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
        return;
      }

      currentRotation = targetRotation;
      drawWheel();
      isSpinning = false;
      showWinner(visibleEntries[winningIndex].name);
      schedulePersistSection4();
    }

    requestAnimationFrame(animate);
  }

  function showWinner(name) {
    winnerText.textContent = name;
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
  }

  function openEntryPopup() {
    openEntryPopupNew();
  }

  function closeEntryPopup() {
    entryPopup.hidden = true;
    resetEntryEditor();
  }

  spinTriggerBtn.addEventListener("click", spin);
  clearFilterBtn.addEventListener("click", function () {
    overlayFilterDropdown.hidden = !overlayFilterDropdown.hidden;
  });
  overlayFilterDropdown.addEventListener("click", function (event) {
    const option = event.target.closest("[data-dropdown-filter]");
    if (!option || !overlayFilterDropdown.contains(option)) return;
    const nextTag = option.getAttribute("data-dropdown-filter") || null;
    activeTagFilter = nextTag;
    pendingEntryTag = nextTag;
    overlayFilterDropdown.hidden = true;
    syncEntriesView();
  });
  openEntryPopupBtn.addEventListener("click", openEntryPopup);
  closeEntryPopupBtn.addEventListener("click", closeEntryPopup);
  entryPopup.querySelector("[data-close-entry-popup]").addEventListener("click", closeEntryPopup);
  confirmEntryBtn.addEventListener("click", applyEntryInput);
  tagButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const tag = btn.getAttribute("data-entry-tag");
      if (!tag) return;
      const nextTag = activeTagFilter === tag ? null : tag;
      activeTagFilter = nextTag;
      pendingEntryTag = nextTag;
      syncEntriesView();
    });
  });
  entryInputEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyEntryInput();
    }
  });
  entryListEl.addEventListener("click", function (event) {
    const card = event.target.closest(".entry-list__card");
    if (!card || !entryListEl.contains(card)) return;
    const entryId = card.getAttribute("data-entry-id");
    const index = entries.findIndex(function (entry) {
      return String(entry.id) === entryId;
    });
    if (index < 0) return;
    const deleteBtn = event.target.closest("[data-entry-delete]");
    if (deleteBtn) {
      if (isSpinning) return;
      entries.splice(index, 1);
      resetEntryEditor();
      syncEntriesView();
      return;
    }
    openEntryPopupEdit(index);
  });
  entryListEl.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".entry-list__card");
    if (!card || !entryListEl.contains(card)) return;
    const entryId = card.getAttribute("data-entry-id");
    const index = entries.findIndex(function (entry) {
      return String(entry.id) === entryId;
    });
    if (index < 0) return;
    if (event.key === " ") event.preventDefault();
    openEntryPopupEdit(index);
  });

  closeModalBtn.addEventListener("click", closeModal);
  modal.querySelector("[data-close-modal]").addEventListener("click", closeModal);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !overlayFilterDropdown.hidden) {
      overlayFilterDropdown.hidden = true;
    }
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
    if (event.key === "Escape" && !entryPopup.hidden) {
      closeEntryPopup();
    }
  });
  document.addEventListener("click", function (event) {
    if (overlayFilterDropdown.hidden) return;
    const clickedTrigger = clearFilterBtn.contains(event.target);
    const clickedDropdown = overlayFilterDropdown.contains(event.target);
    if (!clickedTrigger && !clickedDropdown) {
      overlayFilterDropdown.hidden = true;
    }
  });

  function hydrateFromServer() {
    if (!PU || !PU.supabase) {
      entries = DEFAULT_ENTRIES.slice();
      syncEntriesView();
      return;
    }
    getActiveUserId()
      .then(function (userId) {
        if (!userId) return [];
        return PU.supabase
          .from("wheel_entries")
          .select("id, entry_name, entry_tag, sort_order")
          .eq("user_id", userId)
          .order("sort_order", { ascending: true });
      })
      .then(function (res) {
        if (res && res.error) {
          console.error("[section4] load wheel_entries table", res.error);
        }
        if (res && res.data && res.data.length) {
          entries = res.data.map(function (row, index) {
            return {
              id: "db-" + String(row.id || index),
              name: row.entry_name || "",
              tag: row.entry_tag || null,
            };
          });
          syncEntriesView();
          return;
        }
        if (!PU || typeof PU.ensureProgramPayload !== "function") {
          entries = DEFAULT_ENTRIES.slice();
          syncEntriesView();
          return;
        }
        return PU.ensureProgramPayload().then(function () {
          const s4 = PU.programPayload.section4;
          if (s4 && Array.isArray(s4.entries) && s4.entries.length) {
            entries = s4.entries;
            if (typeof s4.activeTagFilter !== "undefined") activeTagFilter = s4.activeTagFilter;
            if (typeof s4.currentRotation === "number") currentRotation = s4.currentRotation;
          } else {
            entries = DEFAULT_ENTRIES.slice();
          }
          syncEntriesView();
        });
      })
      .catch(function () {
        entries = DEFAULT_ENTRIES.slice();
        syncEntriesView();
      });
  }

  hydrateFromServer();
})();
