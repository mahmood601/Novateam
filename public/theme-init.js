// يُحمَّل في <head> قبل أي رسم ليضبط الثيم دون وميض.
// هو ملف خارجي (لا سكربت مضمَّن) كي يعمل script-src 'self' بلا 'unsafe-inline'.
(function () {
  var theme = "light";
  try { theme = localStorage.getItem("theme") || "light"; } catch (e) {}
  var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();
