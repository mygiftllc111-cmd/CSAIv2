import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { chatService } from '@/services/index.ts';
import type { Conversation } from '@/types/index.ts';

export const HistoryPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await chatService.getConversations();
        setConversations(data);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 1 }} />
        <Typography color="text.secondary">まだ対話履歴がありません</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        対話履歴
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {conversations.map((conv) => (
          <Card key={conv.conversation_id} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea onClick={() => navigate(`/chat/${conv.conversation_id}`)}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                <ChatIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight={600} noWrap>
                    {conv.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {new Date(conv.created_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {conv.message_count != null && (
                      <>{` ・ ${conv.message_count}件のメッセージ`}</>
                    )}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: 'text.secondary', opacity: 0.3 }} />
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
