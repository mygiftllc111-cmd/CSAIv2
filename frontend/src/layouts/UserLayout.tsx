import { useState } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/navigation/Header.tsx';
import { Sidebar, DRAWER_WIDTH } from '@/components/navigation/Sidebar.tsx';
import { useAuth } from '@/hooks/useAuth.ts';

export const UserLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { userProfile } = useAuth();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header
        title="Hospitality AI"
        showMenuButton
        onMenuClick={() => setMobileOpen(!mobileOpen)}
      >
        {userProfile && (
          <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {userProfile.name}さん
          </Box>
        )}
      </Header>

      {/* モバイル用サイドバー */}
      {isMobile && (
        <Sidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
        />
      )}

      {/* デスクトップ用サイドバー */}
      {!isMobile && (
        <Sidebar
          open
          onClose={() => {}}
          variant="permanent"
        />
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
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
