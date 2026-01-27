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
