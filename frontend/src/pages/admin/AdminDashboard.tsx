import { UserApprovalTab } from './UserApprovalTab.tsx';

// A-002: 管理画面（サイドバーナビゲーションで各タブに遷移）
// デフォルトは利用者承認タブ
export const AdminDashboard = () => {
  return <UserApprovalTab />;
};
