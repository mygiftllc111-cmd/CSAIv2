import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { adminService } from '@/services/index.ts';
import type { ConversationLog, LogFilter, Message, FrequentQuestion } from '@/types/index.ts';

const DEPARTMENTS = ['', '研修チーム', 'カスタマーサポート', '営業部'];
const JOIN_DATES = ['', '2026-01', '2026-02', '2026-03'];

export const LogAnalysisPage = () => {
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMessages, setDetailMessages] = useState<Message[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState<FrequentQuestion[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<LogFilter>({
    department: undefined,
    join_date: undefined,
    date_from: undefined,
    date_to: undefined,
  });

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getConversationLogs(filter);
      setLogs(data);
    } catch {
      setError('ログの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleExpand = async (conversationId: string) => {
    if (expandedId === conversationId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(conversationId);
    setDetailLoading(true);
    try {
      const messages = await adminService.getLogDetail(conversationId);
      setDetailMessages(messages);
    } catch {
      setDetailMessages([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setShowAnalytics(!showAnalytics);
    if (frequentQuestions.length === 0) {
      const data = await adminService.getFrequentQuestions();
      setFrequentQuestions(data);
    }
  };

  const handleFilterChange = (key: keyof LogFilter, value: string) => {
    setFilter(prev => ({ ...prev, [key]: value || undefined }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          対話ログ分析
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={showAnalytics ? 'contained' : 'outlined'}
            size="small"
            startIcon={<TrendingUpIcon />}
            onClick={() => { void loadAnalytics(); }}
          >
            よくある質問
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => { void loadLogs(); }}
          >
            更新
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Analytics section */}
      <Collapse in={showAnalytics}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              よくある質問ランキング
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={50}>#</TableCell>
                    <TableCell>質問内容</TableCell>
                    <TableCell>カテゴリ</TableCell>
                    <TableCell align="right">回数</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {frequentQuestions.map((q, i) => (
                    <TableRow key={q.question}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{q.question}</TableCell>
                      <TableCell>
                        <Chip label={q.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{q.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Collapse>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterListIcon color="action" />
            <Typography variant="subtitle2" fontWeight={600}>
              フィルタ
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              label="所属"
              size="small"
              value={filter.department ?? ''}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">すべて</MenuItem>
              {DEPARTMENTS.filter(Boolean).map(d => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="入会時期"
              size="small"
              value={filter.join_date ?? ''}
              onChange={(e) => handleFilterChange('join_date', e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">すべて</MenuItem>
              {JOIN_DATES.filter(Boolean).map(d => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="開始日"
              size="small"
              value={filter.date_from ?? ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              type="date"
              label="終了日"
              size="small"
              value={filter.date_to ?? ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Log list */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            対話ログ一覧（{logs.length}件）
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              該当するログがありません
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={48} />
                    <TableCell>日時</TableCell>
                    <TableCell>利用者名</TableCell>
                    <TableCell>所属</TableCell>
                    <TableCell>入会時期</TableCell>
                    <TableCell>質問概要</TableCell>
                    <TableCell align="right">メッセージ数</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <LogRow
                      key={log.conversation_id}
                      log={log}
                      isExpanded={expandedId === log.conversation_id}
                      detailMessages={expandedId === log.conversation_id ? detailMessages : []}
                      detailLoading={expandedId === log.conversation_id && detailLoading}
                      onToggle={() => { void handleExpand(log.conversation_id); }}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

interface LogRowProps {
  log: ConversationLog;
  isExpanded: boolean;
  detailMessages: Message[];
  detailLoading: boolean;
  onToggle: () => void;
}

const LogRow = ({ log, isExpanded, detailMessages, detailLoading, onToggle }: LogRowProps) => {
  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > *': { borderBottom: isExpanded ? 'none' : undefined } }}
        onClick={onToggle}
      >
        <TableCell>
          <IconButton size="small">
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          {new Date(log.created_at).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </TableCell>
        <TableCell>{log.user_name}</TableCell>
        <TableCell>{log.department}</TableCell>
        <TableCell>{log.join_date}</TableCell>
        <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {log.first_message}
        </TableCell>
        <TableCell align="right">{log.message_count}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, px: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ px: 4, py: 2, bgcolor: 'action.hover' }}>
              {detailLoading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                    {log.title}
                  </Typography>
                  {detailMessages.map((msg) => (
                    <Box
                      key={msg.message_id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Chip
                        label={msg.role === 'user' ? '利用者' : 'AI'}
                        size="small"
                        color={msg.role === 'user' ? 'primary' : 'secondary'}
                        sx={{ mb: 0.5 }}
                      />
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          maxWidth: '80%',
                          bgcolor: msg.role === 'user' ? 'primary.50' : 'background.paper',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        <Typography variant="body2">{msg.content}</Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};
