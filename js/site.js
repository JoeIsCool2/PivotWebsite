(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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
      target.scrollIntoView({ behavior: "smooth", block: "start" });
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
        if (status) status.textContent = "Opening your email app…";
        return;
      }

      // Otherwise, submit normally (third-party endpoint / Formspree-like).
      if (status) status.textContent = "Sending…";
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

  // Auto-cycle the hero phone preview (Focus -> Vent -> Move -> Journal -> Pro)
  // This is intentionally subtle and disabled when the user prefers reduced motion.
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const heroRotateMs = 4300;
  let heroRotationTimer = null;

  const setHeroShot = (shotEl) => {
    if (!heroRotatorImg || !shotEl) return;
    const src = shotEl.getAttribute("data-hero-shot-src");
    const title = shotEl.getAttribute("data-hero-shot-title") || "Screenshot";
    if (!src) return;
    heroRotatorImg.src = src;
    heroRotatorImg.setAttribute("alt", title);
    heroRotatorImg.setAttribute("data-shot-title", title);
  };

  if (heroRotatorImg && heroShots.length > 0) {
    // Initialize to the first shot for deterministic render.
    setHeroShot(heroShots[0]);

    const shouldRotate = !prefersReducedMotion && heroShots.length > 1;
    if (shouldRotate) {
      let i = 0;
      heroRotationTimer = window.setInterval(() => {
        i = (i + 1) % heroShots.length;
        setHeroShot(heroShots[i]);
      }, heroRotateMs);
    }
  }

  // Sticky showcase: as each step scrolls into view, update the sticky phone.
  const showcaseSteps = $$("[data-showcase-step][data-showcase-src]");
  const showcaseImg = document.getElementById("showcaseShotImg");

  const setShowcaseShot = (stepEl) => {
    if (!showcaseImg || !stepEl) return;
    const src = stepEl.getAttribute("data-showcase-src");
    const title = stepEl.getAttribute("data-showcase-title") || "Screenshot";
    if (!src) return;
    showcaseImg.src = src;
    showcaseImg.setAttribute("alt", title);
    showcaseImg.setAttribute("data-shot-title", title);
  };

  if (showcaseSteps.length > 0 && showcaseImg) {
    // Ensure deterministic initial state.
    const first = showcaseSteps.find((el) => (el.getAttribute("data-showcase-step") || "").toLowerCase() === "focus") || showcaseSteps[0];
    showcaseSteps.forEach((el) => el.classList.remove("is-active"));
    if (first) {
      first.classList.add("is-active");
      setShowcaseShot(first);
    }

    // Pause hero rotation when the user is actively viewing the showcase.
    const showcaseWrap = document.getElementById("showcase") || showcaseSteps[0].closest(".showcase");
    const pauseRotation = () => {
      if (!heroRotationTimer) return;
      if (heroRotationTimer) {
        window.clearInterval(heroRotationTimer);
        heroRotationTimer = null;
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));

        if (visible.length === 0) return;

        const best = visible[0].target;
        showcaseSteps.forEach((el) => el.classList.remove("is-active"));
        best.classList.add("is-active");
        setShowcaseShot(best);

        if (showcaseWrap && heroRotationTimer) {
          pauseRotation();
        }
      },
      {
        threshold: [0.18, 0.33, 0.5, 0.66],
        rootMargin: "-10% 0px -55% 0px",
      }
    );

    showcaseSteps.forEach((s) => io.observe(s));
  }

  // Footer QR code: use a simple QR API so the page is still static (no build step).
  // QR content points at the App Store placeholder URL until you replace it.
  const qrCodeImg = document.getElementById("qrCode");
  if (qrCodeImg) {
    const qrBlock = qrCodeImg.closest(".qrBlock");
    const qrData = (qrBlock && qrBlock.getAttribute("data-qr-url")) || "";
    if (qrData) {
      const size = 210;
      const encoded = encodeURIComponent(qrData);
      qrCodeImg.src = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}`;
    }
  }
})();

