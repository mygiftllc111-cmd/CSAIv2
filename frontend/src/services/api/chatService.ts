import type { Conversation, ChatRequest, ChatResponse } from '@/types/index.ts';
import apiClient, { getApiErrorMessage } from './client.ts';

export const apiChatService = {
  async getConversations(): Promise<Conversation[]> {
    try {
      const res = await apiClient.get('/conversations');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const res = await apiClient.get(`/conversations/${conversationId}`);
      return res.data;
    } catch (error) {
      // 404: 会話が見つからない
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw new Error(getApiErrorMessage(error));
    }
  },

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const res = await apiClient.post('/chat', request);
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async createConversation(): Promise<Conversation> {
    try {
      const res = await apiClient.post('/conversations/new');
      return res.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
