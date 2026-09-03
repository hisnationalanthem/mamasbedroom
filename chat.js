/*
  Mama Anthem live chat
  ---------------------
  To connect tawk.to, fill in the two values below.
  These IDs are public widget identifiers, not passwords or secret API keys.
*/
const ANTHEM_CHAT_CONFIG = {
  propertyId: "",
  widgetId: ""
};

(function () {
  const configured =
    ANTHEM_CHAT_CONFIG.propertyId.trim() !== "" &&
    ANTHEM_CHAT_CONFIG.widgetId.trim() !== "";

  window.AnthemChat = {
    configured,
    open() {
      if (!configured) return false;

      try {
        if (window.Tawk_API) {
          if (typeof window.Tawk_API.showWidget === "function") {
            window.Tawk_API.showWidget();
          }
          if (typeof window.Tawk_API.maximize === "function") {
            window.Tawk_API.maximize();
          } else if (typeof window.Tawk_API.toggle === "function") {
            window.Tawk_API.toggle();
          }
          return true;
        }
      } catch (error) {
        console.warn("Mama Anthem chat could not open:", error);
      }
      return false;
    }
  };

  if (!configured) {
    document.documentElement.classList.add("anthem-chat-not-configured");
    return;
  }

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  window.Tawk_API.onLoad = function () {
    document.documentElement.classList.add("anthem-chat-ready");
  };

  const script = document.createElement("script");
  script.async = true;
  script.src =
    "https://embed.tawk.to/" +
    encodeURIComponent(ANTHEM_CHAT_CONFIG.propertyId) +
    "/" +
    encodeURIComponent(ANTHEM_CHAT_CONFIG.widgetId);
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");

  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  // Branded secondary launcher. The normal tawk.to widget remains available too.
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "anthem-chat-launcher";
  launcher.setAttribute("aria-label", "Open live chat with Anthem");
  launcher.innerHTML = "<span aria-hidden='true'>†</span> Chat with Anthem";
  launcher.addEventListener("click", () => window.AnthemChat.open());
  document.body.appendChild(launcher);
})();
