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
