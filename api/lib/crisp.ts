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

export async function addNote(params: AddNoteParams): Promise<void> {
  const { websiteId, sessionId, issueUrl, issueTitle } = params;

  await CrispClient.website.sendMessageInConversation(websiteId, sessionId, {
    type: 'note',
    content: `🐛 Bug criado no GitHub: ${issueUrl}\nTítulo: ${issueTitle}`,
    from: 'operator',
    origin: 'chat',
  });
}
