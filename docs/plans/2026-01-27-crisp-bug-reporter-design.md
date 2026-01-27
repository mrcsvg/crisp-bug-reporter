# Crisp Bug Reporter - Design

Plugin para Crisp que permite criar issues de bug no GitHub a partir de conversas de suporte.

## Visão Geral

- **Fluxo:** Manual - atendente clica botão para criar bug
- **Análise:** Claude API extrai automaticamente detalhes do bug
- **Destino:** Repositório GitHub fixo (configurável)
- **Labels:** Fixa (`bug`, `from-crisp`)
- **Feedback:** Nota privada na conversa com link do issue

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    CRISP INBOX                          │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │     Conversa        │  │    Plugin Widget         │  │
│  │                     │  │  ┌────────────────────┐  │  │
│  │  [Usuário]: App     │  │  │  Criar Bug         │  │  │
│  │  crashou quando...  │  │  └────────────────────┘  │  │
│  └─────────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼ Click "Criar Bug"
                    ┌─────────────────────┐
                    │   Backend (API)     │
                    │   /api/create-bug   │
                    └─────────────────────┘
                        │           │
            ┌───────────┘           └───────────┐
            ▼                                   ▼
    ┌───────────────┐                   ┌───────────────┐
    │  Claude API   │                   │  GitHub API   │
    │  (análise)    │                   │  (criar issue)│
    └───────────────┘                   └───────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Crisp API         │
                    │   (add nota)        │
                    └─────────────────────┘
```

## Fluxo Detalhado

1. Widget captura dados da conversa via Crisp SDK:
   - conversation_id, mensagens, dados do visitante, website_id

2. Widget envia POST /api/create-bug

3. Backend chama Claude API para extrair:
   - Título do bug (max 80 chars)
   - Descrição detalhada
   - Passos para reproduzir
   - Severidade sugerida

4. Backend cria issue no GitHub com labels `bug` e `from-crisp`

5. Backend adiciona nota privada na conversa Crisp

6. Widget mostra sucesso com link do issue

## Estrutura do Projeto

```
crisp-bug-reporter/
├── plugin/                    # Widget Crisp (Frontend)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   └── BugButton.tsx
│   │   └── crisp.ts
│   ├── package.json
│   └── vite.config.ts
│
├── api/                       # Backend (Serverless)
│   ├── create-bug.ts
│   ├── lib/
│   │   ├── claude.ts
│   │   ├── github.ts
│   │   └── crisp.ts
│   └── package.json
│
├── .env.example
├── README.md
└── package.json
```

## Stack

- **Widget:** React + TypeScript + Vite
- **Backend:** Vercel Serverless Functions (Node.js)
- **Deploy:** Vercel

## Variáveis de Ambiente

- `ANTHROPIC_API_KEY` - API key do Claude
- `GITHUB_TOKEN` - Personal access token do GitHub
- `GITHUB_REPO` - Repositório destino (ex: "owner/repo")
- `CRISP_WEBSITE_ID` - ID do website no Crisp
- `CRISP_PLUGIN_ID` - ID do plugin
- `CRISP_PLUGIN_SECRET` - Secret do plugin

## Template do GitHub Issue

```markdown
## Descrição
{descrição extraída pelo Claude}

## Passos para Reproduzir
{passos identificados ou "Não identificados na conversa"}

## Severidade Sugerida
{low/medium/high/critical}

---

## Contexto do Usuário
| Campo | Valor |
|-------|-------|
| Email | {visitor.email} |
| Device | {visitor.device} |
| Browser | {visitor.browser} |
| OS | {visitor.os} |
| País | {visitor.country} |

## Referência
[Conversa no Crisp](https://app.crisp.chat/website/{website_id}/inbox/{conversation_id})

---
_Bug reportado via Crisp Bug Reporter_
```

## Nota Privada no Crisp

```
Bug criado no GitHub: https://github.com/{owner}/{repo}/issues/{number}
Título: {título do issue}
```

## Tratamento de Erros

- Claude falhar → erro genérico, permite retry
- GitHub falhar → mostra erro específico
- Crisp nota falhar → não bloqueia (issue já foi criado)
