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
  const ICON_LIGHT_PATH = "assets/app-icon.png";
  const ICON_DARK_PATH = "assets/app-icon-dark.png";

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
  $$("a, button").forEach((el) => {
    el.addEventListener("click", () => {
      const href = (el.getAttribute("href") || "").trim();
      const label = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
      const isAppStore = href.includes("app-store") || /app store/i.test(label);
      const isTestFlight = href.includes("testflight.apple.com") || /testflight/i.test(label);
      const isDownload = isAppStore || isTestFlight || href.includes("#download") || /download pivot/i.test(label);

      if (!isDownload) return;

      emitAnalyticsEvent("cta_click", {
        cta_type: isAppStore ? "app_store" : isTestFlight ? "testflight" : "download",
        cta_label: label || "Download",
        href: href || null
      });
    });
  });

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
        if (status) status.textContent = "Opening your email app…";
        return;
      }

      // Otherwise, submit normally (third-party endpoint / Formspree-like).
      if (status) status.textContent = "Sending…";
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
      if (imgId === "heroShotImg" || imgId === "showcaseShotImg") return;
      if (imgEl.closest(".landingHeroPhone") || imgEl.closest("#showcase")) return;

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

  // Sticky showcase: click-driven, and synced with hero + page theme.
  const showcaseSteps = $$("[data-showcase-step][data-showcase-src]");
  const showcaseImg = document.getElementById("showcaseShotImg");

  const setShowcaseShot = (stepEl) => {
    if (!showcaseImg || !stepEl) return;
    const src = stepEl.getAttribute("data-showcase-src");
    const title = stepEl.getAttribute("data-showcase-title") || "Screenshot";
    if (!src) return;
    fadeSwapShot(showcaseImg, src, (el) => {
      el.setAttribute("alt", title);
      el.setAttribute("data-shot-title", title);
    });
  };

  if (showcaseSteps.length > 0 && showcaseImg && heroRotatorImg && heroShots.length > 0) {
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

      setShowcaseShot(activeStep);
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

  if (appPartSteps.length > 0 && appPartImg) {
    const setAppPart = (stepEl) => {
      if (!stepEl) return;
      const src = stepEl.getAttribute("data-app-src");
      const title = stepEl.getAttribute("data-app-title") || "App part";
      const isComingSoon = stepEl.getAttribute("data-app-coming-soon") === "true";

      appPartSteps.forEach((el) => {
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

      emitAnalyticsEvent("app_part_select", {
        app_part: (stepEl.getAttribute("data-app-part") || "").toLowerCase(),
        coming_soon: isComingSoon
      });
    };

    setAppPart(appPartSteps[0]);

    appPartSteps.forEach((stepEl) => {
      stepEl.addEventListener("click", () => setAppPart(stepEl));
      stepEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          setAppPart(stepEl);
        }
      });
    });
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
      document.querySelector('a[href*="app-store"]')?.getAttribute("href") ||
      "https://example.com/app-store-link";
    const testFlightHref =
      document.querySelector('a[href*="testflight.apple.com"]')?.getAttribute("href") ||
      "https://testflight.apple.com/join/REPLACE_ME";

    const bar = document.createElement("div");
    bar.id = "mobileStickyCta";
    bar.className = "mobileStickyCta";
    bar.innerHTML = `
      <a class="mobileStickyBtn primary" href="${appStoreHref}" target="_blank" rel="noopener noreferrer">App Store</a>
      <a class="mobileStickyBtn" href="${testFlightHref}" target="_blank" rel="noopener noreferrer">TestFlight</a>
    `;
    document.body.appendChild(bar);
  }

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

