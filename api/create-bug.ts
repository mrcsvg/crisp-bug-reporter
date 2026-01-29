import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeBug } from './lib/claude';
import { createIssue } from './lib/github';
import { addNote, getConversation } from './lib/crisp';

interface RequestBody {
  session_id: string;
  website_id: string;
  github_repo?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as RequestBody;
    console.log('Received body:', JSON.stringify(body, null, 2));

    const { session_id, website_id, github_repo } = body;

    // Use github_repo from request or fallback to env
    const repo = github_repo || process.env.GITHUB_REPO;

    if (!session_id || !website_id) {
      return res.status(400).json({
        error: 'Missing required fields: session_id and website_id',
      });
    }

    if (!repo) {
      return res.status(400).json({
        error: 'GitHub repository not configured',
      });
    }

    // 1. Fetch conversation data from Crisp API
    console.log('Fetching conversation from Crisp...');
    const { messages, meta } = await getConversation(website_id, session_id);

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Conversa sem mensagens' });
    }

    console.log(`Found ${messages.length} messages`);

    // 2. Analyze conversation with Claude
    console.log('Analyzing with Claude...');
    const analysis = await analyzeBug(messages);

    // 3. Build user context
    const userContext = {
      email: meta?.email,
      device: meta?.device?.capabilities?.join(', '),
      browser: meta?.device?.system?.browser
        ? `${meta.device.system.browser.name} ${meta.device.system.browser.version}`
        : undefined,
      os: meta?.device?.system?.os
        ? `${meta.device.system.os.name} ${meta.device.system.os.version}`
        : undefined,
      country: meta?.device?.geolocation?.country,
    };

    const crispUrl = `https://app.crisp.chat/website/${website_id}/inbox/${session_id}`;

    // 4. Create GitHub issue
    console.log('Creating GitHub issue in', repo);
    const issue = await createIssue({
      analysis,
      userContext,
      crispUrl,
      repo,
    });

    // 5. Add note to Crisp conversation (non-blocking)
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
