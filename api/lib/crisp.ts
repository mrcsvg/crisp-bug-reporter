import Crisp from 'crisp-api';

const CrispClient = new Crisp();

CrispClient.authenticateTier(
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

interface Message {
  type: string;
  from: string;
  content: string;
  timestamp: number;
}

interface ConversationMeta {
  email?: string;
  device?: {
    capabilities?: string[];
    geolocation?: { country?: string };
    system?: {
      os?: { name?: string; version?: string };
      browser?: { name?: string; version?: string };
    };
  };
}

export async function getConversation(websiteId: string, sessionId: string): Promise<{ messages: Message[]; meta: ConversationMeta }> {
  // Get messages
  const messagesResponse = await CrispClient.website.getMessagesInConversation(websiteId, sessionId);
  const messages: Message[] = (messagesResponse || []).map((m: Record<string, unknown>) => ({
    type: m.type as string,
    from: m.from as string,
    content: m.content as string,
    timestamp: m.timestamp as number,
  }));

  // Get conversation meta
  let meta: ConversationMeta = {};
  try {
    const conversation = await CrispClient.website.getConversation(websiteId, sessionId);
    meta = {
      email: conversation?.meta?.email,
      device: conversation?.device,
    };
  } catch (e) {
    console.warn('Could not fetch conversation meta:', e);
  }

  return { messages, meta };
}

export async function addNote(params: AddNoteParams): Promise<void> {
  const { websiteId, sessionId, issueUrl, issueTitle } = params;

  await CrispClient.website.sendMessageInConversation(websiteId, sessionId, {
    type: 'note',
    content: `🐛 Bug criado no GitHub: ${issueUrl}\nTítulo: ${issueTitle}`,
    from: 'operator',
    origin: 'chat',
  });
}
