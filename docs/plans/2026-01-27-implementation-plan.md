# Crisp Bug Reporter - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Crisp plugin that creates GitHub issues from support conversations using Claude AI for analysis.

**Architecture:** iFrame widget in Crisp sidebar + Vercel serverless backend. Widget captures conversation data via Crisp SDK, sends to backend which uses Claude to analyze and extract bug details, creates GitHub issue, and adds private note to conversation.

**Tech Stack:** React + TypeScript + Vite (widget), Vercel Serverless Functions (backend), Crisp Widget SDK, Claude API, GitHub API, Crisp REST API.

---

## Task 1: Initialize Monorepo Structure

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`

**Step 1: Create root package.json**

```json
{
  "name": "crisp-bug-reporter",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:plugin\" \"npm run dev:api\"",
    "dev:plugin": "npm run dev --workspace=plugin",
    "dev:api": "vercel dev",
    "build": "npm run build --workspace=plugin",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "workspaces": [
    "plugin",
    "api"
  ],
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

**Step 2: Create .gitignore**

```
node_modules/
dist/
.env
.vercel/
*.log
.DS_Store
```

**Step 3: Create .env.example**

```
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPO=owner/repo

# Crisp
CRISP_WEBSITE_ID=xxxxx
CRISP_PLUGIN_ID=xxxxx
CRISP_PLUGIN_SECRET=xxxxx
```

**Step 4: Create README.md**

```markdown
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
```

**Step 5: Commit**

```bash
git add package.json .gitignore .env.example README.md
git commit -m "chore: initialize monorepo structure"
```

---

## Task 2: Setup Plugin (Widget) Project

**Files:**
- Create: `plugin/package.json`
- Create: `plugin/tsconfig.json`
- Create: `plugin/vite.config.ts`
- Create: `plugin/index.html`

**Step 1: Create plugin/package.json**

```json
{
  "name": "crisp-bug-reporter-plugin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12"
  }
}
```

**Step 2: Create plugin/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**Step 3: Create plugin/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 3000,
  },
})
```

**Step 4: Create plugin/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crisp Bug Reporter</title>
    <script src="https://assets.crisp.chat/widget/javascripts/sdk.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 5: Commit**

```bash
git add plugin/
git commit -m "chore: setup plugin project with vite and react"
```

---

## Task 3: Create Plugin Widget UI

**Files:**
- Create: `plugin/src/main.tsx`
- Create: `plugin/src/App.tsx`
- Create: `plugin/src/App.css`
- Create: `plugin/src/types/crisp.d.ts`

**Step 1: Create type definitions for Crisp SDK**

Create `plugin/src/types/crisp.d.ts`:

```typescript
interface CrispConversation {
  session_id: string;
  website_id: string;
  messages: Array<{
    type: string;
    from: string;
    content: string;
    timestamp: number;
  }>;
  meta: {
    email?: string;
    data?: Record<string, unknown>;
  };
  device?: {
    capabilities?: string[];
    geolocation?: {
      country?: string;
      city?: string;
    };
    system?: {
      os?: { name?: string; version?: string };
      browser?: { name?: string; version?: string };
    };
  };
}

interface CrispSDK {
  setHeight: (height: number) => void;
  acquireData: (namespace: 'conversation' | 'operator' | 'operators' | 'plugin_settings') => void;
  showToast: (type: 'success' | 'failure' | 'info', message: string, action?: { label: string; url: string }) => void;
  onDataAcquired: (callback: (namespace: string) => void) => void;
  data: {
    conversation?: CrispConversation;
    operator?: {
      user_id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

declare global {
  interface Window {
    $crisp: CrispSDK;
    CRISP_READY_TRIGGER: () => void;
  }
}

export {};
```

**Step 2: Create main.tsx**

Create `plugin/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

window.CRISP_READY_TRIGGER = () => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Fallback if SDK already loaded
if (window.$crisp) {
  window.CRISP_READY_TRIGGER()
}
```

**Step 3: Create App.tsx**

Create `plugin/src/App.tsx`:

```tsx
import { useState, useEffect } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface BugResult {
  issueUrl: string;
  issueNumber: number;
  title: string;
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<BugResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.$crisp.setHeight(150)
  }, [])

  const handleCreateBug = async () => {
    setStatus('loading')
    setError(null)

    try {
      window.$crisp.acquireData('conversation')

      // Wait for data to be acquired
      await new Promise<void>((resolve) => {
        window.$crisp.onDataAcquired((namespace) => {
          if (namespace === 'conversation') {
            resolve()
          }
        })
      })

      const conversation = window.$crisp.data.conversation
      if (!conversation) {
        throw new Error('Não foi possível obter dados da conversa')
      }

      const response = await fetch('/api/create-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: conversation.session_id,
          website_id: conversation.website_id,
          messages: conversation.messages,
          meta: conversation.meta,
          device: conversation.device,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao criar bug')
      }

      const data = await response.json()
      setResult(data)
      setStatus('success')

      window.$crisp.showToast('success', 'Bug criado com sucesso!', {
        label: 'Ver issue',
        url: data.issueUrl,
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      window.$crisp.showToast('failure', 'Erro ao criar bug')
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }

  return (
    <div className="container">
      <h1>Bug Reporter</h1>

      {status === 'idle' && (
        <button onClick={handleCreateBug} className="btn btn-primary">
          Criar Bug no GitHub
        </button>
      )}

      {status === 'loading' && (
        <div className="loading">
          <div className="spinner" />
          <p>Analisando conversa...</p>
        </div>
      )}

      {status === 'success' && result && (
        <div className="success">
          <p>Bug #{result.issueNumber} criado!</p>
          <p className="title">{result.title}</p>
          <a href={result.issueUrl} target="_blank" rel="noopener noreferrer" className="btn btn-link">
            Ver no GitHub
          </a>
          <button onClick={handleReset} className="btn btn-secondary">
            Criar outro
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="error">
          <p>{error}</p>
          <button onClick={handleReset} className="btn btn-secondary">
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create App.css**

Create `plugin/src/App.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #333;
  background: #fff;
}

.container {
  padding: 16px;
}

h1 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.btn {
  display: inline-block;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: background 0.2s;
}

.btn-primary {
  background: #5c6bc0;
  color: white;
  width: 100%;
}

.btn-primary:hover {
  background: #4a5ab9;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  margin-top: 8px;
  width: 100%;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-link {
  background: #4caf50;
  color: white;
  width: 100%;
}

.btn-link:hover {
  background: #43a047;
}

.loading {
  text-align: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f0f0f0;
  border-top-color: #5c6bc0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success {
  text-align: center;
}

.success p {
  margin-bottom: 8px;
}

.success .title {
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
}

.error {
  text-align: center;
  color: #d32f2f;
}

.error p {
  margin-bottom: 12px;
}
```

**Step 5: Commit**

```bash
git add plugin/src/
git commit -m "feat: create plugin widget UI with bug creation flow"
```

---

## Task 4: Setup API Project Structure

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `vercel.json`

**Step 1: Create api/package.json**

```json
{
  "name": "crisp-bug-reporter-api",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@octokit/rest": "^20.0.2",
    "node-crisp-api": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@vercel/node": "^3.0.17",
    "typescript": "^5.3.3"
  }
}
```

**Step 2: Create api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create vercel.json**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "plugin/dist/**",
      "use": "@vercel/static"
    },
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/plugin/dist/$1"
    }
  ]
}
```

**Step 4: Commit**

```bash
git add api/ vercel.json
git commit -m "chore: setup API project structure with vercel config"
```

---

## Task 5: Implement Claude Analysis Service

**Files:**
- Create: `api/lib/claude.ts`

**Step 1: Create Claude service**

Create `api/lib/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  type: string;
  from: string;
  content: string;
  timestamp: number;
}

export interface BugAnalysis {
  title: string;
  description: string;
  stepsToReproduce: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function analyzeBug(messages: Message[]): Promise<BugAnalysis> {
  const conversationText = messages
    .filter((m) => m.type === 'text')
    .map((m) => `[${m.from}]: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analise esta conversa de suporte e extraia informações sobre o bug reportado.

Conversa:
${conversationText}

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem code blocks):
{
  "title": "Título curto e descritivo do bug (max 80 caracteres)",
  "description": "Descrição detalhada do problema reportado",
  "stepsToReproduce": ["Passo 1", "Passo 2"],
  "severity": "low|medium|high|critical"
}

Se não conseguir identificar passos para reproduzir, use um array vazio.
Baseie a severidade no impacto descrito pelo usuário.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    return JSON.parse(content.text) as BugAnalysis;
  } catch {
    throw new Error('Failed to parse Claude response as JSON');
  }
}
```

**Step 2: Commit**

```bash
git add api/lib/claude.ts
git commit -m "feat: implement Claude analysis service for bug extraction"
```

---

## Task 6: Implement GitHub Service

**Files:**
- Create: `api/lib/github.ts`

**Step 1: Create GitHub service**

Create `api/lib/github.ts`:

```typescript
import { Octokit } from '@octokit/rest';
import type { BugAnalysis } from './claude';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface UserContext {
  email?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
}

interface CreateIssueParams {
  analysis: BugAnalysis;
  userContext: UserContext;
  crispUrl: string;
}

export interface GitHubIssue {
  number: number;
  url: string;
  title: string;
}

export async function createIssue(params: CreateIssueParams): Promise<GitHubIssue> {
  const { analysis, userContext, crispUrl } = params;
  const [owner, repo] = (process.env.GITHUB_REPO || '').split('/');

  if (!owner || !repo) {
    throw new Error('GITHUB_REPO must be in format owner/repo');
  }

  const stepsSection = analysis.stepsToReproduce.length > 0
    ? analysis.stepsToReproduce.map((step, i) => `${i + 1}. ${step}`).join('\n')
    : '_Não identificados na conversa_';

  const body = `## Descrição
${analysis.description}

## Passos para Reproduzir
${stepsSection}

## Severidade Sugerida
\`${analysis.severity}\`

---

## Contexto do Usuário
| Campo | Valor |
|-------|-------|
| Email | ${userContext.email || '_Não informado_'} |
| Device | ${userContext.device || '_Não informado_'} |
| Browser | ${userContext.browser || '_Não informado_'} |
| OS | ${userContext.os || '_Não informado_'} |
| País | ${userContext.country || '_Não informado_'} |

## Referência
[Conversa no Crisp](${crispUrl})

---
_Bug reportado via Crisp Bug Reporter_`;

  const response = await octokit.issues.create({
    owner,
    repo,
    title: analysis.title,
    body,
    labels: ['bug', 'from-crisp'],
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
    title: analysis.title,
  };
}
```

**Step 2: Commit**

```bash
git add api/lib/github.ts
git commit -m "feat: implement GitHub service for issue creation"
```

---

## Task 7: Implement Crisp Service

**Files:**
- Create: `api/lib/crisp.ts`

**Step 1: Create Crisp service**

Create `api/lib/crisp.ts`:

```typescript
import Crisp from 'node-crisp-api';

const client = new Crisp();

client.authenticateTier(
  'plugin',
  process.env.CRISP_PLUGIN_ID || '',
  process.env.CRISP_PLUGIN_SECRET || ''
);

interface AddNoteParams {
  websiteId: string;
  sessionId: string;
  issueUrl: string;
  issueTitle: string;
}

export async function addNote(params: AddNoteParams): Promise<void> {
  const { websiteId, sessionId, issueUrl, issueTitle } = params;

  await client.website.sendMessageInConversation(websiteId, sessionId, {
    type: 'note',
    from: 'operator',
    origin: 'chat',
    content: `🐛 Bug criado no GitHub: ${issueUrl}\nTítulo: ${issueTitle}`,
  });
}
```

**Step 2: Commit**

```bash
git add api/lib/crisp.ts
git commit -m "feat: implement Crisp service for adding notes"
```

---

## Task 8: Implement Main API Endpoint

**Files:**
- Create: `api/create-bug.ts`

**Step 1: Create the main endpoint**

Create `api/create-bug.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeBug } from './lib/claude';
import { createIssue } from './lib/github';
import { addNote } from './lib/crisp';

interface RequestBody {
  session_id: string;
  website_id: string;
  messages: Array<{
    type: string;
    from: string;
    content: string;
    timestamp: number;
  }>;
  meta?: {
    email?: string;
  };
  device?: {
    capabilities?: string[];
    geolocation?: {
      country?: string;
    };
    system?: {
      os?: { name?: string; version?: string };
      browser?: { name?: string; version?: string };
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as RequestBody;
    const { session_id, website_id, messages, meta, device } = body;

    if (!session_id || !website_id || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Analyze conversation with Claude
    const analysis = await analyzeBug(messages);

    // 2. Build user context
    const userContext = {
      email: meta?.email,
      device: device?.capabilities?.join(', '),
      browser: device?.system?.browser
        ? `${device.system.browser.name} ${device.system.browser.version}`
        : undefined,
      os: device?.system?.os
        ? `${device.system.os.name} ${device.system.os.version}`
        : undefined,
      country: device?.geolocation?.country,
    };

    const crispUrl = `https://app.crisp.chat/website/${website_id}/inbox/${session_id}`;

    // 3. Create GitHub issue
    const issue = await createIssue({
      analysis,
      userContext,
      crispUrl,
    });

    // 4. Add note to Crisp conversation (non-blocking)
    addNote({
      websiteId: website_id,
      sessionId: session_id,
      issueUrl: issue.url,
      issueTitle: issue.title,
    }).catch((err) => {
      console.error('Failed to add Crisp note:', err);
    });

    return res.status(200).json({
      issueNumber: issue.number,
      issueUrl: issue.url,
      title: issue.title,
    });
  } catch (error) {
    console.error('Error creating bug:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
```

**Step 2: Commit**

```bash
git add api/create-bug.ts
git commit -m "feat: implement main create-bug API endpoint"
```

---

## Task 9: Install Dependencies and Test Build

**Step 1: Install root dependencies**

Run: `npm install`

**Step 2: Install plugin dependencies**

Run: `cd plugin && npm install`

**Step 3: Install API dependencies**

Run: `cd api && npm install`

**Step 4: Build plugin**

Run: `npm run build`

Expected: Build succeeds with `plugin/dist/` created

**Step 5: Commit lock files**

```bash
git add package-lock.json plugin/package-lock.json api/package-lock.json
git commit -m "chore: add package lock files"
```

---

## Task 10: Configure Crisp Marketplace

**Step 1: Log into Crisp Marketplace**

Go to: https://marketplace.crisp.chat/

**Step 2: Create iFrame Widget**

In your plugin settings, add a widget with schema:
```json
{
  "version": "1.0",
  "url": "https://your-vercel-url.vercel.app/"
}
```

**Step 3: Configure Token Scopes**

Enable these scopes for your plugin:
- `website:conversation:messages` (read)
- `website:conversation:sessions` (read)
- `website:people:profiles` (read)

**Step 4: Copy credentials to .env**

```
CRISP_PLUGIN_ID=your-plugin-id
CRISP_PLUGIN_SECRET=your-plugin-secret
CRISP_WEBSITE_ID=your-website-id
```

---

## Task 11: Deploy to Vercel

**Step 1: Install Vercel CLI**

Run: `npm i -g vercel`

**Step 2: Deploy**

Run: `vercel --prod`

Follow prompts to link project

**Step 3: Set environment variables in Vercel**

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add GITHUB_TOKEN
vercel env add GITHUB_REPO
vercel env add CRISP_PLUGIN_ID
vercel env add CRISP_PLUGIN_SECRET
vercel env add CRISP_WEBSITE_ID
```

**Step 4: Update Crisp widget URL**

Update widget URL to your Vercel production URL

**Step 5: Test in Crisp Inbox**

1. Open a conversation in Crisp
2. Click the plugin widget in sidebar
3. Click "Criar Bug no GitHub"
4. Verify issue created and note added

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Initialize monorepo structure |
| 2 | Setup plugin project with Vite/React |
| 3 | Create plugin widget UI |
| 4 | Setup API project structure |
| 5 | Implement Claude analysis service |
| 6 | Implement GitHub service |
| 7 | Implement Crisp service |
| 8 | Implement main API endpoint |
| 9 | Install dependencies and test build |
| 10 | Configure Crisp Marketplace |
| 11 | Deploy to Vercel |
