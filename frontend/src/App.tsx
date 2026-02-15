import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/theme/theme.ts';
import { useAuth } from '@/hooks/useAuth.ts';

// Layouts
import { PublicLayout } from '@/layouts/PublicLayout.tsx';
import { UserLayout } from '@/layouts/UserLayout.tsx';
import { AdminLayout } from '@/layouts/AdminLayout.tsx';

// Auth guards
import { ProtectedRoute } from '@/components/auth/ProtectedRoute.tsx';
import { AdminRoute } from '@/components/auth/AdminRoute.tsx';

// Pages
import { ChatPage } from '@/pages/public/ChatPage.tsx';
import { AdminLoginPage } from '@/pages/public/AdminLoginPage.tsx';
import { ChatScreen } from '@/pages/user/ChatScreen.tsx';
import { HistoryPage } from '@/pages/user/HistoryPage.tsx';
import { AdminDashboard } from '@/pages/admin/AdminDashboard.tsx';
import { LogAnalysisPage } from '@/pages/admin/LogAnalysisPage.tsx';
import { PromptSettingsPage } from '@/pages/admin/PromptSettingsPage.tsx';
import { KnowledgeSourcePage } from '@/pages/admin/KnowledgeSourcePage.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const AppRoutes = () => {
  const { checkStatus, userProfile, isLoading } = useAuth();

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // 承認済みユーザーがルート「/」にアクセスした場合、チャット画面へリダイレクト
  const rootRedirect = () => {
    if (isLoading) return <ChatPage />;
    if (userProfile?.status === 'approved') return <Navigate to="/chat" replace />;
    return <ChatPage />;
  };

  return (
    <Routes>
      {/* 公開ルート */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={rootRedirect()} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Route>

      {/* ユーザールート（承認済みのみ） */}
      <Route
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/chat" element={<ChatScreen />} />
        <Route path="/chat/:conversationId" element={<ChatScreen />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>

      {/* 管理者ルート */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/logs" element={<LogAnalysisPage />} />
        <Route path="/admin/prompt" element={<PromptSettingsPage />} />
        <Route path="/admin/knowledge" element={<KnowledgeSourcePage />} />
      </Route>

      {/* 404 → ホームへ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
