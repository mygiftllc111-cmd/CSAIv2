import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.ts';
import { Box, CircularProgress } from '@mui/material';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { adminSession, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!adminSession?.authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};
