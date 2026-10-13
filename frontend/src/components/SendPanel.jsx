import {
  Alert, Box, Button, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import { brand } from '../theme.js';
import { formatTimeDisplay } from '../utils/time.js';

export default function SendPanel({ child, report, checklist, absent, sending, onSend, onRetry, onRefresh }) {
  const status = report?.status;
  const ready  = checklist.every((item) => item.done);

  if (status === 'SENT') {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1.5px solid', borderColor: brand.sageBorder, bgcolor: brand.sageSoft }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 44, height: 44, borderRadius: '14px', flexShrink: 0, bgcolor: 'success.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MarkEmailReadIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ color: brand.sageText, lineHeight: 1.25 }}>
              Report sent
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
              To {child.parentEmail}{report.sentAt ? ` at ${formatTimeDisplay(report.sentAt)}` : ''}. It can no longer be edited.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  if (status === 'SENDING') {
    return (
      <Alert
        severity="info"
        icon={<CircularProgress size={18} />}
        action={<Button color="inherit" size="small" onClick={onRefresh}>Refresh</Button>}
      >
        Sending now. Please don&apos;t send again.
      </Alert>
    );
  }

  if (status === 'SEND_FAILED') {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1.5px solid', borderColor: 'error.light', bgcolor: '#FDF1F0' }}>
        <Typography variant="subtitle1" color="error.dark">The email didn&apos;t go through</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, wordBreak: 'break-word' }}>
          The report is saved. Try sending to {child.parentEmail} again.
        </Typography>
        <Button
          fullWidth variant="contained" color="error" size="large"
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <ReplayIcon />}
          disabled={sending}
          onClick={onRetry}
        >
          {sending ? 'Retrying…' : 'Retry send'}
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1.5px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ lineHeight: 1.25 }}>Send to parent</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {absent ? `Lets them know ${child.name} was marked absent today.` : `Once ${child.name} has gone home.`}
      </Typography>

      <Stack spacing={0.75} sx={{ mb: 2 }}>
        {checklist.map((item) => (
          <Stack key={item.label} direction="row" spacing={1} alignItems="center">
            {item.done
              ? <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
              : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />}
            <Typography variant="body2" fontWeight={600} color={item.done ? 'text.primary' : 'text.secondary'}>
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Button
        fullWidth variant="contained" color="secondary" size="large"
        startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
        disabled={sending || !ready}
        onClick={onSend}
      >
        {sending ? 'Sending…' : 'Send report to parent'}
      </Button>

      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ mt: 1.25 }}>
        <ScheduleSendIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          {ready
            ? 'If you forget, it goes out automatically at 7 pm.'
            : 'Finish the list above. Complete reports go out automatically at 7 pm.'}
        </Typography>
      </Stack>
    </Paper>
  );
}
