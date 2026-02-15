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
import PeopleIcon from '@mui/icons-material/People';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TuneIcon from '@mui/icons-material/Tune';
import StorageIcon from '@mui/icons-material/Storage';
import { useNavigate, useLocation } from 'react-router-dom';

const ADMIN_DRAWER_WIDTH = 260;

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { label: '利用者承認', path: '/admin', icon: <PeopleIcon /> },
  { label: 'ログ分析', path: '/admin/logs', icon: <AnalyticsIcon /> },
  { label: 'プロンプト設定', path: '/admin/prompt', icon: <TuneIcon /> },
  { label: 'ナレッジソース', path: '/admin/knowledge', icon: <StorageIcon /> },
];

export const AdminSidebar = ({ open, onClose, variant = 'permanent' }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    if (variant === 'temporary') onClose();
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          管理メニュー
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, flex: 1 }}>
        {adminNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'secondary.main',
                  color: 'secondary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'secondary.contrastText' },
                  '&:hover': { bgcolor: 'secondary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: ADMIN_DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: ADMIN_DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export { ADMIN_DRAWER_WIDTH };
