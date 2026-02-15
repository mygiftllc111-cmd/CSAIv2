import { useState } from 'react';
import { Box, Toolbar, Button, useMediaQuery, useTheme, Chip } from '@mui/material';
import { Outlet } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Header } from '@/components/navigation/Header.tsx';
import { AdminSidebar, ADMIN_DRAWER_WIDTH } from '@/components/navigation/AdminSidebar.tsx';
import { useAuth } from '@/hooks/useAuth.ts';

export const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { adminLogout } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header
        title="管理画面"
        showMenuButton
        onMenuClick={() => setMobileOpen(!mobileOpen)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<AdminPanelSettingsIcon />}
            label="管理者"
            size="small"
            color="secondary"
            variant="outlined"
          />
          <Button
            size="small"
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={() => { void adminLogout(); }}
            sx={{ color: 'text.secondary' }}
          >
            ログアウト
          </Button>
        </Box>
      </Header>

      {isMobile && (
        <AdminSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
        />
      )}

      {!isMobile && (
        <AdminSidebar
          open
          onClose={() => {}}
          variant="permanent"
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${ADMIN_DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
