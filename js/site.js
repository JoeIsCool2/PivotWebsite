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
      const nav = document.querySelector("header.nav");
      const navH = nav ? nav.getBoundingClientRect().height : 0;
      const targetRect = target.getBoundingClientRect();
      const y = window.scrollY + targetRect.top - (navH + 10);
      window.scrollTo({ top: y, behavior: "smooth" });
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

  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

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
      const rotateMs = 5200;
      const fadeMs = 340;
      window.setInterval(() => {
        const next = (i + 1) % heroShots.length;
        heroRotatorImg.classList.add("is-switching");
        window.setTimeout(() => {
          // Swap while fully faded out.
          setHeroShot(heroShots[next]);
          i = next;
          // Let the browser paint the new src before fading back in.
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              heroRotatorImg.classList.remove("is-switching");
            });
          });
        }, fadeMs);
      }, rotateMs);
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

    let activeShowcaseStepKey = first ? (first.getAttribute("data-showcase-step") || "").toLowerCase() : null;

    const showcaseWrap = document.getElementById("showcase") || showcaseSteps[0].closest(".showcase");

    const activateShowcaseStep = (stepEl) => {
      if (!stepEl) return;
      const stepKey = (stepEl.getAttribute("data-showcase-step") || "").toLowerCase();
      if (stepKey && stepKey === activeShowcaseStepKey) return;

      activeShowcaseStepKey = stepKey;

      showcaseSteps.forEach((el) => {
        el.classList.remove("is-active");
        el.setAttribute("aria-pressed", "false");
      });

      stepEl.classList.add("is-active");
      stepEl.setAttribute("aria-pressed", "true");
      setShowcaseShot(stepEl);

      if (showcaseWrap) {
        // no-op: showcase is click-driven only
      }
    };

    showcaseSteps.forEach((stepEl) => {
      stepEl.addEventListener("click", () => activateShowcaseStep(stepEl));
      stepEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          activateShowcaseStep(stepEl);
        }
      });
    });
  }

})();

