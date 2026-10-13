import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Box, Typography, Stack, Alert } from '@mui/material';
import Logo from '../components/Logo.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';
import { brand } from '../theme.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { loginWithCredential } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSuccess(credentialResponse) {
    setError('');
    setLoading(true);
    try {
      await loginWithCredential(credentialResponse.credential);
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: brand.heroGradient,
        px: 3,
        pt: 'calc(24px + env(safe-area-inset-top, 0px))',
        pb: `calc(20px + ${brand.safeBottom})`,
      }}
    >
      {/* Brand block, vertically centred in the space above the sign-in area */}
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2.5}
        className="anim-fade-in-up"
        sx={{ flexGrow: 1, textAlign: 'center', maxWidth: 420, mx: 'auto', width: '100%' }}
      >
        <Box sx={{ borderRadius: '26px', boxShadow: brand.raisedShadow }}>
          <Logo size={88} />
        </Box>

        <Box>
          <Typography variant="h4" component="h1" sx={{ fontSize: '2.25rem', lineHeight: 1.1 }}>
            {brand.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.04em' }}>
            {brand.byline}
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 300 }}>
          Every child&apos;s day, lovingly noted and shared with their parents.
        </Typography>
      </Stack>

      {/* Sign-in sits at the bottom, under the thumb */}
      <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 420, mx: 'auto', width: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            width: '100%', p: 2, borderRadius: '20px', bgcolor: '#fff',
            boxShadow: brand.cardShadow,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25,
            opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
          }}
        >
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Google sign-in was cancelled or failed.')}
            size="large"
            width="280"
            text="signin_with"
            shape="pill"
          />
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Use your daycare staff Google account.
          </Typography>
        </Box>

        <InstallPrompt sx={{ width: '100%' }} />
      </Stack>
    </Box>
  );
}
