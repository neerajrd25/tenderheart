import { Box, Chip, Paper, Stack, Typography, Avatar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HotelIcon from '@mui/icons-material/Hotel';
import SpaIcon from '@mui/icons-material/Spa';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PaletteIcon from '@mui/icons-material/Palette';
import { brand, getGenderPalette } from '../theme.js';
import { formatLongDate } from '../utils/time.js';

function Row({ label, value }) {
  const hasValue = value && value !== '—' && value !== 'Not recorded';
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      spacing={2}
      sx={{ py: 0.9, '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' } }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={hasValue ? 700 : 400}
        textAlign="right"
        color={hasValue ? 'text.primary' : 'text.disabled'}
        sx={{ wordBreak: 'break-word' }}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}

function Section({ icon, title, children, accent }) {
  return (
    <Box sx={{ mt: 2.25 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, color: accent }}>
        <Box sx={{ display: 'flex' }}>{icon}</Box>
        <Typography variant="overline" sx={{ lineHeight: 1, color: 'inherit' }}>
          {title}
        </Typography>
      </Stack>
      <Box sx={{ borderRadius: '14px', px: 1.75, py: 0.5, bgcolor: brand.cream }}>
        {children}
      </Box>
    </Box>
  );
}

// Mirrors the email layout so staff can preview what the parent will receive.
export default function ReportPreview({ child, date, values, restDuration, status, sentAt }) {
  const palette = getGenderPalette(child.gender);
  const sent = status === 'SENT';
  const absent = values.attendance === 'Absent';

  return (
    <Paper
      elevation={0}
      sx={{ border: '1.5px solid', borderColor: sent ? brand.sageBorder : 'divider', overflow: 'hidden' }}
      className="print-report"
    >
      <Box sx={{ background: brand.logoGradient, px: 2.5, py: 2.5, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#fff' }}>{brand.name}</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)' }}>Daily report</Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={child.photo || undefined}
            sx={{
              width: 48, height: 48, bgcolor: palette.softMid, color: palette.text,
              fontWeight: 800, fontSize: '1.2rem', border: `2px solid ${palette.border}`,
            }}
          >
            {child.name?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" noWrap>{child.name}</Typography>
            <Typography variant="body2" color="text.secondary">{formatLongDate(date)}</Typography>
          </Box>
        </Stack>
        <Chip
          size="small"
          color={sent ? 'success' : 'default'}
          icon={sent ? <CheckCircleIcon /> : undefined}
          label={sent ? 'Sent to parent' : 'Preview, not sent yet'}
          sx={{ mt: 1.5 }}
        />

        <Section title="Attendance" icon={<AccessTimeIcon sx={{ fontSize: 16 }} />} accent={palette.main}>
          <Row label="Status" value={values.attendance} />
          {!absent && <Row label="Time in" value={values.timeIn} />}
          {!absent && <Row label="Time out" value={values.timeOut} />}
        </Section>

        {!absent && (
          <>
            <Section title="Meals" icon={<RestaurantIcon sx={{ fontSize: 16 }} />} accent={brand.accents.meals}>
              <Row label="Breakfast" value={values.breakfast} />
              {values.breakfastNote && <Row label="↳ Note" value={values.breakfastNote} />}
              <Row label="Lunch" value={values.lunch} />
              {values.lunchNote && <Row label="↳ Note" value={values.lunchNote} />}
              <Row label="Evening snacks" value={values.eveningSnacks} />
              {values.eveningSnacksNote && <Row label="↳ Note" value={values.eveningSnacksNote} />}
            </Section>

            <Section title="Rest" icon={<HotelIcon sx={{ fontSize: 16 }} />} accent={brand.accents.rest}>
              <Row label="Start" value={values.restStart} />
              <Row label="End" value={values.restEnd} />
              <Row label="Duration" value={restDuration} />
            </Section>

            <Section title="Bowel habits" icon={<SpaIcon sx={{ fontSize: 16 }} />} accent={brand.accents.bowel}>
              <Row label="Type" value={values.bowelHabitsType} />
              {values.bowelHabitsNote && <Row label="Note" value={values.bowelHabitsNote} />}
            </Section>

            {values.activities && (
              <Section title="Activities" icon={<PaletteIcon sx={{ fontSize: 16 }} />} accent={brand.accents.rest}>
                <Typography variant="body2" sx={{ py: 0.9 }}>{values.activities}</Typography>
              </Section>
            )}
          </>
        )}

        <Section title="Notes from staff" icon={<EditNoteIcon sx={{ fontSize: 16 }} />} accent={brand.accents.notes}>
          <Typography
            variant="body2"
            sx={{ py: 0.9, whiteSpace: 'pre-wrap', color: values.notes ? 'text.primary' : 'text.disabled' }}
          >
            {values.notes || 'No additional notes for today.'}
          </Typography>
        </Section>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          {sent && sentAt
            ? `Sent ${new Date(sentAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
            : 'Live preview. It updates as you fill in the report.'}
        </Typography>
      </Box>
    </Paper>
  );
}
