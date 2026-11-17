import { useState } from 'react';
import { Card, CardActionArea, Box, Avatar, Typography, Stack, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { brand, getGenderPalette } from '../theme.js';
import { calculateAge, formatTimeDisplay } from '../utils/time.js';
import { getDashboardGroup } from '../utils/reportStatus.js';

// What staff should do next for this child, so the card answers "what now?" at a glance.
const NEXT_STEP = {
  NOT_STARTED: { label: 'Check in',     color: 'primary' },
  IN_PROGRESS: { label: 'Fill report',  color: 'warning' },
  READY:       { label: 'Send report',  color: 'info' },
  FAILED:      { label: 'Retry send',   color: 'error' },
  SENT:        { label: 'Sent',         color: 'success' },
};

function TimeCell({ icon, label, iso, tint }) {
  const has = !!iso;
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', color: has ? tint : 'text.disabled' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.1} sx={{ fontSize: '0.75rem' }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={has ? 800 : 500} color={has ? 'text.primary' : 'text.disabled'} noWrap>
          {has ? formatTimeDisplay(iso) : '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function ChildCard({ child, report, onClick, onDelete }) {
  const palette = getGenderPalette(child.gender);
  const age     = calculateAge(child.dateOfBirth);
  const absent  = report?.attendance === 'Absent' && report?.status !== 'NOT_STARTED';
  const group   = getDashboardGroup(report);
  const step    = absent && group !== 'SENT' && group !== 'FAILED'
    ? { label: 'Absent · send', color: 'info' }
    : NEXT_STEP[group];
  const isSent  = group === 'SENT';

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRemoveClick(event) {
    event.stopPropagation();
    setMenuAnchor(null);
    setConfirmOpen(true);
  }

  function handleConfirmRemove() {
    setConfirmOpen(false);
    onDelete?.(child);
  }

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        border: '1.5px solid',
        borderColor: isSent ? brand.sageBorder : 'divider',
        bgcolor: isSent ? brand.sageSoft : '#fff',
        boxShadow: isSent ? 'none' : brand.cardShadow,
      }}
    >
      {onDelete && (
        <IconButton
          aria-label={`More options for ${child.name}`}
          onClick={(event) => { event.stopPropagation(); setMenuAnchor(event.currentTarget); }}
          sx={{ position: 'absolute', top: 6, right: 6, zIndex: 1 }}
          size="small"
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleRemoveClick}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Remove child</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove {child.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {child.name} will be removed from the roster and won&apos;t receive any more daily reports.
            Their past reports are kept for your records.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ flex: 1 }}>Cancel</Button>
          <Button onClick={handleConfirmRemove} color="error" variant="contained" sx={{ flex: 1 }}>Remove</Button>
        </DialogActions>
      </Dialog>

      <CardActionArea onClick={onClick} sx={{ p: 1.75, pr: onDelete ? 4.75 : 1.75, display: 'block' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={child.photo || undefined}
            alt={child.name}
            sx={{
              width: 54, height: 54, flexShrink: 0,
              bgcolor: palette.softMid, color: palette.text,
              fontSize: '1.35rem', fontWeight: 800,
              border: `2px solid ${palette.border}`,
            }}
          >
            {child.name?.[0]?.toUpperCase()}
          </Avatar>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25 }} noWrap>
              {child.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {[age, child.parentName].filter(Boolean).join(' · ') || '—'}
            </Typography>
          </Box>

          {/* Next step pill */}
          <Stack
            direction="row" alignItems="center" spacing={0.25}
            sx={(theme) => ({
              flexShrink: 0, pl: 1.25, pr: 0.5, height: 32, borderRadius: 999,
              bgcolor: isSent ? 'transparent' : theme.palette[step.color].main,
              color: isSent ? brand.sageText : '#fff',
            })}
          >
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
              {step.label}
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </Stack>
        </Stack>

        {!absent && (
          <Stack
            direction="row"
            divider={<Box sx={{ width: '1px', bgcolor: 'divider', mx: 1.5, alignSelf: 'stretch' }} />}
            sx={{ mt: 1.5, px: 1.5, py: 1, borderRadius: '12px', bgcolor: isSent ? 'rgba(255,255,255,0.6)' : brand.cream }}
          >
            <TimeCell icon={<LoginIcon sx={{ fontSize: 17 }} />} label="In" iso={report?.timeIn} tint={palette.main} />
            <TimeCell icon={<LogoutIcon sx={{ fontSize: 17 }} />} label="Out" iso={report?.timeOut} tint={palette.main} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.1} sx={{ fontSize: '0.75rem' }}>
                Rest
              </Typography>
              <Typography
                variant="body2" noWrap
                fontWeight={report?.restDuration ? 800 : 500}
                color={report?.restDuration ? 'text.primary' : 'text.disabled'}
              >
                {report?.restDuration || '—'}
              </Typography>
            </Box>
          </Stack>
        )}
      </CardActionArea>
    </Card>
  );
}
