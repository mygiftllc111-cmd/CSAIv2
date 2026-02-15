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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '@/hooks/useAuth.ts';
import { useNavigate } from 'react-router-dom';

export const AdminLoginPage = () => {
  const [password, setPassword] = useState('');
  const { adminLogin, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await adminLogin(password);
      navigate('/admin');
    } catch {
      // エラーはストアで管理
    }
  };

  return (
    <Card sx={{ maxWidth: 400, width: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            管理者ログイン
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            パスワードを入力してください
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="パスワード"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            fullWidth
            size="large"
            disabled={isLoading || !password}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
