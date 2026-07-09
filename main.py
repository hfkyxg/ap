"""
ApathyInject Core (AIC) — project entry point.

This repository is a Chrome MV3 extension. The extension lives in
apathyinject-core/. This file provides a CLI to inspect the project
and run the Node-based test suite without leaving the terminal.

Usage:
    python main.py            # project info + quick health check
    python main.py test       # run the orchestrator test suite
    python main.py themes     # list all 12 themes
    python main.py term       # interactive terminal (Orquestrador local)
"""

import json
import os
import re
import subprocess
import sys
import unicodedata

ROOT = os.path.join(os.path.dirname(__file__), "apathyinject-core")
CFG  = os.path.join(ROOT, "themes_config.json")
KB   = os.path.join(ROOT, "knowledge_base.json")
MAN  = os.path.join(ROOT, "manifest.json")


# ── Helpers ──────────────────────────────────────────────────────

def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _normalize(text: str) -> str:
    """Same normalization as orchestrator.js."""
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r'[!?.,;:"\'´`‘’“”()\[\]{}]', " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _compile(patterns):
    return [re.compile(p, re.IGNORECASE) for p in (patterns or [])]


# ── Orquestrador Python (espelho do orchestrator.js) ─────────────

def make_orchestrator():
    kb  = _load(KB)
    cfg = _load(CFG)
    man = _load(MAN)

    theme_names = ", ".join(f"{t['emoji']} {t['name']}" for t in cfg["themes"])
    vars_ = {
        "VERSION":     man["version"],
        "THEMES":      theme_names,
        "THEME_COUNT": str(len(cfg["themes"])),
        "URL":         "terminal local",
    }

    def interp(text):
        for k, v in vars_.items():
            text = text.replace("{{" + k + "}}", v)
        return text

    commands = {
        name: _compile(pats)
        for name, pats in kb.get("commands", {}).items()
    }
    entries = [
        {"id": e["id"], "regexes": _compile(e["patterns"]), "answer": e["answer"]}
        for e in kb["entries"]
    ]
    blocked = _compile(kb.get("blocked_patterns", []))

    def respond(raw: str) -> dict:
        inp = _normalize(raw)
        if not inp:
            return {"id": "empty", "text": interp(kb["fallback"])}
        for name, pats in commands.items():
            if any(p.search(inp) for p in pats):
                return {"id": f"cmd_{name}", "command": name, "text": interp(kb["cleared"])}
        for entry in entries:
            if any(r.search(inp) for r in entry["regexes"]):
                return {"id": entry["id"], "text": interp(entry["answer"])}
        if any(b.search(inp) for b in blocked):
            return {"id": "blocked", "text": interp(kb["blocked"])}
        return {"id": "fallback", "text": interp(kb["fallback"])}

    return respond, interp(kb.get("boot", ""))


# ── Comandos CLI ─────────────────────────────────────────────────

def cmd_info():
    man = _load(MAN)
    cfg = _load(CFG)
    G, R, DIM, RST = "\033[92m", "\033[91m", "\033[2m", "\033[0m"
    ok_m, err_m = f"{G}✓{RST}", f"{R}✗{RST}"

    print(f"\n\033[1;92m▌ ApathyInject Core  v{man['version']}{RST}")
    print(f"  {man['description'][:72]}\n")

    checks = [
        ("manifest.json",       os.path.isfile(MAN)),
        ("themes_config.json",  os.path.isfile(CFG)),
        ("knowledge_base.json", os.path.isfile(KB)),
        ("background.js",       os.path.isfile(os.path.join(ROOT, "background.js"))),
        ("shared/orchestrator", os.path.isfile(os.path.join(ROOT, "shared", "orchestrator.js"))),
        ("shared/injector",     os.path.isfile(os.path.join(ROOT, "shared", "injector.js"))),
    ]
    for name, exists in checks:
        print(f"  {ok_m if exists else err_m}  {name}")

    missing = [
        t["id"] for t in cfg["themes"]
        if not os.path.isfile(os.path.join(ROOT, t["file"]))
    ]
    print(f"  {''.join([ok_m,'  12 temas']) if not missing else f'{err_m}  ausentes: {missing}'}")
    print(f"\n  {DIM}Instalar: chrome://extensions → Modo dev → Carregar sem compactação → apathyinject-core/{RST}")
    print(f"  {DIM}Atalho:   Alt + Shift + A{RST}\n")


def cmd_test():
    test_file = os.path.join(ROOT, "test_orchestrator.js")
    if not os.path.isfile(test_file):
        print("test_orchestrator.js não encontrado.")
        sys.exit(1)
    sys.exit(subprocess.run(["node", test_file], cwd=ROOT).returncode)


def cmd_themes():
    cfg = _load(CFG)
    print(f"\n\033[1;92m▌ Catálogo AIC — {len(cfg['themes'])} temas\033[0m\n")
    for i, t in enumerate(cfg["themes"], 1):
        print(f"  {i:>2}. {t['emoji']}  \033[1m{t['name']:<18}\033[0m  {t['description']}")
    print()


def cmd_term():
    respond, boot = make_orchestrator()
    print(f"\n\033[1;92m{boot}\033[0m\n")
    try:
        while True:
            try:
                raw = input("\033[92m> \033[0m")
            except EOFError:
                break
            if not raw.strip():
                continue
            r = respond(raw)
            color = "\033[91m" if r["id"] == "blocked" else "\033[92m"
            print(f"{color}{r['text']}\033[0m\n")
            if r.get("command") == "clear":
                print("\033[2J\033[H", end="")
    except KeyboardInterrupt:
        print("\n\033[2mSessão encerrada.\033[0m")


# ── Entry point ──────────────────────────────────────────────────

if __name__ == "__main__":
    dispatch = {"test": cmd_test, "themes": cmd_themes, "term": cmd_term}
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    if arg in dispatch:
        dispatch[arg]()
    elif arg:
        print(f"Comando desconhecido: {arg!r}. Use: test | themes | term")
        sys.exit(1)
    else:
        cmd_info()
