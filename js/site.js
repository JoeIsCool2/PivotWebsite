(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const siteThemeClasses = [
    "site-theme-breathe",
    "site-theme-grounded-earth",
    "site-theme-sunset-wind-down",
    "site-theme-zen-garden"
  ];
  const darkThemeKeys = new Set(["sunset-wind-down"]);
  const themeKeys = ["breathe", "grounded-earth", "sunset-wind-down", "zen-garden"];
  const THEME_STORAGE_KEY = "pivotSiteTheme";
  const CTA_VARIANT_STORAGE_KEY = "pivotCtaVariant";
  const APP_PART_PREFS_KEY = "pivotAppPartPrefsV2";
  const ICON_LIGHT_PATH = "assets/app-icon.png";
  const ICON_DARK_PATH = "assets/app-icon.png";
  const SITE_SOCIAL_IMAGE = "ScreenShots/Focus.PNG";
  const APP_STORE_URL = "https://apps.apple.com";
  const TESTFLIGHT_URL = "https://testflight.apple.com";

  const normalizeThemeKey = (raw) => {
    const key = (raw || "").toLowerCase().trim();
    return themeKeys.includes(key) ? key : "breathe";
  };

  const prefersReducedMotion = () =>
    window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  const updateThemeIconAssets = (themeKey) => {
    const useDarkIcon = darkThemeKeys.has(themeKey);
    const iconPath = useDarkIcon ? ICON_DARK_PATH : ICON_LIGHT_PATH;

    document.querySelectorAll(".brand-mark").forEach((img) => {
      if (img.getAttribute("src") === iconPath) return;

      const swapSrc = () => {
        img.setAttribute("src", iconPath);
        const finish = () => {
          img.style.opacity = "1";
          img.removeEventListener("load", finish);
          img.removeEventListener("error", finish);
        };
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
        if (img.complete) finish();
      };

      if (prefersReducedMotion()) {
        swapSrc();
        return;
      }

      img.style.opacity = "0";
      window.setTimeout(() => {
        swapSrc();
      }, 200);
    });

    const favicon = document.querySelector("link[rel='icon']");
    if (favicon && favicon.getAttribute("href") !== iconPath) {
      favicon.setAttribute("href", iconPath);
      favicon.setAttribute("type", "image/png");
    }
  };

  const applySiteThemeClass = (themeKey) => {
    const normalized = normalizeThemeKey(themeKey);
    document.body.classList.remove(...siteThemeClasses);
    document.body.classList.add(`site-theme-${normalized}`);
    updateThemeIconAssets(normalized);
    return normalized;
  };

  const setStoredThemeKey = (themeKey) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemeKey(themeKey));
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
  };

  const getStoredThemeKey = () => {
    try {
      return normalizeThemeKey(window.localStorage.getItem(THEME_STORAGE_KEY) || "breathe");
    } catch {
      return "breathe";
    }
  };

  const getCtaVariantFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("cta") || "").toLowerCase().trim();
    if (raw === "a" || raw === "b") return raw;
    return null;
  };

  const getStoredCtaVariant = () => {
    try {
      const value = (window.localStorage.getItem(CTA_VARIANT_STORAGE_KEY) || "").toLowerCase().trim();
      return value === "a" || value === "b" ? value : null;
    } catch {
      return null;
    }
  };

  const setStoredCtaVariant = (variant) => {
    if (variant !== "a" && variant !== "b") return;
    try {
      window.localStorage.setItem(CTA_VARIANT_STORAGE_KEY, variant);
    } catch {
      // Ignore storage failures.
    }
  };

  const resolveCtaVariant = () => {
    const forced = getCtaVariantFromUrl();
    if (forced) {
      setStoredCtaVariant(forced);
      return forced;
    }

    const stored = getStoredCtaVariant();
    if (stored) return stored;

    const assigned = Math.random() < 0.5 ? "a" : "b";
    setStoredCtaVariant(assigned);
    return assigned;
  };

  const applyCtaVariantCopy = (variant) => {
    const nodes = document.querySelectorAll("[data-cta-a][data-cta-b]");
    nodes.forEach((node) => {
      const text = node.getAttribute(variant === "b" ? "data-cta-b" : "data-cta-a");
      if (!text) return;
      const target = node.querySelector(".small");
      if (target) {
        target.textContent = text;
      } else {
        node.textContent = text;
      }
    });
  };

  // Apply persisted theme as early as possible on every page.
  const initialThemeKey = getStoredThemeKey();
  applySiteThemeClass(initialThemeKey);

  const SITE_BASE_URL = "https://pivotapp.com";
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  // Lightweight analytics hook: emits to dataLayer and custom event.
  const emitAnalyticsEvent = (eventName, payload = {}) => {
    const data = {
      event: eventName,
      page: currentPath,
      ts: Date.now(),
      ...payload
    };

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(data);
    }
    window.dispatchEvent(new CustomEvent("pivot:analytics", { detail: data }));
  };

  // Lazy-load non-critical screenshots.
  $$(".shot-img").forEach((img) => {
    if (!img || img.id === "heroShotImg") return;
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
  });

  // If the user drags a gallery, we suppress the next click so it doesn't
  // accidentally open the screenshot lightbox.
  let suppressShotClick = false;

  // Mobile nav
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  const navToggle = () => {
    if (!burger || !mobileMenu) return;
    const isOpen = mobileMenu.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(isOpen));
  };

  if (burger) burger.addEventListener("click", navToggle);

  // Close menu when clicking a mobile link
  $$("[data-mobile-link='true']").forEach((el) => {
    el.addEventListener("click", () => {
      if (!mobileMenu) return;
      mobileMenu.classList.remove("is-open");
      burger && burger.setAttribute("aria-expanded", "false");
    });
  });

  // Fade-in on scroll
  const fadeEls = $$(".fade");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) e.target.classList.add("is-visible");
      }
    }, { threshold: 0.12 });
    fadeEls.forEach((el) => io.observe(el));
  } else {
    fadeEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Smooth scroll for in-page anchors
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      const nav = document.querySelector("header.nav");
      const navH = nav ? nav.getBoundingClientRect().height : 0;
      const targetRect = target.getBoundingClientRect();
      const y = window.scrollY + targetRect.top - (navH + 10);
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });

  // CTA tracking: prepares event hooks for analytics tools.
  const pageStartMs = (window.performance && typeof window.performance.now === "function")
    ? window.performance.now()
    : Date.now();
  let hasTrackedFirstCta = false;
  $$("a, button").forEach((el) => {
    el.addEventListener("click", () => {
      const href = (el.getAttribute("href") || "").trim();
      const label = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
      const isAppStore = href.includes("app-store") || /app store/i.test(label);
      const isTestFlight = href.includes("testflight.apple.com") || /testflight/i.test(label);
      const isDownload = isAppStore || isTestFlight || href.includes("#download") || /download pivot/i.test(label);

      if (!isDownload) return;

      const payload = {
        cta_type: isAppStore ? "app_store" : isTestFlight ? "testflight" : "download",
        cta_label: label || "Download",
        href: href || null
      };
      emitAnalyticsEvent("cta_click", payload);

      if (!hasTrackedFirstCta) {
        hasTrackedFirstCta = true;
        const elapsedMs = (window.performance && typeof window.performance.now === "function")
          ? Math.round(window.performance.now() - pageStartMs)
          : 0;
        emitAnalyticsEvent("first_cta_click", {
          ...payload,
          first_cta_time_ms: elapsedMs
        });
      }
    });
  });

  // Copy experiment hook for download-focused CTAs.
  const activeCtaVariant = resolveCtaVariant();
  applyCtaVariantCopy(activeCtaVariant);
  emitAnalyticsEvent("cta_variant_assigned", { cta_variant: activeCtaVariant });
  emitAnalyticsEvent("page_view", { path: currentPath, cta_variant: activeCtaVariant });

  // Track section visibility to understand content engagement.
  const trackedSections = $$("[data-track-section]");
  if (trackedSections.length > 0 && "IntersectionObserver" in window) {
    const seenSections = new Set();
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sectionName = entry.target.getAttribute("data-track-section");
        if (!sectionName || seenSections.has(sectionName)) return;
        seenSections.add(sectionName);
        emitAnalyticsEvent("section_view", { section: sectionName });
      });
    }, { threshold: 0.45 });
    trackedSections.forEach((section) => sectionObserver.observe(section));
  }

  // Reflection-only Journal insights (deterministic, no AI).
  const reflectionTimeline = document.getElementById("reflectionTimeline");
  if (reflectionTimeline) {
    const reflectionEmpty = document.getElementById("reflectionEmpty");
    const entries = Array.from(reflectionTimeline.querySelectorAll("[data-reflection-entry='true']"));

    const formatDateLabel = (date) =>
      date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });

    const getWordCount = (text) => {
      if (!text) return 0;
      return text.trim().split(/\s+/).filter(Boolean).length;
    };

    const getTimeBucket = (hour) => {
      if (hour < 12) return "Morning";
      if (hour < 18) return "Afternoon";
      return "Evening";
    };

    const renderChips = (targetId, chips, fallback) => {
      const el = document.getElementById(targetId);
      if (!el) return;
      el.innerHTML = "";
      if (!chips || chips.length === 0) {
        const chip = document.createElement("span");
        chip.className = "patternChip muted";
        chip.textContent = fallback;
        el.appendChild(chip);
        return;
      }
      chips.forEach((text) => {
        const chip = document.createElement("span");
        chip.className = "patternChip";
        chip.textContent = text;
        el.appendChild(chip);
      });
    };

    if (entries.length === 0) {
      if (reflectionEmpty) reflectionEmpty.hidden = false;
      reflectionTimeline.hidden = true;
    } else {
      if (reflectionEmpty) reflectionEmpty.hidden = true;
      reflectionTimeline.hidden = false;
    }

    const now = new Date();
    const last7Start = new Date(now);
    last7Start.setDate(now.getDate() - 6);
    last7Start.setHours(0, 0, 0, 0);

    const parsedEntries = entries
      .map((entry) => {
        const ts = entry.getAttribute("data-reflection-ts") || "";
        const source = entry.getAttribute("data-reflection-source") || "Journal";
        const text = entry.getAttribute("data-reflection-text") || "";
        const date = new Date(ts);
        if (Number.isNaN(date.getTime())) return null;
        return { entry, ts, source, text, date };
      })
      .filter(Boolean)
      .sort((a, b) => b.date - a.date);

    parsedEntries.forEach(({ entry, source, text, date }) => {
      const topSource = entry.querySelector(".entryPill");
      const topMeta = entry.querySelector(".entryMeta");
      const body = entry.querySelector(".reflectionBody");
      const toggle = entry.querySelector(".entryToggle");
      const cleanText = text.trim();
      const previewLimit = 140;
      const isLong = cleanText.length > previewLimit;
      const preview = isLong ? `${cleanText.slice(0, previewLimit).trimEnd()}...` : cleanText;

      if (topSource) topSource.textContent = source;
      if (topMeta) topMeta.textContent = formatDateLabel(date);
      if (body) body.textContent = preview;

      if (toggle && isLong && body) {
        toggle.hidden = false;
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", () => {
          const isOpen = toggle.getAttribute("aria-expanded") === "true";
          toggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
          toggle.textContent = isOpen ? "Read more" : "Show less";
          body.textContent = isOpen ? preview : cleanText;
        });
      } else if (toggle) {
        toggle.hidden = true;
      }
    });

    const thisWeekEntries = parsedEntries.filter(({ date }) => date >= last7Start && date <= now);
    const thisWeekCount = thisWeekEntries.length;
    const avgWords = thisWeekCount > 0
      ? Math.round(thisWeekEntries.reduce((sum, item) => sum + getWordCount(item.text), 0) / thisWeekCount)
      : 0;

    const dayWindowCounts = new Map();
    thisWeekEntries.forEach(({ date }) => {
      const day = date.toLocaleDateString("en-US", { weekday: "short" });
      const windowLabel = getTimeBucket(date.getHours());
      const key = `${day} ${windowLabel}`;
      dayWindowCounts.set(key, (dayWindowCounts.get(key) || 0) + 1);
    });
    const mostActiveWindow = dayWindowCounts.size > 0
      ? [...dayWindowCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : "-";

    const daySet = new Set(
      parsedEntries.map(({ date }) => date.toISOString().slice(0, 10))
    );
    let streak = 0;
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const statEntriesWeek = document.getElementById("statEntriesWeek");
    const statStreakDays = document.getElementById("statStreakDays");
    const statAvgWords = document.getElementById("statAvgWords");
    const statActiveWindow = document.getElementById("statActiveWindow");
    if (statEntriesWeek) statEntriesWeek.textContent = String(thisWeekCount);
    if (statStreakDays) statStreakDays.textContent = `${streak} day${streak === 1 ? "" : "s"}`;
    if (statAvgWords) statAvgWords.textContent = `${avgWords} words`;
    if (statActiveWindow) statActiveWindow.textContent = mostActiveWindow;

    const shortCount = thisWeekEntries.filter((item) => getWordCount(item.text) < 25).length;
    const mediumCount = thisWeekEntries.filter((item) => {
      const count = getWordCount(item.text);
      return count >= 25 && count < 60;
    }).length;
    const longCount = thisWeekEntries.filter((item) => getWordCount(item.text) >= 60).length;
    renderChips(
      "lengthPatternChips",
      thisWeekCount > 0 ? [`Short ${shortCount}`, `Medium ${mediumCount}`, `Long ${longCount}`] : [],
      "No entries yet"
    );

    const timeCounts = { Morning: 0, Afternoon: 0, Evening: 0 };
    thisWeekEntries.forEach(({ date }) => {
      const bucket = getTimeBucket(date.getHours());
      timeCounts[bucket] += 1;
    });
    renderChips(
      "timePatternChips",
      thisWeekCount > 0 ? Object.keys(timeCounts).map((key) => `${key} ${timeCounts[key]}`) : [],
      "No entries yet"
    );

    const keywordMap = {
      focus: /\bfocus|task|priority\b/i,
      stress: /\bstress|overwhelm|anxious\b/i,
      sleep: /\bsleep|tired|rest\b/i,
      walk: /\bwalk|outside|move\b/i,
      work: /\bwork|project|study\b/i
    };
    const keywordCounts = new Map();
    thisWeekEntries.forEach(({ text }) => {
      Object.entries(keywordMap).forEach(([key, regex]) => {
        if (regex.test(text)) {
          keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
        }
      });
    });
    const keywordChips = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, count]) => `${key} ${count}`);
    renderChips("keywordPatternChips", keywordChips, "No common topics yet");

    const reflectionPrompt = document.getElementById("reflectionPrompt");
    if (reflectionPrompt) {
      if (thisWeekCount === 0) {
        reflectionPrompt.textContent = "Start with one short reflection today. A simple daily habit gives your timeline real signal.";
      } else if (streak >= 4) {
        reflectionPrompt.textContent = `You are on a ${streak}-day streak. What specific habit is helping you stay consistent?`;
      } else if (thisWeekCount >= 5) {
        reflectionPrompt.textContent = `You wrote ${thisWeekCount} times this week. What pattern do you want to keep next week?`;
      } else {
        reflectionPrompt.textContent = `You logged ${thisWeekCount} entries this week. Add one more reflection tonight to strengthen your pattern.`;
      }
    }
  }

  // Contact form placeholder behavior (no backend required)
  const form = $("#contactForm");
  const status = $("#contactStatus");
  if (form) {
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();

      const formAction = (form.getAttribute("action") || "").trim();
      const name = ($("#name")?.value || "").trim();
      const email = ($("#email")?.value || "").trim();
      const message = ($("#message")?.value || "").trim();

      // If user still has placeholder endpoint, open a mailto instead of failing silently.
      const isPlaceholder = formAction.toUpperCase().includes("REPLACE_ME") || formAction === "";
      const subject = encodeURIComponent(`Pivot website contact${name ? `: ${name}` : ""}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`
      );

      if (isPlaceholder) {
        window.location.href = `mailto:hello@pivotapp.com?subject=${subject}&body=${body}`;
        emitAnalyticsEvent("contact_submit_mailto_fallback", { email });
        if (status) status.textContent = "Opening your email app with a prefilled message.";
        return;
      }

      // Otherwise, submit normally (third-party endpoint / Formspree-like).
      if (status) status.textContent = "Sending your message...";
      emitAnalyticsEvent("contact_submit", { has_name: Boolean(name), email_domain: email.includes("@") ? email.split("@")[1] : null });
      form.submit();
    });
  }

  // FAQ accordion
  const accordion = document.getElementById("faqAccordion");
  if (accordion) {
    const buttons = Array.from(accordion.querySelectorAll(".accordion-button"));
    const items = Array.from(accordion.querySelectorAll(".accordion-item"));

    const closeAll = () => {
      items.forEach((item) => {
        const btn = item.querySelector(".accordion-button");
        const panel = item.querySelector(".accordion-panel");
        if (btn) btn.setAttribute("aria-expanded", "false");
        if (panel) panel.hidden = true;
      });
    };

    buttons.forEach((btn) => {
      const item = btn.closest(".accordion-item");
      const panelId = btn.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!item || !panel) return;

      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        // Keep single-open behavior to feel "app-like".
        if (!isOpen) closeAll();

        btn.setAttribute("aria-expanded", String(!isOpen));
        panel.hidden = isOpen;
      });
    });
  }

  // Drag-to-scroll screenshot galleries (snap already handled in CSS).
  $$(".shot-gallery").forEach((gallery) => {
    if (!gallery) return;

    // Smoothness is helpful when we programmatically scroll.
    gallery.style.scrollBehavior = "smooth";

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;

    const onPointerDown = (e) => {
      // Only react to primary button for mouse.
      if (typeof e.button === "number" && e.button !== 0) return;

      isDown = true;
      moved = false;
      startX = e.clientX;
      startScrollLeft = gallery.scrollLeft;

      try {
        gallery.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture isn't supported.
      }
    };

    const onPointerMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      gallery.scrollLeft = startScrollLeft - dx;
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      if (moved) {
        suppressShotClick = true;
        window.setTimeout(() => {
          suppressShotClick = false;
        }, 350);
      }
    };

    gallery.addEventListener("pointerdown", onPointerDown);
    gallery.addEventListener("pointermove", onPointerMove);
    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);

    // Make vertical wheel feel like horizontal scrolling.
    gallery.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        if (Math.abs(e.deltaY) < 1) return;
        e.preventDefault();
        gallery.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
  });

  // Screenshot lightbox (optional)
  const shotModalBackdropId = "shotModalBackdrop";
  const existingBackdrop = document.getElementById(shotModalBackdropId);
  if (!existingBackdrop) {
    const backdrop = document.createElement("div");
    backdrop.id = shotModalBackdropId;
    backdrop.className = "modal-backdrop";
    backdrop.style.display = "none";
    backdrop.setAttribute("aria-hidden", "true");

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const topbar = document.createElement("div");
    topbar.className = "modal-topbar";

    const title = document.createElement("div");
    title.className = "modal-title";
    title.textContent = "Screenshot";

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.setAttribute("aria-label", "Close screenshot viewer");

    topbar.appendChild(title);
    topbar.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "modal-body";

    const img = document.createElement("img");
    img.id = "shotModalImg";
    img.className = "modal-shot";
    img.alt = "";

    body.appendChild(img);
    modal.appendChild(topbar);
    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const openShot = (shotSrc, shotTitle) => {
      img.src = shotSrc;
      img.alt = shotTitle || "Screenshot";
      title.textContent = shotTitle || "Screenshot";

      backdrop.style.display = "flex";
      backdrop.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    };

    const closeShot = () => {
      backdrop.style.display = "none";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      img.src = "";
    };

    closeBtn.addEventListener("click", closeShot);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeShot();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeShot();
    });

    document.addEventListener("click", (e) => {
      if (suppressShotClick) return;

      const target = e.target;
      const imgEl = target && target.closest
        ? target.closest(".shot-img[data-shot='true']")
        : null;
      if (!imgEl) return;

      // Landing hero/sticky phones are decorative in this setup and should not open the lightbox.
      // (Only screenshot galleries should.)
      const imgId = imgEl.getAttribute("id") || "";
      if (imgId === "heroShotImg") return;
      if (imgEl.closest(".landingHeroPhone")) return;

      const shotSrc = imgEl.getAttribute("src");
      const shotTitle = imgEl.getAttribute("data-shot-title") || imgEl.getAttribute("alt") || "Screenshot";
      if (!shotSrc) return;

      e.preventDefault();
      openShot(shotSrc, shotTitle);
    });
  }

  // -------------------------
  // Landing hero + showcase
  // -------------------------
  const heroShots = $$("[data-hero-shot-src]");
  const heroImg = document.getElementById("heroShotImg");
  const heroRotatorImg = heroImg ? heroImg : null;

  // Keep the sticky phone aligned under the current sticky nav height.
  // (Header height can change across breakpoints.)
  const navLanding = document.querySelector("header.nav");
  if (navLanding) {
    document.documentElement.style.setProperty(
      "--navH",
      `${Math.round(navLanding.getBoundingClientRect().height)}px`
    );
  }

  let shotSwapId = 0;
  const fadeSwapShot = (img, newSrc, setAttrs) => {
    if (!img || !newSrc || img.getAttribute("src") === newSrc) return;
    const id = ++shotSwapId;
    if (prefersReducedMotion()) {
      img.src = newSrc;
      if (setAttrs) setAttrs(img);
      return;
    }
    const done = () => {
      if (id !== shotSwapId) return;
      img.src = newSrc;
      if (setAttrs) setAttrs(img);
      img.style.opacity = "1";
    };
    img.style.opacity = "0";
    const onEnd = (e) => {
      if (e.target !== img) return;
      img.removeEventListener("transitionend", onEnd);
      done();
    };
    img.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      img.removeEventListener("transitionend", onEnd);
      if (id === shotSwapId && img.style.opacity === "0") done();
    }, 350);
  };

  const setHeroShot = (shotEl) => {
    if (!heroRotatorImg || !shotEl) return;
    const src = shotEl.getAttribute("data-hero-shot-src");
    const title = shotEl.getAttribute("data-hero-shot-title") || "Screenshot";
    if (!src) return;
    fadeSwapShot(heroRotatorImg, src, (el) => {
      el.setAttribute("alt", title);
      el.setAttribute("data-shot-title", title);
    });
  };

  // Hero theme picker: click-driven, synced with hero screenshot + page theme.
  const showcaseSteps = $$("[data-showcase-step][data-showcase-src]");

  if (showcaseSteps.length > 0 && heroRotatorImg && heroShots.length > 0) {
    const applyThemeByIndex = (index) => {
      const normalized = ((index % showcaseSteps.length) + showcaseSteps.length) % showcaseSteps.length;

      showcaseSteps.forEach((el, i) => {
        const isActive = i === normalized;
        el.classList.toggle("is-active", isActive);
        el.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      const activeStep = showcaseSteps[normalized];
      const bodyTheme = activeStep.getAttribute("data-theme-key");
      const resolvedThemeKey = bodyTheme || themeKeys[normalized] || "breathe";
      applySiteThemeClass(resolvedThemeKey);
      setStoredThemeKey(resolvedThemeKey);

      if (heroShots[normalized]) setHeroShot(heroShots[normalized]);
      emitAnalyticsEvent("theme_change", { theme: resolvedThemeKey, source: "home_theme_cards" });
    };

    // Prefer persisted theme index when available.
    const persistedIndex = showcaseSteps.findIndex(
      (step) => normalizeThemeKey(step.getAttribute("data-theme-key")) === initialThemeKey
    );
    applyThemeByIndex(persistedIndex >= 0 ? persistedIndex : 0);

    showcaseSteps.forEach((stepEl, index) => {
      stepEl.addEventListener("click", () => applyThemeByIndex(index));
      stepEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          applyThemeByIndex(index);
        }
      });
    });

  }

  // App parts explorer (Focus / Vent / Journal / Move / Pro).
  const appPartSteps = $$("[data-app-part]");
  const appPartImg = document.getElementById("appPartShotImg");
  const appPartComingSoon = document.getElementById("appPartComingSoon");
  const appPartsContextCopy = document.getElementById("appPartsContextCopy");
  const appPartsRail = document.querySelector(".appPartsRail");
  const appPartsContextStrip = document.getElementById("appPartsContextStrip");
  const appPartsPreviewPhone = document.querySelector(".appPartsPreviewPhone");

  if (appPartSteps.length > 0 && appPartImg) {
    const getDayBucket = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "morning";
      if (hour < 18) return "afternoon";
      return "evening";
    };

    const getStoredAppPartPrefs = () => {
      try {
        const raw = window.localStorage.getItem(APP_PART_PREFS_KEY);
        if (!raw) return { history: [], lastTopPart: null, lastRankTs: 0 };
        const parsed = JSON.parse(raw);
        const history = Array.isArray(parsed.history) ? parsed.history.slice(-18) : [];
        return {
          history,
          lastTopPart: typeof parsed.lastTopPart === "string" ? parsed.lastTopPart : null,
          lastRankTs: Number(parsed.lastRankTs) || 0
        };
      } catch {
        return { history: [], lastTopPart: null, lastRankTs: 0 };
      }
    };

    const setStoredAppPartPrefs = (nextState) => {
      try {
        window.localStorage.setItem(APP_PART_PREFS_KEY, JSON.stringify(nextState));
      } catch {
        // Ignore storage write failures.
      }
    };

    const resolveAppPartContext = (part, reasonFromCard, score) => {
      if (reasonFromCard) return reasonFromCard;
      const bucket = getDayBucket();
      const genericByPart = {
        focus: "Showing Focus first to help you start with one clear offline action.",
        vent: "Showing Vent first so you can clear mental load before acting.",
        journal: "Showing Journal first to capture patterns and sharpen your next step.",
        move: "Showing Move first to convert screen energy into real-world motion.",
        pro: "Showing Pro first for deeper guidance and long-term momentum."
      };
      if (bucket === "evening" && part === "vent") {
        return "Evening mode detected, so Vent is surfaced first for a lighter reset.";
      }
      if (score >= 8) {
        return `This match is high confidence for right now, so ${part} is surfaced first.`;
      }
      return genericByPart[part] || "Showing the feature most likely to fit your current rhythm.";
    };

    const persistedPrefs = getStoredAppPartPrefs();
    const contextSignals = {
      theme: getStoredThemeKey(),
      ctaVariant: activeCtaVariant,
      dayBucket: getDayBucket(),
      history: persistedPrefs.history
    };

    const scoreAppPart = (part) => {
      let score = 0;
      const historyBoost = contextSignals.history
        .slice(-8)
        .reduce((sum, item, idx) => sum + (item === part ? 3 - Math.min(2, idx * 0.2) : 0), 0);
      score += historyBoost;

      if (contextSignals.dayBucket === "morning" && part === "focus") score += 2.2;
      if (contextSignals.dayBucket === "afternoon" && part === "journal") score += 1.7;
      if (contextSignals.dayBucket === "evening" && part === "vent") score += 2.3;

      if (contextSignals.theme === "breathe" && part === "vent") score += 1.2;
      if (contextSignals.theme === "grounded-earth" && part === "move") score += 1.5;
      if (contextSignals.theme === "sunset-wind-down" && part === "journal") score += 1.5;
      if (contextSignals.theme === "zen-garden" && part === "focus") score += 1.2;

      if (contextSignals.ctaVariant === "b" && part === "pro") score += 1.3;
      if (contextSignals.ctaVariant === "a" && part === "focus") score += 1.1;

      if (part === "focus") score += 0.25;
      return score;
    };

    const rankSteps = appPartSteps
      .map((step) => ({
        step,
        part: (step.getAttribute("data-app-part") || "").toLowerCase(),
        score: scoreAppPart((step.getAttribute("data-app-part") || "").toLowerCase())
      }))
      .sort((a, b) => b.score - a.score);

    const bestScore = rankSteps[0]?.score || 0;
    const secondScore = rankSteps[1]?.score || 0;
    const hasStrongConfidence = bestScore - secondScore >= 0.65;
    const rankCooldownMs = 1000 * 60 * 60 * 12;
    const canReorder = hasStrongConfidence && Date.now() - persistedPrefs.lastRankTs > rankCooldownMs;

    if (canReorder) {
      const parent = appPartSteps[0].parentElement;
      if (parent) {
        rankSteps.forEach(({ step }) => parent.appendChild(step));
      }
      persistedPrefs.lastRankTs = Date.now();
      persistedPrefs.lastTopPart = rankSteps[0]?.part || null;
      setStoredAppPartPrefs(persistedPrefs);
      emitAnalyticsEvent("app_part_rank_applied", {
        top_part: rankSteps[0]?.part || null,
        score_gap: Number((bestScore - secondScore).toFixed(3)),
        reordered: true
      });
    } else {
      emitAnalyticsEvent("app_part_rank_applied", {
        top_part: rankSteps[0]?.part || null,
        score_gap: Number((bestScore - secondScore).toFixed(3)),
        reordered: false
      });
    }

    const orderedSteps = $$("[data-app-part]");

    const setAppPart = (stepEl) => {
      if (!stepEl) return;
      const src = stepEl.getAttribute("data-app-src");
      const title = stepEl.getAttribute("data-app-title") || "App part";
      const isComingSoon = stepEl.getAttribute("data-app-coming-soon") === "true";
      const selectedPart = (stepEl.getAttribute("data-app-part") || "").toLowerCase();
      const reason = resolveAppPartContext(
        selectedPart,
        stepEl.getAttribute("data-app-reason") || "",
        scoreAppPart(selectedPart)
      );

      orderedSteps.forEach((el) => {
        const isActive = el === stepEl;
        el.classList.toggle("is-active", isActive);
        el.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      if (src) {
        fadeSwapShot(appPartImg, src, (el) => {
          el.alt = `${title} preview`;
          el.setAttribute("data-shot-title", title);
        });
      }

      if (appPartComingSoon) {
        appPartComingSoon.hidden = !isComingSoon;
      }

      if (appPartsContextStrip) {
        appPartsContextStrip.classList.add("is-updating");
      }
      if (appPartsContextCopy) {
        appPartsContextCopy.textContent = reason;
      }
      if (appPartsContextStrip) {
        window.setTimeout(() => appPartsContextStrip.classList.remove("is-updating"), 220);
      }

      if (appPartsPreviewPhone) {
        appPartsPreviewPhone.style.transform = "translateY(-2px)";
        window.setTimeout(() => {
          appPartsPreviewPhone.style.transform = "";
        }, 180);
      }

      const nextPrefs = getStoredAppPartPrefs();
      nextPrefs.history = [...nextPrefs.history, selectedPart].filter(Boolean).slice(-18);
      nextPrefs.lastTopPart = nextPrefs.lastTopPart || selectedPart;
      nextPrefs.lastRankTs = nextPrefs.lastRankTs || 0;
      setStoredAppPartPrefs(nextPrefs);

      emitAnalyticsEvent("app_part_select", {
        app_part: selectedPart,
        coming_soon: isComingSoon,
        context_bucket: contextSignals.dayBucket,
        context_reason: reason
      });
    };

    const defaultStep =
      orderedSteps.find((step) => (step.getAttribute("data-app-part") || "").toLowerCase() === rankSteps[0]?.part) ||
      orderedSteps[0];
    setAppPart(defaultStep);
    emitAnalyticsEvent("app_part_default_reason", {
      app_part: (defaultStep?.getAttribute("data-app-part") || "").toLowerCase(),
      source: hasStrongConfidence ? "ranked_confident" : "ranked_soft",
      day_bucket: contextSignals.dayBucket
    });

    orderedSteps.forEach((stepEl) => {
      stepEl.addEventListener("click", () => setAppPart(stepEl));
      stepEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          setAppPart(stepEl);
        }
      });
    });

    if (appPartsRail && "IntersectionObserver" in window) {
      const railObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          appPartsRail.classList.add("is-visible");
          observer.disconnect();
        });
      }, { threshold: 0.2 });
      railObserver.observe(appPartsRail);
    } else if (appPartsRail) {
      appPartsRail.classList.add("is-visible");
    }
  }

  // Theme picker controls for non-landing pages.
  const themePickers = $$("[data-theme-select]");
  if (themePickers.length > 0) {
    const refreshThemePickerState = (activeKey) => {
      themePickers.forEach((btn) => {
        const key = normalizeThemeKey(btn.getAttribute("data-theme-select"));
        const isActive = key === activeKey;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    };

    refreshThemePickerState(initialThemeKey);

    themePickers.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = normalizeThemeKey(btn.getAttribute("data-theme-select"));
        applySiteThemeClass(key);
        setStoredThemeKey(key);
        refreshThemePickerState(key);
        emitAnalyticsEvent("theme_change", { theme: key, source: "legal_theme_picker" });
      });
    });
  }

  // Mobile sticky download CTA (site-wide).
  if (!document.getElementById("mobileStickyCta")) {
    const appStoreHref =
      document.querySelector('a[data-download="app-store"]')?.getAttribute("href") ||
      APP_STORE_URL;
    const testFlightHref =
      document.querySelector('a[data-download="testflight"]')?.getAttribute("href") ||
      TESTFLIGHT_URL;

    const bar = document.createElement("div");
    bar.id = "mobileStickyCta";
    bar.className = "mobileStickyCta";
    bar.innerHTML = `
      <a class="mobileStickyBtn primary" href="${appStoreHref}" target="_blank" rel="noopener noreferrer">View on App Store</a>
      <a class="mobileStickyBtn" href="${testFlightHref}" target="_blank" rel="noopener noreferrer">Join TestFlight</a>
    `;
    document.body.appendChild(bar);
  }

  // Keep social image metadata and favicon deterministic for all pages.
  const ensureHeadAssets = () => {
    const socialSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]'
    ];
    socialSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (node.getAttribute("content") !== SITE_SOCIAL_IMAGE) {
          node.setAttribute("content", SITE_SOCIAL_IMAGE);
        }
      });
    });
  };
  ensureHeadAssets();

  // Footer year helper.
  const footerBrand = document.querySelector(".footerBrandTag");
  if (footerBrand && !document.getElementById("footerYear")) {
    const year = new Date().getFullYear();
    const yearEl = document.createElement("div");
    yearEl.id = "footerYear";
    yearEl.className = "footerYear";
    yearEl.textContent = `© ${year} Pivot`;
    footerBrand.insertAdjacentElement("afterend", yearEl);
  }

})();

