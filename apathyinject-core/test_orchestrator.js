const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log("  ✗ FAIL:", m); } };

// 1. JSON validity
const kb = JSON.parse(fs.readFileSync(path.join(ROOT,"knowledge_base.json"),"utf8"));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT,"themes_config.json"),"utf8"));
const man = JSON.parse(fs.readFileSync(path.join(ROOT,"manifest.json"),"utf8"));
console.log("JSON files parse OK");

// 2. theme files exist + pointer-events none
ok(cfg.themes.length === 12, "expected 12 themes, got "+cfg.themes.length);
for (const t of cfg.themes) {
  const p = path.join(ROOT, t.file);
  ok(fs.existsSync(p), "missing theme file "+t.file);
  if (fs.existsSync(p)) {
    const css = fs.readFileSync(p,"utf8");
    ok(/pointer-events\s*:\s*none/i.test(css), t.id+": missing pointer-events:none");
    ok(/prefers-reduced-motion/i.test(css), t.id+": missing reduced-motion guard");
  }
}

// 3. orchestrator answers
const { createOrchestrator } = require(path.join(ROOT,"shared/orchestrator.js"));
const themeNames = cfg.themes.map(t=>t.emoji+" "+t.name).join(", ");
const orch = createOrchestrator(kb, { VERSION: man.version, THEMES: themeNames, THEME_COUNT: cfg.themes.length, URL: "https://example.com" });

const cases = [
  ["quem é você?", "identity"],
  ["o que você faz?", "capabilities"],
  ["o que é o AIC", "about_aic"],
  ["como funciona a injeção?", "how_it_works"],
  ["quais temas existem?", "themes_list"],
  ["oi", "greeting"],
  ["help", "help"],
  ["> clear", "cmd_clear"],
  ["clear", "cmd_clear"],
  ["qual a previsão do tempo?", "blocked"],
  ["me escreve um poema", "blocked"],
  ["asdkjfhaskjdf", "fallback"],
  ["quem te criou?", "creator"],
  ["como instalar?", "install"],
  ["é seguro? coleta dados?", "privacy"],
  ["qual a versão?", "version"],
];
console.log("\nOrchestrator responses:");
for (const [q, expect] of cases) {
  const r = orch.respond(q);
  const got = r.command ? ("cmd_"+r.command) : r.id;
  ok(got === expect, `"${q}" → expected ${expect}, got ${got}`);
  console.log(`  ${got===expect?"✓":"✗"} "${q}" → ${got}`);
}

// 4. THEMES/COUNT interpolation actually filled
const tl = orch.respond("quais temas existem");
ok(!/\{\{/.test(tl.text), "themes_list left an un-interpolated {{...}}");
ok(/12 temas/.test(tl.text), "themes_list count not interpolated");
const id = orch.respond("quem é você");
ok(!/\{\{/.test(id.text), "identity left {{...}}");

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
