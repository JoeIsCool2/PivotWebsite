(function () {
  "use strict";
  var o = typeof window.PIVOT_ORIGIN === "string" ? window.PIVOT_ORIGIN.trim() : "";
  if (!o) return;
  o = o.replace(/\/$/, "");
  function setMeta(sel, attr, val) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  }
  setMeta('meta[property="og:url"]', "content", o + "/");
  setMeta('meta[property="og:image"]', "content", o + "/assets/app-icon.png");
  setMeta('meta[name="twitter:image"]', "content", o + "/assets/app-icon.png");
  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", o + "/");
})();
