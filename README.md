# 🩸 ApathyInject Core (AIC)

![Manifest V3](https://img.shields.io/badge/manifest-v3-8a2be2?style=flat-square)
![100% Client-Side](https://img.shields.io/badge/100%25-client--side-00ff9c?style=flat-square&labelColor=060608)
![Zero APIs](https://img.shields.io/badge/APIs%20externas-zero-black?style=flat-square)
![Tests](https://img.shields.io/badge/testes-56%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/licença-MIT-555?style=flat-square)

> **Framework de manipulação de DOM focado em estética invasiva e não-destrutiva.**
> Injeção de temas visuais em qualquer página web — sem alterar uma linha da funcionalidade original do site hospedeiro.

O AIC subverte a interface de qualquer página via CSS injetado diretamente pelo `chrome.scripting` do Manifest V3. Opera 100% no *client-side*: ignora a nuvem, recusa APIs pagas, zero latência.

---

## ⚡ Como instalar

```
chrome://extensions  →  Modo do desenvolvedor  →  Carregar sem compactação
→  apontar para  apathyinject-core/
```

Atalho global: **`Alt + Shift + A`** — ativa/desativa o último tema sem abrir o painel.

---

## 🧠 Filosofia

| Princípio | Implementação |
|:----------|:-------------|
| **Injeção Assíncrona** | Apenas o CSS do tema clicado entra no documento (*lazy loading*). A GPU assume o trabalho pesado. |
| **Protocolo Fantasma** | Todo efeito visual carrega `pointer-events: none`. Você vê o caos, mas clica na página perfeitamente. |
| **Orquestrador Terminal** | Chat de suporte **sem LLM**. Regex gatekeeper: responde sobre a doc, bloqueia fuga de escopo. |
| **JSON-Driven** | O catálogo de temas vive em `themes_config.json`. Adicionar 50 temas = editar o JSON, sem tocar no HTML. |

---

## 🗂️ Estrutura

```
apathyinject-core/          ← extensão Chrome (Manifest V3)
├── manifest.json           # MV3 + comando global Alt+Shift+A
├── background.js           # Service worker: atalho + auto-injeção por URL
├── popup.html / .css / .js # NihilUI — painel brutalista (4 abas)
├── themes_config.json      # Catálogo JSON-driven dos 12 temas
├── knowledge_base.json     # Base do Orquestrador, isolada do código
├── shared/
│   ├── orchestrator.js     # Regex gatekeeper (UMD: popup + Node)
│   └── injector.js         # Vetor de injeção (lazy loading, estado por aba)
├── themes/                 # 12 × inject-*.css (Protocolo Fantasma)
│   ├── inject-copa.css         ⚽ Copa do Mundo
│   ├── inject-natal.css        🎄 Natal
│   ├── inject-cyber.css        🌆 Cyberpunk
│   ├── inject-matrix.css       🟩 Matrix
│   ├── inject-halloween.css    🎃 Halloween
│   ├── inject-namorados.css    ❤️  Namorados
│   ├── inject-carnaval.css     🎉 Carnaval
│   ├── inject-junina.css       🌽 Festa Junina
│   ├── inject-primavera.css    🌸 Primavera
│   ├── inject-verao.css        ☀️  Verão
│   ├── inject-outono.css       🍂 Outono
│   └── inject-inverno.css      ❄️  Inverno
└── test_orchestrator.js    # Suíte Node, zero dependências
```

---

## 🎨 Painel NihilUI

O popup tem **4 abas**:

- **INJECT** — grid de 12 injetores com controle de intensidade (ECO / PADRÃO / BRUTAL) + roleta aleatória + `CLEAR STATE`
- **CUSTOM** — Custom Builder: escreva CSS próprio com template completo gerado automaticamente; salvo no `storage` local
- **REGRAS** — white/black-list de URLs para auto-injeção por padrão (`BLOCK` sempre vence)
- **TERM** — Orquestrador Terminal: regex gatekeeper que responde *"quem é você?"*, *"o que você faz?"*, `temas`, `help`, e bloqueia escopo

---

## 🗺️ Roadmap

| Fase | Objetivo | Status |
|:-----|:---------|:------:|
| 🟢 **1 · Fundação** | Motor de injeção, 12 temas, expurgo, terminal | ✅ |
| 🟡 **2 · Otimização** | Lazy loading, `knowledge_base.json` isolado, atalho global | ✅ |
| 🔴 **3 · Autonomia** | Custom Builder + white/black-list de URLs | ✅ |

---

## 🧪 Testes

```bash
cd apathyinject-core
node test_orchestrator.js
# JSON files parse OK
# ✓ "quem é você?" → identity
# ✓ "o que você faz?" → capabilities
# ... 56 passed, 0 failed
```

Valida: JSONs, 12 temas com `pointer-events:none` + `prefers-reduced-motion`, respostas do Orquestrador, bloqueio de escopo, interpolação de variáveis.

---

## 🔒 Privacidade

Zero telemetria · zero requisições de rede · zero APIs externas.
Temas customizados e regras vivem apenas no `storage` local do seu navegador.

---

## 📬 Contato

Autor: **Frank** · [@hfkyxg](https://github.com/hfkyxg)

---

<sub>⭐ Gostou? Deixe uma estrela no repositório!</sub>
