// サービス統合エクスポート
// VITE_USE_MOCK=true でモックサービス、それ以外は実APIに接続

import { mockAuthService } from './mock/authService.ts';
import { mockChatService } from './mock/chatService.ts';
import { mockAdminService } from './mock/adminService.ts';
import { apiAuthService } from './api/authService.ts';
import { apiChatService } from './api/chatService.ts';
import { apiAdminService } from './api/adminService.ts';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const authService = useMock ? mockAuthService : apiAuthService;
export const chatService = useMock ? mockChatService : apiChatService;
export const adminService = useMock ? mockAdminService : apiAdminService;
