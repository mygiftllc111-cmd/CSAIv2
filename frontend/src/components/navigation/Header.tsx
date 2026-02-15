import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SpaIcon from '@mui/icons-material/Spa';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  children?: React.ReactNode;
}

export const Header = ({
  title = 'Hospitality AI',
  onMenuClick,
  showMenuButton = false,
  children,
}: HeaderProps) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {showMenuButton && (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="メニュー"
            onClick={onMenuClick}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        )}
        <SpaIcon sx={{ color: 'primary.main', mr: 1 }} />
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'primary.dark' }}>
          {title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {children}
      </Toolbar>
    </AppBar>
  );
};
