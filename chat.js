/*
  Mama Anthem / tawk.to integration
  Public widget IDs only — no secret keys.
*/
const ANTHEM_CHAT_CONFIG = {
  propertyId: "6a99b9a1ce478f34475b72aa",
  widgetId: "1k1k7q8aa"
};

(function () {
  const configured =
    ANTHEM_CHAT_CONFIG.propertyId.trim() !== "" &&
    ANTHEM_CHAT_CONFIG.widgetId.trim() !== "";

  function apiReady(method) {
    return !!(
      configured &&
      window.Tawk_API &&
      typeof window.Tawk_API[method] === "function"
    );
  }

  function waitFor(method, timeoutMs = 9000) {
    return new Promise(resolve => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (apiReady(method)) {
          clearInterval(timer);
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, 120);
    });
  }

  window.AnthemChat = {
    configured,
    apiReady,
    waitFor,

    open() {
      if (!configured || !window.Tawk_API) return false;

      if (typeof window.Tawk_API.maximize === "function") {
        window.Tawk_API.maximize();
        return true;
      }
      if (typeof window.Tawk_API.toggle === "function") {
        window.Tawk_API.toggle();
        return true;
      }
      return false;
    },

    async openWhenReady() {
      const ready = await waitFor("maximize", 9000);
      if (ready) return window.AnthemChat.open();

      const toggleReady = await waitFor("toggle", 1200);
      if (toggleReady) return window.AnthemChat.open();

      return false;
    }
  };

  if (!configured) {
    document.documentElement.classList.add("anthem-chat-not-configured");
    return;
  }

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  const previousOnLoad = window.Tawk_API.onLoad;
  window.Tawk_API.onLoad = function () {
    document.documentElement.classList.add("anthem-chat-ready");
    if (typeof previousOnLoad === "function") previousOnLoad();
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

  // No second floating launcher is created here.
  // The native tawk.to bubble is the single floating chat control.
})();
