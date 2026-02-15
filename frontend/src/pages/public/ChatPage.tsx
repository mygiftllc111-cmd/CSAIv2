import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpaIcon from '@mui/icons-material/Spa';
import { useAuth } from '@/hooks/useAuth.ts';
import type { ProfileSubmission } from '@/types/index.ts';

// 利用申請フォーム（未登録ユーザー向け）
const ProfileForm = () => {
  const { submitProfile, error, isLoading, clearError } = useAuth();
  const [form, setForm] = useState<ProfileSubmission>({
    name: '',
    department: '',
    join_date: '',
  });

  const isValid = form.name.trim() !== '' && form.department.trim() !== '' && form.join_date !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    clearError();
    await submitProfile(form);
  };

  return (
    <Card sx={{ maxWidth: 440, width: '100%', mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <SpaIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} color="primary.dark">
            Hospitality AI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            安心して何でも質問できるAIアシスタントです。
            <br />
            まずは利用申請をお願いします。
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="お名前"
            required
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 50 }}
          />
          <TextField
            label="所属部署"
            required
            fullWidth
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            label="入社時期"
            type="month"
            required
            fullWidth
            value={form.join_date}
            onChange={(e) => setForm({ ...form, join_date: e.target.value })}
            sx={{ mb: 3 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={isLoading || !isValid}
            endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          >
            {isLoading ? '申請中...' : '利用申請を送信'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

// 承認待ち画面
const PendingScreen = () => {
  const { userProfile, checkStatus } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await checkStatus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 440, width: '100%', mx: 'auto' }}>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <SpaIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} color="primary.dark" gutterBottom>
          申請を受け付けました
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {userProfile?.name}さん、ありがとうございます。
          <br />
          管理者が確認後、ご利用いただけるようになります。
        </Typography>
        <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
          承認されるまでしばらくお待ちください。
          <br />
          承認後、このページから直接チャットをご利用いただけます。
        </Alert>
        <Button
          variant="outlined"
          size="small"
          startIcon={checking ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          onClick={() => { void handleCheckStatus(); }}
          disabled={checking}
        >
          {checking ? '確認中...' : '承認状況を確認する'}
        </Button>
      </CardContent>
    </Card>
  );
};

// 拒否画面
const RejectedScreen = () => {
  return (
    <Card sx={{ maxWidth: 440, width: '100%', mx: 'auto' }}>
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} color="error.main" gutterBottom>
          申請が承認されませんでした
        </Typography>
        <Typography variant="body1" color="text.secondary">
          恐れ入りますが、今回のご利用申請は承認されませんでした。
          <br />
          詳細については管理者にお問い合わせください。
        </Typography>
      </CardContent>
    </Card>
  );
};

// P-001: チャット画面（状態に応じて表示を切り替え）
export const ChatPage = () => {
  const { userProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!userProfile) {
    return <ProfileForm />;
  }

  if (userProfile.status === 'pending') {
    return <PendingScreen />;
  }

  if (userProfile.status === 'rejected') {
    return <RejectedScreen />;
  }

  // approved ユーザーはUserLayoutのチャット画面へリダイレクトされる
  // ここには到達しないはず
  return null;
};
