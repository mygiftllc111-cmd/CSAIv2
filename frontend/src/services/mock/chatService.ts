import type { Conversation, Message, ChatRequest, ChatResponse, KnowledgeReference } from '@/types/index.ts';
import { MOCK_CONVERSATIONS } from './data/conversations.ts';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let conversations = [...MOCK_CONVERSATIONS];

interface MockResponseEntry {
  content: string;
  sources: KnowledgeReference[];
}

const MOCK_RESPONSES: MockResponseEntry[] = [
  {
    content: 'お疲れさまです。そのご質問について確認しますね。\n\n社内マニュアルによると、該当の手続きは総務部で受け付けています。まずは社内ポータルの「各種申請」ページをご覧いただくのが早いかと思います。\n\n他にご不明な点があれば、お気軽にお聞きください。',
    sources: [
      { source_title: '社内マニュアル - 各種手続き', source_url: null, source_type: 'notion' },
    ],
  },
  {
    content: 'なるほど、それは気になりますよね。\n\n確認したところ、その件については研修資料の第3章に記載があるようです。もしお手元に資料がない場合は、研修チームに連絡すると共有してもらえますよ。\n\nまた何かあればいつでもどうぞ。',
    sources: [
      { source_title: '新人研修ガイド 第3章', source_url: null, source_type: 'google_drive' },
    ],
  },
  {
    content: 'ご質問ありがとうございます。\n\nその手続きについては、直属の上長に確認いただくのが確実です。一般的な流れとしては、まず社内システムから申請を出し、上長の承認後に処理されます。\n\n詳しい手順が必要でしたら、もう少し具体的にお聞きしますね。',
    sources: [
      { source_title: '就業規則 第5章', source_url: null, source_type: 'notion' },
      { source_title: '社内申請フロー図', source_url: null, source_type: 'google_drive' },
    ],
  },
];

// @MOCK_TO_API: GET {API_PATHS.CHAT.CONVERSATIONS}
export const mockChatService = {
  async getConversations(): Promise<Conversation[]> {
    await delay(300);
    return conversations.map(({ messages, ...rest }) => ({
      ...rest,
      message_count: messages?.length ?? 0,
    }));
  },

  // @MOCK_TO_API: GET {API_PATHS.CHAT.CONVERSATION_DETAIL}
  async getConversation(conversationId: string): Promise<Conversation | null> {
    await delay(300);
    return conversations.find(c => c.conversation_id === conversationId) ?? null;
  },

  // @MOCK_TO_API: POST {API_PATHS.CHAT.SEND}
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    await delay(1500);

    const now = new Date().toISOString();
    const responseIndex = Math.floor(Math.random() * MOCK_RESPONSES.length);
    const mockResponse = MOCK_RESPONSES[responseIndex];

    const userMessage: Message = {
      message_id: `msg-${Date.now()}`,
      role: 'user',
      content: request.content,
      input_method: request.input_method,
      created_at: now,
    };

    const assistantMessage: Message = {
      message_id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: mockResponse?.content ?? '',
      input_method: 'text',
      created_at: new Date(Date.now() + 2000).toISOString(),
    };

    let conversationId = request.conversation_id;

    if (!conversationId) {
      conversationId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        conversation_id: conversationId,
        title: request.content.slice(0, 30) + (request.content.length > 30 ? '...' : ''),
        created_at: now,
        updated_at: now,
        messages: [userMessage, assistantMessage],
      };
      conversations = [newConv, ...conversations];
    } else {
      const conv = conversations.find(c => c.conversation_id === conversationId);
      if (conv) {
        if (!conv.messages) conv.messages = [];
        conv.messages.push(userMessage, assistantMessage);
        conv.updated_at = now;
      }
    }

    return {
      message: assistantMessage,
      conversation_id: conversationId,
      sources: mockResponse?.sources,
    };
  },

  // @MOCK_TO_API: POST {API_PATHS.CHAT.NEW_CONVERSATION}
  async createConversation(): Promise<Conversation> {
    await delay(300);
    const conv: Conversation = {
      conversation_id: `conv-${Date.now()}`,
      title: '新しい会話',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };
    conversations = [conv, ...conversations];
    return conv;
  },
};
