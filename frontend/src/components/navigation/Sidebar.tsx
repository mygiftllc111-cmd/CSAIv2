import { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate, useLocation } from 'react-router-dom';
import { chatService } from '@/services/index.ts';
import type { Conversation } from '@/types/index.ts';

const DRAWER_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const userNavItems: NavItem[] = [
  { label: '新しい会話', path: '/chat', icon: <AddIcon /> },
  { label: '対話履歴', path: '/history', icon: <HistoryIcon /> },
];

export const Sidebar = ({ open, onClose, variant = 'permanent' }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convs = await chatService.getConversations();
        setRecentConversations(convs.slice(0, 5));
      } catch {
        // silently fail
      }
    };
    void loadConversations();
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (variant === 'temporary') onClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          メニュー
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1 }}>
        {userNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={
                item.path === '/chat'
                  ? location.pathname === '/chat'
                  : location.pathname === item.path
              }
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* 最近の会話 */}
      {recentConversations.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, pb: 0.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} fontSize="0.75rem">
              最近の会話
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
            {recentConversations.map((conv) => {
              const isActive = location.pathname === `/chat/${conv.conversation_id}`;
              return (
                <ListItemButton
                  key={conv.conversation_id}
                  onClick={() => handleNavigate(`/chat/${conv.conversation_id}`)}
                  sx={{
                    borderRadius: 2,
                    py: 0.75,
                    px: 1.5,
                    mb: 0.25,
                    bgcolor: isActive ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                    '&:hover': { bgcolor: isActive ? 'rgba(76, 175, 80, 0.15)' : 'action.hover' },
                  }}
                >
                  <ChatBubbleOutlineIcon
                    sx={{
                      fontSize: 16,
                      mr: 1,
                      color: isActive ? 'primary.dark' : 'text.secondary',
                      opacity: 0.6,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.8125rem',
                      color: isActive ? 'primary.dark' : 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conv.title}
                  </Typography>
                </ListItemButton>
              );
            })}
          </Box>
        </>
      )}

      <Divider />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 2,
            bgcolor: 'rgba(76, 175, 80, 0.08)',
          }}
        >
          <ChatIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            安心して質問してください
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export { DRAWER_WIDTH };
