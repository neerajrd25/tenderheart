import { AppBar, Toolbar, Typography, Avatar, IconButton, Tooltip, Box, Container } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Logo from './Logo.jsx';
import { brand } from '../theme.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <AppBar
      position="sticky"
      color="default"
      sx={{
        bgcolor: 'rgba(255,248,242,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: 1100,
        pt: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Toolbar sx={{ gap: 1.25, minHeight: 56, px: 2 }}>
          <Logo size={34} />

          <Typography
            sx={{
              flexGrow: 1,
              fontFamily: brand.headingFont,
              fontWeight: 700,
              fontSize: '1.2rem',
              letterSpacing: '-0.3px',
              color: 'text.primary',
            }}
            noWrap
          >
            {brand.name}
          </Typography>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Avatar
                src={user.picture || undefined}
                alt={user.name}
                sx={{
                  width: 34, height: 34, fontSize: '0.85rem', fontWeight: 800,
                  bgcolor: brand.softTint, color: 'primary.dark',
                  border: '2px solid', borderColor: 'primary.light',
                }}
              >
                {user.name?.[0]}
              </Avatar>

              <Tooltip title="Sign out">
                <IconButton
                  onClick={logout}
                  aria-label="Sign out"
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                >
                  <LogoutIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
