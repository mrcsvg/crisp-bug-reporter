import type { VercelRequest, VercelResponse } from '@vercel/node';
import Crisp from 'crisp-api';

const CrispClient = new Crisp();

CrispClient.authenticateTier(
  'plugin',
  process.env.CRISP_PLUGIN_ID || '',
  process.env.CRISP_PLUGIN_SECRET || ''
);

interface RequestBody {
  website_id: string;
  settings: {
    github_repo: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as RequestBody;
    const { website_id, settings } = body;

    if (!website_id || !settings?.github_repo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save settings to Crisp
    await CrispClient.plugin.updateSubscriptionSettings(
      website_id,
      process.env.CRISP_PLUGIN_ID || '',
      settings
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
