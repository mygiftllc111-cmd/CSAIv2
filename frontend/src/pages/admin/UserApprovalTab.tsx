import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { authService } from '@/services/index.ts';
import type { UserProfile } from '@/types/index.ts';

const statusLabels: Record<string, { label: string; color: 'warning' | 'success' | 'error' }> = {
  pending: { label: '承認待ち', color: 'warning' },
  approved: { label: '承認済み', color: 'success' },
  rejected: { label: '拒否', color: 'error' },
};

export const UserApprovalTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getAllUsers();
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleApprove = async (profileId: string) => {
    try {
      setActionError(null);
      await authService.approveUser(profileId);
      await loadUsers();
    } catch {
      setActionError('承認処理に失敗しました');
    }
  };

  const handleReject = async (profileId: string) => {
    try {
      setActionError(null);
      await authService.rejectUser(profileId);
      await loadUsers();
    } catch {
      setActionError('拒否処理に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  const pendingUsers = users.filter((u) => u.status === 'pending');

  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {pendingUsers.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              新規申請（{pendingUsers.length}件）
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>名前</TableCell>
                    <TableCell>所属</TableCell>
                    <TableCell>入社時期</TableCell>
                    <TableCell>申請日時</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.profile_id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{user.join_date}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => { void handleApprove(user.profile_id); }}
                          sx={{ mr: 1 }}
                        >
                          承認
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => { void handleReject(user.profile_id); }}
                        >
                          拒否
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            全利用者一覧
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>名前</TableCell>
                  <TableCell>所属</TableCell>
                  <TableCell>入社時期</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>最終アクセス</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const status = statusLabels[user.status];
                  return (
                    <TableRow key={user.profile_id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>{user.join_date}</TableCell>
                      <TableCell>
                        {status && (
                          <Chip label={status.label} color={status.color} size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.last_accessed_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
