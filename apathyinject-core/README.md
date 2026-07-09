# 🩸 ApathyInject Core (AIC)

![Manifest](https://img.shields.io/badge/manifest-v3-8a2be2)
![Client-Side](https://img.shields.io/badge/100%25-client--side-00ff9c)
![Zero API](https://img.shields.io/badge/APIs%20externas-0-black)
![Tests](https://img.shields.io/badge/tests-56%20passing-brightgreen)

> Framework de manipulação de DOM focado em **estética invasiva e não-destrutiva**.
> Máxima alteração visual, zero custo de processamento, total indiferença à estrutura do site hospedeiro.

O AIC subverte a interface de qualquer página injetando módulos visuais temáticos —
**sem alterar uma única linha da funcionalidade original**. Ignora a nuvem, recusa
APIs pagas e opera 100% no *client-side*.

---

## 🧠 Filosofia

| Princípio | Implementação |
|:----------|:--------------|
| **Injeção Assíncrona** | Nada é renderizado com JS. Via `chrome.scripting`, apenas o CSS do tema clicado entra no documento (lazy loading). A GPU faz o trabalho pesado. |
| **Protocolo Fantasma** | Toda partícula carrega `pointer-events: none`. Você vê o caos, mas clica na página perfeitamente. O site nunca perde funcionalidade. |
| **Orquestrador Terminal** | Chat de suporte **sem LLM**. Regex gatekeeper: responde sobre a documentação e bloqueia fuga de escopo. |

---

## 🏗️ Arquitetura

```
apathyinject-core/
├── manifest.json          # MV3 + commands (atalho global)
├── background.js          # Service worker: atalho + auto-injeção por regra
├── popup.html/css/js      # NihilUI — painel brutalista com 4 abas
├── themes_config.json     # Catálogo JSON-driven (o HTML não conhece os temas)
├── knowledge_base.json    # Base do Orquestrador, isolada do código
├── shared/
│   ├── orchestrator.js    # Regex gatekeeper (UMD: roda no popup e no Node)
│   └── injector.js        # Vetor de injeção (lazy loading, estado por aba)
├── themes/                # 12 folhas de estilo (inject-*.css)
└── test_orchestrator.js   # Suíte de testes (Node, zero dependências)
```

O painel tem quatro abas:

- **INJECT** — grid de 12 injetores (renderizado a partir do JSON) + intensidade (ECO / PADRÃO / BRUTAL) + roleta + `CLEAR STATE`.
- **CUSTOM** — Custom Builder: escreva seu CSS, gere um template completo e salve no storage local como tema próprio.
- **REGRAS** — white/black-list de URLs para auto-injeção (`BLOCK` sempre vence).
- **TERM** — o Orquestrador. Pergunte *"o que você faz?"*, *"quem é você?"*, `temas`, `help`, ou digite `clear`.

---

## 🎨 Catálogo de Temas (Fase 1)

⚽ Copa · 🎄 Natal · 🌆 Cyberpunk · 🟩 Matrix · 🎃 Halloween · ❤️ Namorados ·
🎉 Carnaval · 🌽 Festa Junina · 🌸 Primavera · ☀️ Verão · 🍂 Outono · ❄️ Inverno

Cada tema respeita a **Matriz de Escalabilidade**: ≤100 partículas via `box-shadow`,
animações somente em `transform`/`opacity` (GPU) e guarda `prefers-reduced-motion`.

---

## 🗺️ Roadmap — status

| Fase | Objetivo | Status |
|:-----|:---------|:-------|
| 🟢 **1 · Fundação** | Motor de injeção, 12 temas, expurgo, terminal estático | ✅ Entregue |
| 🟡 **2 · Otimização** | Lazy loading de CSS, `knowledge_base.json` isolado, atalho global (`Alt+Shift+A`) | ✅ Entregue |
| 🔴 **3 · Autonomia** | Custom Builder + white/black-list de URLs | ✅ Entregue |

Melhorias do backlog também incluídas: **toast** de confirmação de injeção, comando
`clear` no terminal, e checagem de **URL restrita** (`chrome://`, web store) que
desabilita os botões e avisa via terminal em vez de estourar erro no console.

---

## 🚀 Instalação

O AIC é distribuído fora da loja (sem nuvem, sem intermediários):

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e aponte para a pasta `apathyinject-core/`.
4. O ícone do AIC aparece na barra. Atalho global: **`Alt + Shift + A`** alterna o último tema.

---

## 🧪 Testes

Suíte sem dependências — valida os JSONs, confere que os 12 temas existem com
`pointer-events: none` + `prefers-reduced-motion`, e exercita o Orquestrador
(identidade, capacidades, bloqueio de escopo, comando `clear`, interpolação):

```bash
cd apathyinject-core
node test_orchestrator.js
# === 56 passed, 0 failed ===
```

---

## 🔒 Privacidade

100% client-side. Zero telemetria, zero requisições de rede, zero APIs externas.
Temas customizados e regras vivem apenas no `storage` local do seu navegador.
O que acontece na sua aba, morre na sua aba.
