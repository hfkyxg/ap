/*
 * AIC :: Service Worker
 * Responsável pelo atalho global (Alt+Shift+A) e pela auto-injeção
 * baseada nas regras de white/black-list (Fase 3).
 */
importScripts("shared/injector.js");

// Atalho global: alterna o último tema usado na aba ativa, sem abrir o painel.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-last-theme") return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || AICInjector.isRestrictedUrl(tab.url)) return;
    await AICInjector.toggleLastTheme(tab.id);
  } catch (err) {
    // Abas restritas ou fechadas no meio do caminho: falha silenciosa por design.
    console.warn("AIC :: toggle abortado:", err.message);
  }
});

// Navegação real descarta o CSS injetado; o estado da aba acompanha.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === "loading" && changeInfo.url) {
      await AICInjector.clearTabState(tabId);
    }
    if (changeInfo.status === "complete" && tab && tab.url) {
      const current = await AICInjector.getTabState(tabId);
      if (!current) {
        await AICInjector.autoInjectForUrl(tabId, tab.url);
      }
    }
  } catch (err) {
    console.warn("AIC :: auto-injeção abortada:", err.message);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    await AICInjector.clearTabState(tabId);
  } catch (err) {
    // Sessão pode já ter sido limpa; irrelevante.
  }
});
