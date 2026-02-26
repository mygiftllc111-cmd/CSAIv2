import type {
  ConversationLog,
  LogFilter,
  PromptConfig,
  FewShotExample,
  KnowledgeSource,
  Message,
  FrequentQuestion,
} from '@/types/index.ts';
import {
  MOCK_CONVERSATION_LOGS,
  MOCK_LOG_DETAIL_MESSAGES,
  MOCK_FREQUENT_QUESTIONS,
} from './data/adminLogs.ts';
import { MOCK_PROMPT_CONFIG, MOCK_PROMPT_HISTORY } from './data/promptConfig.ts';
import { MOCK_KNOWLEDGE_SOURCES } from './data/knowledgeSources.ts';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let currentPromptConfig = { ...MOCK_PROMPT_CONFIG };
let promptHistory = [...MOCK_PROMPT_HISTORY];
let knowledgeSources = [...MOCK_KNOWLEDGE_SOURCES];

export const mockAdminService = {
  // --- ログ分析 ---

  async getConversationLogs(filter?: LogFilter): Promise<ConversationLog[]> {
    await delay(400);
    let logs = [...MOCK_CONVERSATION_LOGS];

    if (filter?.department) {
      logs = logs.filter(l => l.department === filter.department);
    }
    if (filter?.join_date) {
      logs = logs.filter(l => l.join_date === filter.join_date);
    }
    if (filter?.date_from) {
      logs = logs.filter(l => l.created_at >= filter.date_from!);
    }
    if (filter?.date_to) {
      const dateTo = filter.date_to + 'T23:59:59Z';
      logs = logs.filter(l => l.created_at <= dateTo);
    }

    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getLogDetail(conversationId: string): Promise<Message[]> {
    await delay(300);
    // conv-004 has detailed messages, others return a generic set
    if (conversationId === 'conv-004') {
      return MOCK_LOG_DETAIL_MESSAGES;
    }
    return MOCK_LOG_DETAIL_MESSAGES.map((msg, i) => ({
      ...msg,
      message_id: `${conversationId}-msg-${i}`,
    }));
  },

  async getFrequentQuestions(): Promise<FrequentQuestion[]> {
    await delay(300);
    return [...MOCK_FREQUENT_QUESTIONS];
  },

  // --- プロンプト設定 ---

  async getPromptConfig(): Promise<PromptConfig> {
    await delay(300);
    return { ...currentPromptConfig };
  },

  async updatePromptConfig(systemPrompt: string, fewShotExamples: FewShotExample[]): Promise<PromptConfig> {
    await delay(500);
    const newVersion = currentPromptConfig.version + 1;
    const updated: PromptConfig = {
      config_id: `prompt-${Date.now()}`,
      system_prompt: systemPrompt,
      few_shot_examples: fewShotExamples,
      version: newVersion,
      created_at: new Date().toISOString(),
      updated_by: '管理者',
    };
    promptHistory = [updated, ...promptHistory];
    currentPromptConfig = updated;
    return { ...updated };
  },

  async getPromptHistory(): Promise<PromptConfig[]> {
    await delay(300);
    return [...promptHistory];
  },

  // --- ナレッジソース設定 ---

  async getKnowledgeSources(): Promise<KnowledgeSource[]> {
    await delay(300);
    return knowledgeSources.map(s => ({ ...s }));
  },

  async updateKnowledgeSource(sourceId: string, updates: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
    await delay(500);
    const index = knowledgeSources.findIndex(s => s.source_id === sourceId);
    if (index === -1) throw new Error('ナレッジソースが見つかりません');

    knowledgeSources[index] = { ...knowledgeSources[index], ...updates };
    return { ...knowledgeSources[index] };
  },

  async syncKnowledgeSource(sourceId: string): Promise<KnowledgeSource> {
    await delay(2000); // simulate sync time
    const index = knowledgeSources.findIndex(s => s.source_id === sourceId);
    if (index === -1) throw new Error('ナレッジソースが見つかりません');

    knowledgeSources[index] = {
      ...knowledgeSources[index],
      last_synced_at: new Date().toISOString(),
      status: 'active',
      document_count: knowledgeSources[index].document_count + Math.floor(Math.random() * 3),
    };
    return { ...knowledgeSources[index] };
  },
};
