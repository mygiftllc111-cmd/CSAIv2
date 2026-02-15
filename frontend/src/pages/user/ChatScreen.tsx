import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Chip,
  keyframes,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SpaIcon from '@mui/icons-material/Spa';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '@/services/index.ts';
import type { Message, KnowledgeReference } from '@/types/index.ts';

// サジェスト質問
const SUGGESTIONS = [
  '有給休暇の取り方',
  '経費精算の方法',
  '研修スケジュール',
  '社内ツールの使い方',
];

// タイピングインジケーターアニメーション
const bounce = keyframes`
  0%, 60%, 100% { opacity: 0.4; transform: scale(1); }
  30% { opacity: 1; transform: scale(1.2); }
`;

// マイク録音パルスアニメーション
const pulseMic = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 83, 80, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(239, 83, 80, 0); }
`;

// メッセージに紐づくソース情報
interface MessageWithSources extends Message {
  sources?: KnowledgeReference[];
}

// タイピングインジケーターコンポーネント
const TypingIndicator = () => (
  <Box sx={{ display: 'flex', gap: 0.5, p: 1.5 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.secondary',
          opacity: 0.4,
          animation: `${bounce} 1.4s infinite`,
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </Box>
);

// 参照ソースタグ
const SourceTags = ({ sources }: { sources: KnowledgeReference[] }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
    {sources.map((src, i) => (
      <Chip
        key={i}
        icon={<DescriptionIcon sx={{ fontSize: 14 }} />}
        label={src.source_title}
        size="small"
        variant="outlined"
        sx={{
          height: 24,
          fontSize: '0.6875rem',
          bgcolor: 'rgba(76, 175, 80, 0.08)',
          borderColor: 'transparent',
          color: 'primary.dark',
          '& .MuiChip-icon': { color: 'primary.main' },
        }}
      />
    ))}
  </Box>
);

// タイムスタンプ表示
const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

export const ChatScreen = () => {
  const { conversationId: paramConvId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageWithSources[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(paramConvId);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // URLパラメータの会話IDが変わったら会話を読み込む
  useEffect(() => {
    if (paramConvId && paramConvId !== conversationId) {
      setConversationId(paramConvId);
      const loadConversation = async () => {
        const conv = await chatService.getConversation(paramConvId);
        if (conv?.messages) {
          setMessages(conv.messages);
        }
      };
      void loadConversation();
    } else if (!paramConvId) {
      // 新しい会話
      setConversationId(undefined);
      setMessages([]);
    }
  }, [paramConvId, conversationId]);

  // スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMessage: MessageWithSources = {
      message_id: `temp-${Date.now()}`,
      role: 'user',
      content,
      input_method: text ? 'voice' : 'text',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage({
        content: userMessage.content,
        input_method: userMessage.input_method,
        conversation_id: conversationId,
      });
      const aiMessage: MessageWithSources = {
        ...response.message,
        sources: response.sources,
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (!conversationId) {
        setConversationId(response.conversation_id);
        navigate(`/chat/${response.conversation_id}`, { replace: true });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          message_id: `error-${Date.now()}`,
          role: 'assistant',
          content: '申し訳ありません、一時的にエラーが発生しました。もう一度お試しください。',
          input_method: 'text',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // 音声入力
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput((prev) => prev || '(音声入力はこのブラウザでサポートされていません)');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* メッセージエリア */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: 2, px: { xs: 0, md: 2 } }}>
        {messages.length === 0 ? (
          /* 空状態: サジェストチップ付き */
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.6,
            }}
          >
            <SpaIcon sx={{ fontSize: 64, color: 'primary.light', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              何でも気軽に質問してください
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              社内のことなら何でもお答えします
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3, justifyContent: 'center', maxWidth: 500 }}>
              {SUGGESTIONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  variant="outlined"
                  clickable
                  onClick={() => void handleSend(s)}
                  sx={{
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.dark',
                      bgcolor: 'rgba(76, 175, 80, 0.05)',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {messages.map((msg) => (
              <Box
                key={msg.message_id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  mb: 2,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: msg.role === 'user' ? 'primary.light' : 'secondary.light',
                    flexShrink: 0,
                  }}
                >
                  {msg.role === 'user' ? (
                    <PersonIcon sx={{ fontSize: 20, color: 'white' }} />
                  ) : (
                    <SpaIcon sx={{ fontSize: 20, color: 'white' }} />
                  )}
                </Box>
                <Box sx={{ maxWidth: '70%' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      borderRadius: 3,
                      borderBottomRightRadius: msg.role === 'user' ? 4 : undefined,
                      borderBottomLeftRadius: msg.role === 'assistant' ? 4 : undefined,
                      border: msg.role === 'assistant' ? '1px solid' : 'none',
                      borderColor: 'divider',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <Typography variant="body1">{msg.content}</Typography>
                  </Paper>
                  {/* 参照ソース */}
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <SourceTags sources={msg.sources} />
                  )}
                  {/* タイムスタンプ */}
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      color: 'text.secondary',
                      opacity: 0.5,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                      fontSize: '0.6875rem',
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </Typography>
                </Box>
              </Box>
            ))}
            {/* タイピングインジケーター */}
            {isLoading && (
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'secondary.light',
                    flexShrink: 0,
                  }}
                >
                  <SpaIcon sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    borderBottomLeftRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <TypingIndicator />
                </Paper>
              </Box>
            )}
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* 入力エリア */}
      <Box sx={{ px: { xs: 1, md: 3 }, pb: { xs: 1, md: 2 }, maxWidth: 800, mx: 'auto', width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            p: 1,
            px: 1.5,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 4px rgba(62, 39, 35, 0.06)',
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.15)',
            },
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end' }}>
            <TextField
              multiline
              maxRows={4}
              fullWidth
              placeholder="質問を入力してください..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="standard"
              slotProps={{ input: { disableUnderline: true } }}
              sx={{ '& .MuiInputBase-root': { fontSize: '0.9375rem', py: 0.5 } }}
            />
            <IconButton
              onClick={toggleRecording}
              aria-label={isRecording ? '音声入力停止' : '音声入力'}
              sx={{
                color: isRecording ? 'error.main' : 'text.secondary',
                bgcolor: isRecording ? 'rgba(239, 83, 80, 0.1)' : 'transparent',
                animation: isRecording ? `${pulseMic} 1.5s infinite` : 'none',
              }}
            >
              {isRecording ? <StopIcon /> : <MicIcon />}
            </IconButton>
            <IconButton
              color="primary"
              onClick={() => { void handleSend(); }}
              disabled={!input.trim() || isLoading}
              aria-label="送信"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 0.5,
            color: 'text.secondary',
            opacity: 0.4,
            fontSize: '0.6875rem',
          }}
        >
          Enter で送信 / Shift + Enter で改行
        </Typography>
      </Box>
    </Box>
  );
};
