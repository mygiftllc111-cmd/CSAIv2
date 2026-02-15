// サービス統合エクスポート
// モック → 実APIへの切り替えはここで行う

export { mockAuthService as authService } from './mock/authService.ts';
export { mockChatService as chatService } from './mock/chatService.ts';
export { mockAdminService as adminService } from './mock/adminService.ts';
