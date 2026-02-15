import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.ts';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproved?: boolean;
}

export const ProtectedRoute = ({ children, requireApproved = true }: ProtectedRouteProps) => {
  const { userProfile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!userProfile) {
    return <Navigate to="/" replace />;
  }

  if (requireApproved && userProfile.status !== 'approved') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
