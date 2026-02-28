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
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
  const [folderEdits, setFolderEdits] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

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
      if (updated.status === 'error') {
        setError(`同期に失敗しました${updated.last_error ? `：${updated.last_error}` : ''}`);
      } else {
        setSuccessMsg('同期が完了しました');
      }
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

  const handleTargetFolderEdit = (sourceId: string, value: string) => {
    setFolderEdits(prev => ({ ...prev, [sourceId]: value }));
  };

  const handleSaveTargetFolder = async (sourceId: string) => {
    setSavingIds(prev => new Set([...prev, sourceId]));
    setError(null);
    try {
      const source = sources.find((s) => s.source_id === sourceId);
      if (!source) return;
      const newConfig = { ...source.connection_config, target_folder: folderEdits[sourceId] };
      const updated = await adminService.updateKnowledgeSource(sourceId, { connection_config: newConfig });
      setSources(prev => prev.map(s => s.source_id === sourceId ? updated : s));
      setSuccessMsg('対象フォルダを更新しました');
    } catch {
      setError('対象フォルダの更新に失敗しました');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setIsUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await adminService.uploadKnowledgeFile(uploadFile);
      setUploadResult(`「${result.title}」をアップロードしました（${result.chunk_count} チャンク）`);
      setUploadFile(null);
      void loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
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

      {/* ファイルアップロードセクション */}
      <Card sx={{ mb: 3, border: '1px dashed', borderColor: 'primary.light' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <UploadFileIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>ファイルアップロード</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            .txt / .md / .csv / .html / .json ファイルを直接ナレッジとして登録します（最大5MB）
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" component="label" size="small" disabled={isUploading}>
              ファイルを選択
              <input
                type="file"
                hidden
                accept=".txt,.md,.csv,.html,.json"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            {uploadFile && (
              <Typography variant="body2" sx={{ flex: 1 }}>{uploadFile.name}</Typography>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={isUploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
              disabled={!uploadFile || isUploading}
              onClick={() => { void handleFileUpload(); }}
            >
              {isUploading ? 'アップロード中...' : 'アップロード'}
            </Button>
          </Box>
          {uploadResult && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={() => setUploadResult(null)}>
              {uploadResult}
            </Alert>
          )}
        </CardContent>
      </Card>

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

              {/* Error detail */}
              {source.status === 'error' && source.last_error && (
                <Alert severity="error" sx={{ mb: 2 }} icon={false}>
                  <Typography variant="caption" fontWeight={600}>同期エラー詳細</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 0.5 }}>
                    {source.last_error}
                  </Typography>
                </Alert>
              )}

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
                    {key === 'target_folder' && source.type === 'google_drive' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          size="small"
                          value={folderEdits[source.source_id] ?? value}
                          onChange={e => handleTargetFolderEdit(source.source_id, e.target.value)}
                          sx={{ minWidth: 220 }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          disabled={savingIds.has(source.source_id) || (folderEdits[source.source_id] ?? value) === value}
                          onClick={() => { void handleSaveTargetFolder(source.source_id); }}
                        >
                          {savingIds.has(source.source_id) ? '保存中...' : '保存'}
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {value}
                      </Typography>
                    )}
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
