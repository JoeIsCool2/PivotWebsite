(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Hero carousel */
  var slides = document.querySelectorAll("[data-carousel-slide]");
  var dots = document.querySelectorAll("[data-carousel-dot]");
  var live = document.getElementById("carousel-live");
  var index = 0;
  var timer;

  function setSlide(i) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    slides.forEach(function (img, j) {
      img.classList.toggle("is-active", j === index);
      img.setAttribute("aria-hidden", j === index ? "false" : "true");
    });
    dots.forEach(function (btn, j) {
      btn.setAttribute("aria-selected", j === index ? "true" : "false");
    });
    if (live && slides[index]) {
      live.textContent = "Showing slide " + (index + 1) + " of " + slides.length;
    }
  }

  function next() {
    setSlide(index + 1);
  }

  function startAuto() {
    if (reducedMotion || slides.length < 2) return;
    stopAuto();
    timer = window.setInterval(next, 4800);
  }

  function stopAuto() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  dots.forEach(function (btn, j) {
    btn.addEventListener("click", function () {
      setSlide(j);
      stopAuto();
      startAuto();
    });
  });

  var device = document.querySelector(".device-frame");
  if (device) {
    device.addEventListener("mouseenter", stopAuto);
    device.addEventListener("mouseleave", startAuto);
    device.addEventListener("focusin", stopAuto);
    device.addEventListener("focusout", startAuto);
  }

  setSlide(0);
  startAuto();

  /* Scroll reveal */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach(function (el) {
      if (reducedMotion) el.classList.add("is-visible");
      else obs.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Sticky header shadow after scroll */
  var header = document.querySelector(".site-header");
  if (header) {
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
