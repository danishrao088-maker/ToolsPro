// Page dikhne se PEHLE theme lagao, taake dark mode mein safed flash na aaye.
// Ye alag file isliye hai ke server ki CSP (script-src 'self') inline script ko rok deti hai.
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
