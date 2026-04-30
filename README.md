# 📱💸 App-Flet: Controle Financeiro Lúdico

![Python](https://img.shields.io/badge/Python-3.12%2B-blue?logo=python&logoColor=white)
![Flet](https://img.shields.io/badge/Flet-0.84-purple?logo=flutter&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Security](https://img.shields.io/badge/security-bandit%20passed-brightgreen)

> **Um aplicativo mobile-first feito em Python com Flet para brincar de finanças. Rápido, fluido (60 fps) e com CRUD completo!**

---

## 🎯 Objetivo

Este projeto é um **sandbox** para explorar o desenvolvimento de interfaces reativas em Python usando **Flet**. O foco é diversão e aprendizado, não uma solução financeira séria.

---

## ✨ Funcionalidades

| Recurso | Descrição |
|:--------|:----------|
| 🏠 **Dashboard** | Saldo em tempo real com cores que indicam saúde financeira. |
| ➕ **Adicionar** | FAB flutuante para criar novas receitas/despesas. |
| ✏️ **Editar** | Botão de edição em cada linha (abre dialog). |
| 🗑️ **Excluir** | Swipe-to-delete ou botão dedicado. |
| 📊 **Gráficos** | Colunas animadas comparando receitas vs. despesas. |
| 📱 **Mobile‑first** | Layout responsivo com drawer lateral e bottom navigation. |
| 🎨 **Cores Vibrantes** | Paleta púrpura, teal e verde/vermelho para feedback imediato. |
| ✅ **Testes** | Cobertura de lógica com unittest e análise de segurança via bandit. |

---

## 🛠️ Tecnologias

- **Python 3.12** – linguagem base.
- **Flet 0.84** – framework UI declarativo (Flutter para Python).
- **Flet Charts** – gráficos de colunas animados.
- **Bandit** – linter de segurança estática.
- **Unittest** – testes automatizados.

---

## 🚀 Como Executar

### 1. Clone o repositório
```bash
git clone https://github.com/hfkyxg/app-flet.git
cd app-flet
```

### 2. Crie e ative um ambiente virtual (Windows)
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Instale as dependências
```bash
pip install flet bandit
```

### 4. Rode o aplicativo
```bash
python main.py
```
> O app abrirá em uma janela simulando um dispositivo móvel (400×800).

---

## 🧪 Testes e Segurança

### Executar testes unitários
```bash
python -m unittest test_main.py
```

### Verificar vulnerabilidades
```bash
bandit -r . -f json
```
> O Bandit não aponta falhas críticas no código‑base; os avisos são referentes a bibliotecas de terceiros (asserts em código de teste, etc.).

---

## 📂 Estrutura do Projeto

```
app-flet/
├── main.py          # Aplicativo principal (UI + lógica)
├── test_main.py     # Testes unitários da lógica de transações
├── .gitignore      # Arquivos ignorados pelo Git
└── README.md       # Este arquivo
```

---

## 🎨 Personalização

Quer trocar cores? Edite as constantes de `ft.Colors` no `main.py`.  
Quer mais gráficos? Adicione novos `ft.ChartData` na função `_chart_data`.

---

## ⚠️ Aviso Legal

Este software é apenas para **fins de diversão e aprendizado**. Não utilize para gerenciar finanças reais sem as devidas validações e segurança.

---

## 🤝 Contribuindo

1. Faça um fork.
2. Crie uma branch: `git checkout -b minha-feature`.
3. Commit: `git commit -m "feat: minha nova feature"`.
4. Push: `git push origin minha-feature`.
5. Abra um Pull Request.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Veja `LICENSE` para mais informações.

---

## 📸 Preview

| Dashboard | Drawer | Gráficos |
|:----------|:-------|:---------|
| *[Adicione um GIF ou screenshot aqui]* | *[Adicione um GIF ou screenshot aqui]* | *[Adicione um GIF ou screenshot aqui]* |

> 💡 **Dica:** Use ferramentas como **ScreenToGif** para gravar a tela do app e gerar GIFs pequenos.

---

## 📬 Contato

- Autor: **Frank** (hfkyxg)
- GitHub: [@hfkyxg](https://github.com/hfkyxg)

---

⭐ **Gostou? Deixe uma estrela no repositório!** ⭐