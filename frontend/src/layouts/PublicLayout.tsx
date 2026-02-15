import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/navigation/Header.tsx';

export const PublicLayout = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      <Toolbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
