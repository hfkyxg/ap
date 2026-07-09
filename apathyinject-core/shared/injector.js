/*
 * AIC :: Vetor de Injeção (compartilhado entre popup e service worker)
 * Lazy loading: apenas o CSS do tema escolhido entra no documento.
 * Estado por aba vive em chrome.storage.session; nada sai da máquina.
 * UMD: as funções puras (isRestrictedUrl, matchesPattern) também rodam em Node.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AICInjector = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var hasChrome =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL;

  // ── Funções puras ────────────────────────────────────────────────

  // Extensões não têm permissão em páginas internas do navegador.
  function isRestrictedUrl(url) {
    if (!url) return true;
    if (!/^(https?|file):/i.test(url)) return true;
    if (/^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url)) {
      return true;
    }
    return false;
  }

  // Regras de auto-injeção: correspondência por substring, sem regex do usuário.
  function matchesPattern(url, pattern) {
    if (!url || !pattern) return false;
    return url.toLowerCase().indexOf(String(pattern).toLowerCase().trim()) !== -1;
  }

  // Perfis de intensidade → variáveis CSS lidas pelos temas.
  var INTENSITY_PROFILES = {
    eco: "html{--aic-alpha:0.45 !important;--aic-speed:0.6 !important;}",
    padrao: null,
    brutal: "html{--aic-alpha:1 !important;--aic-speed:1.7 !important;}",
  };

  function intensityCss(level) {
    return INTENSITY_PROFILES[level] || null;
  }

  if (!hasChrome) {
    // Ambiente Node (testes): expõe apenas o que não depende do chrome.*
    return {
      isRestrictedUrl: isRestrictedUrl,
      matchesPattern: matchesPattern,
      intensityCss: intensityCss,
    };
  }

  // ── Camada chrome.* ──────────────────────────────────────────────

  var configCache = null;

  async function loadThemesConfig() {
    if (!configCache) {
      var res = await fetch(chrome.runtime.getURL("themes_config.json"));
      configCache = await res.json();
    }
    return configCache;
  }

  async function getCustomThemes() {
    var data = await chrome.storage.local.get("aic_custom_themes");
    return data.aic_custom_themes || [];
  }

  async function saveCustomThemes(list) {
    await chrome.storage.local.set({ aic_custom_themes: list });
  }

  async function getRules() {
    var data = await chrome.storage.local.get("aic_rules");
    return data.aic_rules || [];
  }

  async function saveRules(rules) {
    await chrome.storage.local.set({ aic_rules: rules });
  }

  async function getIntensity() {
    var data = await chrome.storage.local.get("aic_intensity");
    return data.aic_intensity || "padrao";
  }

  async function setIntensity(level) {
    await chrome.storage.local.set({ aic_intensity: level });
  }

  async function getLastTheme() {
    var data = await chrome.storage.local.get("aic_last_theme");
    return data.aic_last_theme || null;
  }

  // themeRef: { type: "builtin"|"custom", id }
  // Resolve para { type, id, name, emoji, accent, file? , css? }
  async function resolveTheme(themeRef) {
    if (!themeRef) return null;
    if (themeRef.type === "custom") {
      var customs = await getCustomThemes();
      var custom = customs.find(function (t) { return t.id === themeRef.id; });
      return custom
        ? { type: "custom", id: custom.id, name: custom.name, emoji: "🧪", accent: "#00ff9c", css: custom.css }
        : null;
    }
    var config = await loadThemesConfig();
    var theme = config.themes.find(function (t) { return t.id === themeRef.id; });
    return theme
      ? { type: "builtin", id: theme.id, name: theme.name, emoji: theme.emoji, accent: theme.accent, file: theme.file }
      : null;
  }

  function tabKey(tabId) {
    return "aic_tab_" + tabId;
  }

  async function getTabState(tabId) {
    var data = await chrome.storage.session.get(tabKey(tabId));
    return data[tabKey(tabId)] || null;
  }

  async function setTabState(tabId, state) {
    var patch = {};
    patch[tabKey(tabId)] = state;
    await chrome.storage.session.set(patch);
  }

  async function clearTabState(tabId) {
    await chrome.storage.session.remove(tabKey(tabId));
  }

  // Expurgo: remove tudo que o AIC injetou na aba, com fallback defensivo
  // para o catálogo inteiro (removeCSS de arquivo não injetado é inofensivo).
  async function clearTab(tabId) {
    var state = await getTabState(tabId);
    var target = { tabId: tabId };
    var jobs = [];

    if (state) {
      if (state.files) {
        jobs.push(chrome.scripting.removeCSS({ target: target, files: state.files }));
      }
      if (state.css) {
        jobs.push(chrome.scripting.removeCSS({ target: target, css: state.css }));
      }
      if (state.override) {
        jobs.push(chrome.scripting.removeCSS({ target: target, css: state.override }));
      }
    }

    var config = await loadThemesConfig();
    config.themes.forEach(function (theme) {
      jobs.push(chrome.scripting.removeCSS({ target: target, files: [theme.file] }));
    });

    await Promise.allSettled(jobs);
    await clearTabState(tabId);
  }

  // Injeção cirúrgica: expurga o estado anterior e insere apenas o tema pedido.
  async function applyToTab(tabId, themeRef, opts) {
    opts = opts || {};
    var theme = await resolveTheme(themeRef);
    if (!theme) throw new Error("AIC: tema não encontrado (" + JSON.stringify(themeRef) + ")");

    await clearTab(tabId);

    var target = { tabId: tabId };
    var state = { type: theme.type, id: theme.id, name: theme.name };

    if (theme.file) {
      await chrome.scripting.insertCSS({ target: target, files: [theme.file] });
      state.files = [theme.file];
    } else if (theme.css) {
      await chrome.scripting.insertCSS({ target: target, css: theme.css });
      state.css = theme.css;
    }

    var intensity = opts.intensity || (await getIntensity());
    var override = intensityCss(intensity);
    if (override) {
      await chrome.scripting.insertCSS({ target: target, css: override });
      state.override = override;
    }

    await setTabState(tabId, state);
    if (!opts.skipLastTheme) {
      await chrome.storage.local.set({
        aic_last_theme: { type: theme.type, id: theme.id },
      });
    }
    return theme;
  }

  // Atalho global: alterna o último tema usado na aba ativa.
  async function toggleLastTheme(tabId) {
    var state = await getTabState(tabId);
    if (state) {
      await clearTab(tabId);
      return { toggled: "off", theme: state };
    }
    var last = await getLastTheme();
    if (!last) return { toggled: "none" };
    var theme = await applyToTab(tabId, last);
    return { toggled: "on", theme: theme };
  }

  // Auto-injeção (Fase 3): BLOCK tem precedência absoluta sobre ALLOW.
  async function autoInjectForUrl(tabId, url) {
    if (isRestrictedUrl(url)) return null;
    var rules = await getRules();
    if (!rules.length) return null;

    var isBlocked = rules.some(function (rule) {
      return rule.mode === "block" && matchesPattern(url, rule.pattern);
    });
    if (isBlocked) return null;

    var allow = rules.find(function (rule) {
      return rule.mode === "allow" && matchesPattern(url, rule.pattern);
    });
    if (!allow || !allow.theme) return null;

    var theme = await applyToTab(tabId, allow.theme, { skipLastTheme: true });
    return theme;
  }

  return {
    isRestrictedUrl: isRestrictedUrl,
    matchesPattern: matchesPattern,
    intensityCss: intensityCss,
    loadThemesConfig: loadThemesConfig,
    getCustomThemes: getCustomThemes,
    saveCustomThemes: saveCustomThemes,
    getRules: getRules,
    saveRules: saveRules,
    getIntensity: getIntensity,
    setIntensity: setIntensity,
    getLastTheme: getLastTheme,
    resolveTheme: resolveTheme,
    getTabState: getTabState,
    setTabState: setTabState,
    clearTabState: clearTabState,
    clearTab: clearTab,
    applyToTab: applyToTab,
    toggleLastTheme: toggleLastTheme,
    autoInjectForUrl: autoInjectForUrl,
  };
});
