import type { VercelRequest, VercelResponse } from '@vercel/node';
import Crisp from 'crisp-api';

const CrispClient = new Crisp();

CrispClient.authenticateTier(
  'plugin',
  process.env.CRISP_PLUGIN_ID || '',
  process.env.CRISP_PLUGIN_SECRET || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const website_id = req.query.website_id as string;

    if (!website_id) {
      return res.status(400).json({ error: 'Missing website_id' });
    }

    // Get settings from Crisp
    const settings = await CrispClient.plugin.getSubscriptionSettings(
      website_id,
      process.env.CRISP_PLUGIN_ID || ''
    );

    return res.status(200).json({ settings: settings || {} });
  } catch (error) {
    console.error('Error getting settings:', error);
    // Return empty settings if not found
    return res.status(200).json({ settings: {} });
  }
}
