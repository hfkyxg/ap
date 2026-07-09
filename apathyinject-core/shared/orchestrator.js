/*
 * AIC :: Orquestrador Terminal (Regex Gatekeeper)
 * Validação estrita de strings — sem LLM, sem rede, sem estado externo.
 * UMD: carregado como <script> no popup e via require() nos testes Node.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AICOrchestrator = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Normaliza a entrada para casar com os padrões da base:
  // minúsculas, sem acentos, pontuação vira espaço, espaços colapsados.
  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[!?.,;:"'´`’“”()\[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compile(patterns) {
    return (patterns || []).map(function (p) {
      return new RegExp(p, "i");
    });
  }

  function interpolate(text, vars) {
    return String(text).replace(/\{\{(\w+)\}\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vars, key)
        ? String(vars[key])
        : match;
    });
  }

  function createOrchestrator(knowledgeBase, vars) {
    if (!knowledgeBase || !Array.isArray(knowledgeBase.entries)) {
      throw new Error("AICOrchestrator: base de conhecimento inválida");
    }
    vars = vars || {};

    var commands = {};
    Object.keys(knowledgeBase.commands || {}).forEach(function (name) {
      commands[name] = compile(knowledgeBase.commands[name]);
    });

    var entries = knowledgeBase.entries.map(function (entry) {
      return {
        id: entry.id,
        regexes: compile(entry.patterns),
        answer: entry.answer,
      };
    });

    var blocked = compile(knowledgeBase.blocked_patterns);

    function respond(rawInput) {
      var input = normalize(rawInput);
      if (!input) {
        return { id: "empty", text: interpolate(knowledgeBase.fallback, vars) };
      }

      // 1. Comandos do terminal (ex: "clear" / "> clear")
      var commandNames = Object.keys(commands);
      for (var c = 0; c < commandNames.length; c++) {
        var name = commandNames[c];
        for (var i = 0; i < commands[name].length; i++) {
          if (commands[name][i].test(input)) {
            return {
              id: "cmd_" + name,
              command: name,
              text: interpolate(knowledgeBase.cleared || "", vars),
            };
          }
        }
      }

      // 2. Entradas mapeadas na documentação (primeiro padrão que casar vence)
      for (var e = 0; e < entries.length; e++) {
        for (var r = 0; r < entries[e].regexes.length; r++) {
          if (entries[e].regexes[r].test(input)) {
            return { id: entries[e].id, text: interpolate(entries[e].answer, vars) };
          }
        }
      }

      // 3. Fuga de escopo explícita → bloqueio ativo
      for (var b = 0; b < blocked.length; b++) {
        if (blocked[b].test(input)) {
          return { id: "blocked", text: interpolate(knowledgeBase.blocked, vars) };
        }
      }

      // 4. String desconhecida → fallback
      return { id: "fallback", text: interpolate(knowledgeBase.fallback, vars) };
    }

    return {
      respond: respond,
      bootMessage: interpolate(knowledgeBase.boot || "", vars),
    };
  }

  return {
    normalize: normalize,
    interpolate: interpolate,
    createOrchestrator: createOrchestrator,
  };
});
