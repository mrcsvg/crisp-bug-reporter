# Crisp Bug Reporter

Plugin Crisp para criar issues de bug no GitHub a partir de conversas de suporte.

## Setup

1. Clone o repositório
2. Copie `.env.example` para `.env` e preencha as variáveis
3. `npm install`
4. `npm run dev`

## Arquitetura

- `plugin/` - Widget React que roda dentro do Crisp
- `api/` - Backend serverless (Vercel Functions)
