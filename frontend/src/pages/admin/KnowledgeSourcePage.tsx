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
  TextField,
  MenuItem,
  Divider,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import StorageIcon from '@mui/icons-material/Storage';
import { adminService } from '@/services/index.ts';
import type { KnowledgeSource, KnowledgeSourceStatus } from '@/types/index.ts';

const SYNC_INTERVALS = [
  { value: 30, label: '30分' },
  { value: 60, label: '1時間' },
  { value: 120, label: '2時間' },
  { value: 360, label: '6時間' },
  { value: 720, label: '12時間' },
  { value: 1440, label: '24時間' },
];

const statusConfig: Record<KnowledgeSourceStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  active: { label: '正常', color: 'success' },
  syncing: { label: '同期中', color: 'warning' },
  error: { label: 'エラー', color: 'error' },
};

const sourceTypeLabels: Record<string, string> = {
  notion: 'Notion',
  google_drive: 'Google Drive',
};

export const KnowledgeSourcePage = () => {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadSources();
  }, []);

  const loadSources = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getKnowledgeSources();
      setSources(data);
    } catch {
      setError('ナレッジソースの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async (sourceId: string) => {
    setSyncingIds(prev => new Set([...prev, sourceId]));
    setError(null);
    try {
      const updated = await adminService.syncKnowledgeSource(sourceId);
      setSources(prev => prev.map(s => s.source_id === sourceId ? updated : s));
      setSuccessMsg('同期が完了しました');
    } catch {
      setError('同期に失敗しました');
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  };

  const handleIntervalChange = async (sourceId: string, interval: number) => {
    try {
      const updated = await adminService.updateKnowledgeSource(sourceId, { sync_interval_minutes: interval });
      setSources(prev => prev.map(s => s.source_id === sourceId ? updated : s));
      setSuccessMsg('同期間隔を更新しました');
    } catch {
      setError('設定の更新に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          ナレッジソース設定
        </Typography>
        <Chip
          icon={<StorageIcon />}
          label={`${sources.reduce((sum, s) => sum + s.document_count, 0)} ドキュメント`}
          variant="outlined"
          size="small"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {sources.map((source) => {
        const status = statusConfig[source.status];
        const isSyncing = syncingIds.has(source.source_id);

        return (
          <Card key={source.source_id} sx={{ mb: 3 }}>
            <CardContent>
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {sourceTypeLabels[source.type] ?? source.type}
                  </Typography>
                  <Chip
                    label={isSyncing ? '同期中...' : status.label}
                    color={isSyncing ? 'warning' : status.color}
                    size="small"
                  />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={isSyncing ? <CircularProgress size={16} /> : <SyncIcon />}
                  onClick={() => { void handleSync(source.source_id); }}
                  disabled={isSyncing}
                >
                  {isSyncing ? '同期中...' : '手動再同期'}
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Connection info */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                {Object.entries(source.connection_config).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
                      {key === 'integration_token' ? 'Integration Token' :
                       key === 'target_pages' ? '対象ページ' :
                       key === 'service_account' ? 'サービスアカウント' :
                       key === 'target_folder' ? '対象フォルダ' :
                       key}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Sync info */}
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    最終同期
                  </Typography>
                  <Typography variant="body2">
                    {source.last_synced_at
                      ? new Date(source.last_synced_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '未同期'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    ドキュメント数
                  </Typography>
                  <Typography variant="body2">
                    {source.document_count} 件
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    自動同期間隔
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={source.sync_interval_minutes}
                    onChange={(e) => { void handleIntervalChange(source.source_id, Number(e.target.value)); }}
                    sx={{ minWidth: 120 }}
                  >
                    {SYNC_INTERVALS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}

      {sources.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <StorageIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
            <Typography color="text.secondary">
              ナレッジソースが設定されていません
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
