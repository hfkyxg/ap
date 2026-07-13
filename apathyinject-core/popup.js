/*
 * AIC :: NihilUI — lógica do painel
 * Grid de injetores JSON-driven, Custom Builder, regras de auto-injeção
 * e Orquestrador Terminal (regex gatekeeper).
 */
(function () {
  "use strict";

  var VERSION = chrome.runtime.getManifest().version;

  var state = {
    tab: null,
    restricted: true,
    config: null,
    orchestrator: null,
    kb: null,
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  // ── Toast (feedback visual de injeção) ─────────────────────────

  function toast(message, isError) {
    var el = document.createElement("div");
    el.className = "toast" + (isError ? " error" : "");
    el.textContent = message;
    $("#toast-zone").appendChild(el);
    setTimeout(function () { el.remove(); }, 2700);
  }

  // ── Terminal ────────────────────────────────────────────────────

  var TERM_HISTORY_KEY = "aic_term_history";

  function termAppend(role, text, options) {
    options = options || {};
    var line = document.createElement("div");
    line.className = "term-line " + role + (options.alert ? " alert" : "");
    var log = $("#term-log");
    log.appendChild(line);

    if (options.instant || role === "user") {
      line.textContent = text;
      log.scrollTop = log.scrollHeight;
      return;
    }

    // Efeito de digitação: o Orquestrador "imprime" a resposta.
    var i = 0;
    var timer = setInterval(function () {
      i += 3;
      line.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      if (i >= text.length) clearInterval(timer);
    }, 8);
  }

  async function termPersist(role, text) {
    var data = await chrome.storage.session.get(TERM_HISTORY_KEY);
    var history = data[TERM_HISTORY_KEY] || [];
    history.push({ role: role, text: text });
    if (history.length > 80) history = history.slice(-80);
    var patch = {};
    patch[TERM_HISTORY_KEY] = history;
    await chrome.storage.session.set(patch);
  }

  async function termClearHistory() {
    await chrome.storage.session.remove(TERM_HISTORY_KEY);
    $("#term-log").innerHTML = "";
  }

  async function termRestore() {
    var data = await chrome.storage.session.get(TERM_HISTORY_KEY);
    var history = data[TERM_HISTORY_KEY] || [];
    history.forEach(function (msg) {
      termAppend(msg.role, msg.text, { instant: true });
    });
    return history.length > 0;
  }

  async function handleTermInput(raw) {
    var text = String(raw || "").trim();
    if (!text) return;
    termAppend("user", text);
    await termPersist("user", text);

    var reply = state.orchestrator.respond(text);

    if (reply.command === "clear") {
      await termClearHistory();
      termAppend("system", reply.text, { instant: true });
      return;
    }

    termAppend("system", reply.text, { alert: reply.id === "blocked" });
    await termPersist("system", reply.text);
  }

  // ── Grid de injetores (JSON-driven) ─────────────────────────────

  async function renderThemeGrid() {
    var grid = $("#theme-grid");
    grid.innerHTML = "";
    var results = await Promise.all([
      state.tab && !state.restricted ? AICInjector.getTabState(state.tab.id) : null,
      AICInjector.getFavorites(),
    ]);
    var active = results[0];
    var favorites = results[1];

    // Favoritos primeiro, mantendo a ordem do catálogo dentro de cada grupo.
    var ordered = state.config.themes.slice().sort(function (a, b) {
      var favA = favorites.indexOf(a.id) !== -1 ? 0 : 1;
      var favB = favorites.indexOf(b.id) !== -1 ? 0 : 1;
      return favA - favB;
    });
    state.gridOrder = ordered;

    ordered.forEach(function (theme) {
      var isFav = favorites.indexOf(theme.id) !== -1;
      var btn = document.createElement("button");
      btn.className = "theme-btn" + (isFav ? " faved" : "");
      btn.style.setProperty("--accent", theme.accent);
      btn.title = theme.description || theme.name;
      btn.disabled = state.restricted;
      if (active && active.type === "builtin" && active.id === theme.id) {
        btn.classList.add("injected");
      }
      var emoji = document.createElement("span");
      emoji.className = "theme-emoji";
      emoji.textContent = theme.emoji;
      var name = document.createElement("span");
      name.className = "theme-name";
      name.textContent = theme.name;

      // Estrela de favorito: clique não injeta, só marca/desmarca.
      var star = document.createElement("span");
      star.className = "fav-star" + (isFav ? " faved" : "");
      star.textContent = isFav ? "★" : "☆";
      star.title = isFav ? "Remover dos favoritos" : "Favoritar tema";
      star.addEventListener("click", function (event) {
        event.stopPropagation();
        AICInjector.toggleFavorite(theme.id).then(function () {
          renderThemeGrid();
        });
      });

      btn.appendChild(star);
      btn.appendChild(emoji);
      btn.appendChild(name);
      btn.addEventListener("click", function () {
        injectTheme({ type: "builtin", id: theme.id });
      });
      grid.appendChild(btn);
    });
  }

  async function injectTheme(themeRef) {
    if (state.restricted) return;
    try {
      var theme = await AICInjector.applyToTab(state.tab.id, themeRef);
      toast(theme.emoji + " INJETADO :: " + theme.name.toUpperCase());
      await renderThemeGrid();
      await renderCustomList();
    } catch (err) {
      toast("FALHA NA INJEÇÃO :: " + err.message, true);
    }
  }

  async function clearState() {
    if (state.restricted) return;
    try {
      await AICInjector.clearTab(state.tab.id);
      toast("⌫ DOM EXPURGADO :: estado original restaurado");
      await renderThemeGrid();
      await renderCustomList();
    } catch (err) {
      toast("FALHA NO EXPURGO :: " + err.message, true);
    }
  }

  // ── Intensidade ─────────────────────────────────────────────────

  async function renderIntensity() {
    var level = await AICInjector.getIntensity();
    $$(".intensity-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.level === level);
    });
  }

  async function setIntensity(level) {
    await AICInjector.setIntensity(level);
    await renderIntensity();
    // Reaplica na hora se houver tema ativo na aba.
    if (!state.restricted) {
      var active = await AICInjector.getTabState(state.tab.id);
      if (active) {
        await AICInjector.applyToTab(state.tab.id, { type: active.type, id: active.id });
        toast("INTENSIDADE :: " + level.toUpperCase() + " aplicada");
        return;
      }
    }
    toast("INTENSIDADE :: " + level.toUpperCase());
  }

  // ── Custom Builder (Fase 3) ─────────────────────────────────────

  var CSS_TEMPLATE = [
    "/* ══════════════════════════════════════════════",
    "   AIC CUSTOM THEME :: TEMPLATE COMPLETO",
    "   Regras de ouro do Protocolo Fantasma:",
    "   1. pointer-events: none em TUDO (cliques atravessam)",
    "   2. máx. ~100 partículas via box-shadow",
    "   3. anime apenas transform/opacity (GPU)",
    "   4. z-index alto para vencer qualquer site",
    "   ══════════════════════════════════════════════ */",
    "",
    "/* Camada 1: partículas caindo (pontos via box-shadow) */",
    "html::before {",
    "  content: \"\";",
    "  position: fixed;",
    "  top: -10vh; left: 0;",
    "  width: 7px; height: 7px;",
    "  border-radius: 50%;",
    "  background: transparent;",
    "  pointer-events: none !important;",
    "  z-index: 2147483646;",
    "  opacity: calc(0.9 * var(--aic-alpha, 1));",
    "  box-shadow:",
    "    4vw  -5vh  0 0 #00ff9c,  18vw -32vh 0 1px #00ff9c,",
    "    31vw -12vh 0 0 #ff00e6,  44vw -48vh 0 2px #00ff9c,",
    "    57vw -22vh 0 0 #00ff9c,  69vw -60vh 0 1px #ff00e6,",
    "    78vw -38vh 0 0 #00ff9c,  88vw -8vh  0 2px #00ff9c,",
    "    95vw -52vh 0 1px #ff00e6, 12vw -70vh 0 0 #00ff9c,",
    "    50vw -80vh 0 1px #00ff9c, 83vw -90vh 0 0 #ff00e6;",
    "  animation: aic-custom-fall calc(9s / var(--aic-speed, 1)) linear infinite;",
    "}",
    "",
    "/* Camada 2: vinheta/tint atmosférico */",
    "html::after {",
    "  content: \"\";",
    "  position: fixed;",
    "  inset: 0;",
    "  pointer-events: none !important;",
    "  z-index: 2147483645;",
    "  opacity: calc(0.5 * var(--aic-alpha, 1));",
    "  background:",
    "    radial-gradient(ellipse at 50% 120%, rgba(0,255,156,0.18), transparent 60%),",
    "    radial-gradient(ellipse at 50% -20%, rgba(255,0,230,0.12), transparent 55%);",
    "}",
    "",
    "@keyframes aic-custom-fall {",
    "  to { transform: translateY(120vh); }",
    "}",
    "",
    "/* Acessibilidade: respeita quem pediu menos movimento */",
    "@media (prefers-reduced-motion: reduce) {",
    "  html::before, html::after { animation: none !important; }",
    "}",
  ].join("\n");

  function slugify(name) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function saveCustomTheme() {
    var name = $("#custom-name").value.trim();
    var css = $("#custom-css").value.trim();
    if (!name) { toast("NOME AUSENTE :: batize seu tema", true); return; }
    if (!css) { toast("CSS AUSENTE :: nada a compilar", true); return; }
    if (!/pointer-events\s*:\s*none/i.test(css)) {
      toast("⚠ SEM pointer-events:none — cliques podem travar", true);
    }

    var customs = await AICInjector.getCustomThemes();
    var id = slugify(name) || "custom-" + Date.now();
    var existing = customs.findIndex(function (t) { return t.id === id; });
    var entry = { id: id, name: name, css: css, createdAt: Date.now() };
    if (existing >= 0) customs[existing] = entry;
    else customs.push(entry);

    await AICInjector.saveCustomThemes(customs);
    $("#custom-name").value = "";
    $("#custom-css").value = "";
    toast("💾 TEMA COMPILADO :: " + name.toUpperCase());
    await renderCustomList();
    await renderRuleThemeOptions();
  }

  async function renderCustomList() {
    var list = $("#custom-list");
    list.innerHTML = "";
    var customs = await AICInjector.getCustomThemes();
    var active = state.tab && !state.restricted
      ? await AICInjector.getTabState(state.tab.id)
      : null;

    if (!customs.length) {
      var note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = ":: nenhum tema customizado compilado ::";
      list.appendChild(note);
      return;
    }

    customs.forEach(function (theme) {
      var item = document.createElement("div");
      item.className = "list-item";

      var label = document.createElement("span");
      label.className = "item-label";
      var isActive = active && active.type === "custom" && active.id === theme.id;
      label.textContent = "🧪 " + theme.name + (isActive ? "  [ATIVO]" : "");

      var injectBtn = document.createElement("button");
      injectBtn.className = "mini-btn";
      injectBtn.textContent = "INJETAR";
      injectBtn.disabled = state.restricted;
      injectBtn.addEventListener("click", function () {
        injectTheme({ type: "custom", id: theme.id });
      });

      var editBtn = document.createElement("button");
      editBtn.className = "mini-btn";
      editBtn.textContent = "EDITAR";
      editBtn.addEventListener("click", function () {
        $("#custom-name").value = theme.name;
        $("#custom-css").value = theme.css;
        $("#custom-css").focus();
      });

      var removeBtn = document.createElement("button");
      removeBtn.className = "mini-btn remove";
      removeBtn.textContent = "✕";
      removeBtn.title = "Excluir tema";
      removeBtn.addEventListener("click", async function () {
        var customs2 = await AICInjector.getCustomThemes();
        await AICInjector.saveCustomThemes(
          customs2.filter(function (t) { return t.id !== theme.id; })
        );
        toast("EXPURGADO :: " + theme.name.toUpperCase());
        await renderCustomList();
        await renderRuleThemeOptions();
      });

      item.appendChild(label);
      item.appendChild(injectBtn);
      item.appendChild(editBtn);
      item.appendChild(removeBtn);
      list.appendChild(item);
    });
  }

  // ── Regras: white/black-list (Fase 3) ───────────────────────────

  async function renderRuleThemeOptions() {
    var select = $("#rule-theme");
    select.innerHTML = "";
    state.config.themes.forEach(function (theme) {
      var opt = document.createElement("option");
      opt.value = "builtin:" + theme.id;
      opt.textContent = theme.emoji + " " + theme.name;
      select.appendChild(opt);
    });
    var customs = await AICInjector.getCustomThemes();
    customs.forEach(function (theme) {
      var opt = document.createElement("option");
      opt.value = "custom:" + theme.id;
      opt.textContent = "🧪 " + theme.name;
      select.appendChild(opt);
    });
  }

  async function addRule() {
    var pattern = $("#rule-pattern").value.trim();
    var mode = $("#rule-mode").value;
    if (!pattern) { toast("PADRÃO AUSENTE :: informe um trecho de URL", true); return; }

    var rule = { id: "rule-" + Date.now(), pattern: pattern, mode: mode };
    if (mode === "allow") {
      var parts = $("#rule-theme").value.split(":");
      rule.theme = { type: parts[0], id: parts.slice(1).join(":") };
    }

    var rules = await AICInjector.getRules();
    rules.push(rule);
    await AICInjector.saveRules(rules);
    $("#rule-pattern").value = "";
    toast("REGRA GRAVADA :: " + mode.toUpperCase() + " " + pattern);
    await renderRulesList();
  }

  async function renderRulesList() {
    var list = $("#rules-list");
    list.innerHTML = "";
    var rules = await AICInjector.getRules();

    if (!rules.length) {
      var note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = ":: nenhuma regra de auto-injeção ::";
      list.appendChild(note);
      return;
    }

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var item = document.createElement("div");
      item.className = "list-item" + (rule.mode === "block" ? " block-rule" : "");

      var label = document.createElement("span");
      label.className = "item-label";
      var themeName = "";
      if (rule.theme) {
        var resolved = await AICInjector.resolveTheme(rule.theme);
        themeName = resolved ? " → " + resolved.name : " → (tema removido)";
      }
      label.textContent = rule.pattern;
      var sub = document.createElement("span");
      sub.className = "item-sub";
      sub.textContent = "  [" + rule.mode.toUpperCase() + themeName + "]";
      label.appendChild(sub);

      var removeBtn = document.createElement("button");
      removeBtn.className = "mini-btn remove";
      removeBtn.textContent = "✕";
      removeBtn.title = "Excluir regra";
      removeBtn.addEventListener("click", (function (ruleId) {
        return async function () {
          var rules2 = await AICInjector.getRules();
          await AICInjector.saveRules(
            rules2.filter(function (r) { return r.id !== ruleId; })
          );
          await renderRulesList();
        };
      })(rule.id));

      item.appendChild(label);
      item.appendChild(removeBtn);
      list.appendChild(item);
    }
  }

  // ── Abas ────────────────────────────────────────────────────────

  function initTabs() {
    $$(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".tab-btn").forEach(function (b) { b.classList.remove("active"); });
        $$(".panel").forEach(function (p) { p.classList.remove("active"); });
        btn.classList.add("active");
        $("#" + btn.dataset.panel).classList.add("active");
        if (btn.dataset.panel === "panel-term") $("#term-input").focus();
      });
    });
  }

  // ── Boot ────────────────────────────────────────────────────────

  async function boot() {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    state.tab = tabs[0] || null;
    state.restricted = !state.tab || AICInjector.isRestrictedUrl(state.tab.url);

    var results = await Promise.all([
      fetch(chrome.runtime.getURL("themes_config.json")).then(function (r) { return r.json(); }),
      fetch(chrome.runtime.getURL("knowledge_base.json")).then(function (r) { return r.json(); }),
    ]);
    state.config = results[0];
    state.kb = results[1];

    var themeNames = state.config.themes
      .map(function (t) { return t.emoji + " " + t.name; })
      .join(", ");
    state.orchestrator = AICOrchestrator.createOrchestrator(state.kb, {
      VERSION: VERSION,
      THEMES: themeNames,
      THEME_COUNT: state.config.themes.length,
      URL: state.tab && state.tab.url ? state.tab.url : "desconhecida",
    });

    // Barra do alvo + LED de status
    var hostEl = $("#host-url");
    if (state.restricted) {
      hostEl.textContent = (state.tab && state.tab.url ? state.tab.url : "aba interna") + "  [RESTRITA]";
      hostEl.classList.add("restricted");
      $("#status-led").classList.remove("led-ok");
      $("#status-led").classList.add("led-blocked");
      $("#btn-random").disabled = true;
      $("#btn-clear").disabled = true;
    } else {
      try {
        hostEl.textContent = new URL(state.tab.url).host;
      } catch (e) {
        hostEl.textContent = state.tab.url;
      }
      $("#rule-pattern").value = hostEl.textContent;
    }

    $("#version-tag").textContent = "v" + VERSION;

    initTabs();
    await renderThemeGrid();
    await renderIntensity();
    await renderCustomList();
    await renderRuleThemeOptions();
    await renderRulesList();

    // Terminal: restaura histórico da sessão ou imprime o boot.
    var restored = await termRestore();
    if (!restored) {
      termAppend("system", state.orchestrator.bootMessage, { instant: true });
    }
    if (state.restricted) {
      var notice = AICOrchestrator.interpolate(state.kb.restricted_notice, {
        URL: state.tab && state.tab.url ? state.tab.url : "aba interna",
      });
      termAppend("system", notice, { instant: true, alert: true });
    }

    // Eventos
    $("#btn-clear").addEventListener("click", clearState);
    $("#btn-random").addEventListener("click", function () {
      var themes = state.config.themes;
      var pick = themes[Math.floor(Math.random() * themes.length)];
      injectTheme({ type: "builtin", id: pick.id });
    });
    $$(".intensity-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setIntensity(btn.dataset.level); });
    });
    $("#btn-template").addEventListener("click", function () {
      $("#custom-css").value = CSS_TEMPLATE;
      if (!$("#custom-name").value) $("#custom-name").value = "MEU TEMA";
      toast("⚙ TEMPLATE GERADO :: edite e salve");
    });
    $("#btn-save-custom").addEventListener("click", saveCustomTheme);
    $("#btn-add-rule").addEventListener("click", addRule);
    $("#rule-mode").addEventListener("change", function () {
      $("#rule-theme").disabled = $("#rule-mode").value === "block";
    });
    $("#term-input").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        var value = event.target.value;
        event.target.value = "";
        handleTermInput(value);
      }
    });

    // Navegação por teclado no grid: setas percorrem, Enter injeta,
    // 1–9 injetam direto, R sorteia, Backspace expurga.
    document.addEventListener("keydown", function (event) {
      var tag = (event.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (state.restricted) return;

      var buttons = $$("#theme-grid .theme-btn");
      if (!buttons.length) return;
      var focused = buttons.indexOf(document.activeElement);

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        buttons[(focused + 1 + buttons.length) % buttons.length].focus();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        buttons[(focused - 1 + buttons.length) % buttons.length].focus();
      } else if (event.key >= "1" && event.key <= "9") {
        var idx = parseInt(event.key, 10) - 1;
        var order = state.gridOrder || state.config.themes;
        var theme = order[idx];
        if (theme) injectTheme({ type: "builtin", id: theme.id });
      } else if (event.key === "r" || event.key === "R") {
        $("#btn-random").click();
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        clearState();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
