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
  repo: string;
}

export interface GitHubIssue {
  number: number;
  url: string;
  title: string;
}

export async function createIssue(params: CreateIssueParams): Promise<GitHubIssue> {
  const { analysis, userContext, crispUrl, repo: repoPath } = params;
  const [owner, repo] = repoPath.split('/');

  if (!owner || !repo) {
    throw new Error('Repository must be in format owner/repo');
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
