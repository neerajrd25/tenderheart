import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import GetAppIcon from '@mui/icons-material/GetApp';
import Logo from './Logo.jsx';
import { brand } from '../theme.js';
import {
  canPromptInstall, isIosSafari, isStandalone, promptInstall, subscribeInstall,
} from '../utils/install.js';

const DISMISS_KEY = 'tenderheart.installDismissed';

function wasDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

// "Add TenderHeart to your home screen" card. Shows a real install button where the
// browser supports one (Android/Chrome) and step-by-step instructions on iPhone.
export default function InstallPrompt({ sx }) {
  const [promptable, setPromptable] = useState(canPromptInstall());
  const [dismissed, setDismissed] = useState(wasDismissed());

  useEffect(() => subscribeInstall(() => setPromptable(canPromptInstall())), []);

  if (dismissed || isStandalone()) return null;
  const ios = isIosSafari();
  if (!promptable && !ios) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
    setDismissed(true);
  }

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        p: 1.5, borderRadius: '16px',
        bgcolor: '#fff', border: '1.5px solid', borderColor: 'divider',
        boxShadow: brand.cardShadow, textAlign: 'left',
        ...sx,
      }}
    >
      <Logo size={44} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ lineHeight: 1.25 }}>
          Install {brand.name}
        </Typography>
        {ios ? (
          <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap spacing={0.5}>
            <Typography variant="caption" color="text.secondary">Tap</Typography>
            <IosShareIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              then &ldquo;Add to Home Screen&rdquo;
            </Typography>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Open it from your home screen like an app
          </Typography>
        )}
      </Box>
      {!ios && (
        <Button
          variant="contained" size="small" startIcon={<GetAppIcon />}
          onClick={promptInstall} sx={{ flexShrink: 0 }}
        >
          Install
        </Button>
      )}
      <IconButton aria-label="Dismiss" onClick={dismiss} size="small" sx={{ flexShrink: 0, color: 'text.secondary' }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
