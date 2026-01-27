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
