// Blog pages (server se bane HTML) ke header ke buttons: dark/light theme aur mobile menu.
// React wale header jaisa hi kaam karta hai. Alag file isliye hai ke server ki CSP inline script nahi chalne deti.
(function () {
  var root = document.documentElement;

  // ---- Theme (React app jaisi hi "theme" key localStorage mein) ----
  var themeButton = document.getElementById("theme-toggle");
  function syncThemeLabel() {
    if (!themeButton) return;
    var dark = root.classList.contains("dark");
    themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  syncThemeLabel();
  if (themeButton) {
    themeButton.addEventListener("click", function () {
      var dark = !root.classList.contains("dark");
      root.classList.toggle("dark", dark);
      try {
        localStorage.setItem("theme", dark ? "dark" : "light");
      } catch (e) {
        // storage band hai: theme sirf is page tak rahegi
      }
      syncThemeLabel();
    });
  }

  // ---- Mobile menu ----
  var menuButton = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");
  if (!menuButton || !menu) return;

  var previousOverflow = "";

  function setMenu(open) {
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menuButton.classList.toggle("is-open", open);
    if (open) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      var first = menu.querySelector("a");
      if (first) first.focus();
    } else {
      document.body.style.overflow = previousOverflow;
    }
  }

  menuButton.addEventListener("click", function () {
    setMenu(menu.hidden);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) {
      setMenu(false);
      menuButton.focus();
    }
  });

  var wide = window.matchMedia("(min-width: 768px)");
  wide.addEventListener("change", function (e) {
    if (e.matches && !menu.hidden) setMenu(false);
  });
})();
