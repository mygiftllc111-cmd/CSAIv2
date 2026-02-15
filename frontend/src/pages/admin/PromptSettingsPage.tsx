import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Collapse,
  Paper,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { adminService } from '@/services/index.ts';
import type { PromptConfig, FewShotExample } from '@/types/index.ts';

export const PromptSettingsPage = () => {
  const [config, setConfig] = useState<PromptConfig | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [fewShotExamples, setFewShotExamples] = useState<FewShotExample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<PromptConfig[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    void loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getPromptConfig();
      setConfig(data);
      setSystemPrompt(data.system_prompt);
      setFewShotExamples([...data.few_shot_examples]);
      setHasChanges(false);
    } catch {
      setError('プロンプト設定の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await adminService.updatePromptConfig(systemPrompt, fewShotExamples);
      setConfig(updated);
      setHasChanges(false);
      setSuccessMsg(`バージョン ${updated.version} として保存しました`);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadHistory = async () => {
    setShowHistory(!showHistory);
    if (history.length === 0) {
      const data = await adminService.getPromptHistory();
      setHistory(data);
    }
  };

  const handleRestoreVersion = (version: PromptConfig) => {
    setSystemPrompt(version.system_prompt);
    setFewShotExamples([...version.few_shot_examples]);
    setHasChanges(true);
    setShowHistory(false);
  };

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    setHasChanges(true);
  };

  const handleExampleChange = (index: number, field: keyof FewShotExample, value: string) => {
    const updated = [...fewShotExamples];
    updated[index] = { ...updated[index], [field]: value };
    setFewShotExamples(updated);
    setHasChanges(true);
  };

  const handleAddExample = () => {
    setFewShotExamples([...fewShotExamples, { user_message: '', assistant_message: '' }]);
    setHasChanges(true);
  };

  const handleDeleteExample = (index: number) => {
    setFewShotExamples(fewShotExamples.filter((_, i) => i !== index));
    setHasChanges(true);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            プロンプト設定
          </Typography>
          {config && (
            <Chip label={`v${config.version}`} size="small" color="secondary" variant="outlined" />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={showHistory ? 'contained' : 'outlined'}
            size="small"
            startIcon={<HistoryIcon />}
            onClick={() => { void handleLoadHistory(); }}
          >
            変更履歴
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={() => { void handleSave(); }}
            disabled={isSaving || !hasChanges}
          >
            保存
          </Button>
        </Box>
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

      {/* Version history */}
      <Collapse in={showHistory}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              変更履歴
            </Typography>
            {history.map((ver) => (
              <VersionHistoryItem
                key={ver.config_id}
                version={ver}
                isCurrent={ver.version === config?.version}
                onRestore={() => handleRestoreVersion(ver)}
              />
            ))}
          </CardContent>
        </Card>
      </Collapse>

      {/* System prompt */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            システムプロンプト
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={8}
            maxRows={20}
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            placeholder="システムプロンプトを入力..."
            sx={{
              '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.875rem' },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {systemPrompt.length} 文字
          </Typography>
        </CardContent>
      </Card>

      {/* Few-shot examples */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Few-shot例（{fewShotExamples.length}件）
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddExample}
            >
              追加
            </Button>
          </Box>

          {fewShotExamples.map((example, index) => (
            <Box key={index} sx={{ mb: 3 }}>
              {index > 0 && <Divider sx={{ mb: 3 }} />}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  例 {index + 1}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteExample(index)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              <TextField
                label="ユーザーメッセージ"
                multiline
                fullWidth
                minRows={2}
                value={example.user_message}
                onChange={(e) => handleExampleChange(index, 'user_message', e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="アシスタント応答"
                multiline
                fullWidth
                minRows={3}
                value={example.assistant_message}
                onChange={(e) => handleExampleChange(index, 'assistant_message', e.target.value)}
              />
            </Box>
          ))}

          {fewShotExamples.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Few-shot例がありません。「追加」ボタンで作成してください。
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

interface VersionHistoryItemProps {
  version: PromptConfig;
  isCurrent: boolean;
  onRestore: () => void;
}

const VersionHistoryItem = ({ version, isCurrent, onRestore }: VersionHistoryItemProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper variant="outlined" sx={{ mb: 1, p: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Chip
            label={`v${version.version}`}
            size="small"
            color={isCurrent ? 'secondary' : 'default'}
          />
          <Typography variant="body2" color="text.secondary">
            {new Date(version.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            by {version.updated_by}
          </Typography>
          {isCurrent && (
            <Chip label="現在" size="small" color="success" variant="outlined" />
          )}
        </Box>
        {!isCurrent && (
          <Button size="small" variant="outlined" onClick={onRestore}>
            復元
          </Button>
        )}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5, pl: 5 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            システムプロンプト（先頭200文字）
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
            {version.system_prompt.slice(0, 200)}
            {version.system_prompt.length > 200 ? '...' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Few-shot例: {version.few_shot_examples.length}件
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};
