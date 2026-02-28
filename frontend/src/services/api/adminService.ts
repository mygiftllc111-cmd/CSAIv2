import type {
  ConversationLog,
  LogFilter,
  PromptConfig,
  FewShotExample,
  KnowledgeSource,
  Message,
  FrequentQuestion,
} from '@/types/index.ts';
import apiClient, { getApiErrorMessage } from './client.ts';

export const apiAdminService = {
  // --- ログ分析 ---

  async getConversationLogs(filter?: LogFilter): Promise<ConversationLog[]> {
    try {
      const params: Record<string, string> = {};
      if (filter?.department) params.department = filter.department;
      if (filter?.join_date) params.join_date = filter.join_date;
      if (filter?.date_from) params.date_from = filter.date_from;
      if (filter?.date_to) params.date_to = filter.date_to;

      const res = await apiClient.get('/admin/logs', { params });
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getLogDetail(conversationId: string): Promise<Message[]> {
    try {
      const res = await apiClient.get(`/admin/logs/${conversationId}`);
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getFrequentQuestions(): Promise<FrequentQuestion[]> {
    try {
      const res = await apiClient.get('/admin/logs/analytics');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  // --- プロンプト設定 ---

  async getPromptConfig(): Promise<PromptConfig> {
    try {
      const res = await apiClient.get('/admin/prompt');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updatePromptConfig(systemPrompt: string, fewShotExamples: FewShotExample[]): Promise<PromptConfig> {
    try {
      const res = await apiClient.put('/admin/prompt', {
        system_prompt: systemPrompt,
        few_shot_examples: fewShotExamples,
      });
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getPromptHistory(): Promise<PromptConfig[]> {
    try {
      const res = await apiClient.get('/admin/prompt/history');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  // --- ナレッジソース設定 ---

  async getKnowledgeSources(): Promise<KnowledgeSource[]> {
    try {
      const res = await apiClient.get('/admin/knowledge-sources');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateKnowledgeSource(sourceId: string, updates: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
    try {
      const res = await apiClient.put(`/admin/knowledge-sources/${sourceId}`, {
        sync_interval_minutes: updates.sync_interval_minutes,
        connection_config: updates.connection_config,
      });
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async syncKnowledgeSource(sourceId: string): Promise<KnowledgeSource> {
    try {
      const res = await apiClient.post('/admin/sync', { source_id: sourceId });
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async resetKnowledgeSource(sourceId: string): Promise<KnowledgeSource> {
    try {
      const res = await apiClient.post(`/admin/knowledge-sources/${sourceId}/reset`);
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async diagnoseKnowledgeSource(sourceId: string): Promise<Record<string, unknown>> {
    try {
      const res = await apiClient.get(`/admin/knowledge-sources/${sourceId}/diagnose`);
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async uploadKnowledgeFile(file: File): Promise<{ doc_id: string; title: string; chunk_count: number }> {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiClient.post('/admin/knowledge-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
