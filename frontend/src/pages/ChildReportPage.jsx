import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Stack,
  TextField,
  Button,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Collapse,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HotelIcon from '@mui/icons-material/Hotel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SpaIcon from '@mui/icons-material/Spa';
import RefreshIcon from '@mui/icons-material/Refresh';
import Navbar from '../components/Navbar.jsx';
import ChoiceChips from '../components/ChoiceChips.jsx';
import ReportPreview from '../components/ReportPreview.jsx';
import SendPanel from '../components/SendPanel.jsx';
import { fetchChild } from '../api/children.js';
import {
  fetchDailyReport,
  saveDailyReport,
  checkIn as apiCheckIn,
  checkOut as apiCheckOut,
  startRest as apiStartRest,
  endRest as apiEndRest,
  completeAndSendReport,
  retrySendReport,
} from '../api/dailyReports.js';
import { brand, getGenderPalette } from '../theme.js';
import {
  todayIsoDate,
  isoToTimeInputValue,
  timeInputValueToIso,
  formatTimeDisplay,
  formatLongDate,
  calculateRestDurationLabel,
} from '../utils/time.js';
import { getStatusMeta } from '../utils/reportStatus.js';

// ─── Constants ────────────────────────────────────────────
const BOWEL_OPTIONS = ['None', 'Normal', 'Loose', 'Hard', 'Other'];
const MEAL_OPTIONS = ['All', 'Most', 'Half', 'Little', 'None', 'Not offered'];

const BLANK_FORM = {
  attendance: 'Present',
  timeIn: '',
  timeOut: '',
  breakfast: '',
  breakfastNote: '',
  lunch: '',
  lunchNote: '',
  eveningSnacks: '',
  eveningSnacksNote: '',
  restStart: '',
  restEnd: '',
  bowelHabitsType: 'None',
  bowelHabitsNote: '',
  notes: '',
  activities: '',
};

function reportToForm(report) {
  if (!report) return BLANK_FORM;
  return {
    attendance: report.attendance || 'Present',
    timeIn: isoToTimeInputValue(report.timeIn),
    timeOut: isoToTimeInputValue(report.timeOut),
    breakfast: report.breakfast || '',
    breakfastNote: report.breakfastNote || '',
    lunch: report.lunch || '',
    lunchNote: report.lunchNote || '',
    eveningSnacks: report.eveningSnacks || '',
    eveningSnacksNote: report.eveningSnacksNote || '',
    restStart: isoToTimeInputValue(report.restStart),
    restEnd: isoToTimeInputValue(report.restEnd),
    bowelHabitsType: report.bowelHabits?.type || 'None',
    bowelHabitsNote: report.bowelHabits?.note || '',
    notes: report.notes || '',
    activities: report.activities || '',
  };
}

function nowTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const MEALS = [
  { field: 'breakfast', noteField: 'breakfastNote', title: 'Breakfast', placeholder: 'e.g. Loved the oats' },
  { field: 'lunch', noteField: 'lunchNote', title: 'Lunch', placeholder: 'e.g. Asked for seconds' },
  { field: 'eveningSnacks', noteField: 'eveningSnacksNote', title: 'Evening snacks', placeholder: 'e.g. Biscuits and juice' },
];

// ─── Section card ─────────────────────────────────────────
function Section({ icon, title, accent, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1.5px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '12px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(accent, 0.12), color: accent,
        }}>
          {icon}
        </Box>
        <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>{title}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}

// ─── Big one-tap "stamp the time now" button ──────────────
function StampButton({ label, busyLabel, busy, icon, onClick, disabled, done }) {
  return (
    <Button
      variant={done ? 'outlined' : 'contained'}
      color="primary"
      size="large"
      startIcon={busy ? <CircularProgress size={18} color="inherit" /> : icon}
      onClick={onClick}
      disabled={disabled}
      fullWidth
      sx={{ whiteSpace: 'nowrap', px: 1 }}
    >
      {busy ? busyLabel : label}
    </Button>
  );
}

// ─── Checklist item ───────────────────────────────────────
function ChecklistItem({ done, label }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {done
        ? <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main', flexShrink: 0 }} />
        : <Box sx={{ width: 18, height: 18, m: '1px', borderRadius: '50%', border: '2px solid', borderColor: 'text.disabled', flexShrink: 0 }} />}
      <Typography variant="body2" fontWeight={600} color={done ? 'text.primary' : 'text.secondary'}>
        {label}
      </Typography>
    </Stack>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function ChildReportPage() {
  const { id: childId } = useParams();
  const navigate = useNavigate();
  const date = todayIsoDate();

  const [child, setChild] = useState(null);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);
  // `open` is separate from the content so the toast keeps its text while it animates out.
  const [snackbar, setSnackbarState] = useState({ open: false, message: '', severity: 'success' });
  const setSnackbar = (next) => setSnackbarState((prev) => (next ? { ...next, open: true } : { ...prev, open: false }));
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [childData, reportData] = await Promise.all([
        fetchChild(childId),
        fetchDailyReport(childId, date),
      ]);
      setChild(childData);
      setReport(reportData);
      setForm(reportToForm(reportData));
    } catch {
      setError('Could not load this child\u2019s report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [childId, date]);

  useEffect(() => { load(); }, [load]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  }

  function validate() {
    const errs = {};
    if (form.timeOut && form.timeIn && form.timeOut < form.timeIn)
      errs.timeOut = 'Time Out cannot be before Time In';
    if (form.restEnd && form.restStart && form.restEnd < form.restStart)
      errs.restEnd = 'Rest End cannot be before Rest Start';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function runQuickAction(key, action, successMsg, autoField) {
    setError('');
    setQuickLoading(key);
    if (autoField) updateField(autoField, nowTimeValue());
    try {
      const updated = await action();
      setReport(updated);
      // Take only the stamped time from the server; anything else typed but not yet saved stays.
      const fresh = reportToForm(updated);
      setForm((prev) => ({
        ...prev,
        [autoField]: fresh[autoField],
        ...(autoField === 'restStart' ? { restEnd: fresh.restEnd } : {}),
      }));
      setSnackbar({ message: successMsg, severity: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed. Try again.');
    } finally {
      setQuickLoading(null);
    }
  }

  function buildPayload() {
    return {
      date,
      attendance: form.attendance,
      timeIn: form.timeIn ? timeInputValueToIso(date, form.timeIn) : null,
      timeOut: form.timeOut ? timeInputValueToIso(date, form.timeOut) : null,
      breakfast: form.breakfast,
      breakfastNote: form.breakfastNote,
      lunch: form.lunch,
      lunchNote: form.lunchNote,
      eveningSnacks: form.eveningSnacks,
      eveningSnacksNote: form.eveningSnacksNote,
      restStart: form.restStart ? timeInputValueToIso(date, form.restStart) : null,
      restEnd: form.restEnd ? timeInputValueToIso(date, form.restEnd) : null,
      bowelHabits: { type: form.bowelHabitsType, note: form.bowelHabitsNote },
      notes: form.notes,
      activities: form.activities,
    };
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await saveDailyReport(childId, buildPayload());
      setReport(updated);
      setForm(reportToForm(updated));
      setSnackbar({ message: 'Saved', severity: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteAndSend() {
    setConfirmOpen(false);
    if (!validate()) return;
    setSending(true);
    setError('');
    try {
      // Send what is on screen, not the last saved version.
      await saveDailyReport(childId, buildPayload());
      const result = await completeAndSendReport(childId, { date });
      setReport(result.report);
      setForm(reportToForm(result.report));
      setSnackbar({ message: `Report sent to ${result.parentEmail}`, severity: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send. Try again.');
      // The send may have failed after the report changed state (e.g. to "Send failed"); show the truth.
      const latest = await fetchDailyReport(childId, date).catch(() => null);
      if (latest) setReport(latest);
    } finally {
      setSending(false);
    }
  }

  async function handleRetry() {
    setSending(true);
    setError('');
    try {
      const result = await retrySendReport(childId, { date });
      setReport(result.report);
      setForm(reportToForm(result.report));
      setSnackbar({ message: `Re-sent to ${result.parentEmail}`, severity: 'success' });
    } catch (err) {
      setError(err.response?.data?.message || 'Retry failed. Try again.');
    } finally {
      setSending(false);
    }
  }

  // Derived
  const isLocked  = report?.status === 'SENT';
  const isSending = report?.status === 'SENDING';

  // Mirrors the backend's completion rules so the Send button never promises more than the API allows.
  const checklist = useMemo(() => {
    if (form.attendance === 'Absent') return [{ label: 'Marked absent', done: true }];
    return [
      { label: 'Attendance marked',  done: !!form.attendance },
      { label: 'Time in recorded',   done: !!form.timeIn },
      { label: 'Time out recorded',  done: !!form.timeOut },
      { label: 'All meals noted',    done: !!(form.breakfast && form.lunch && form.eveningSnacks) },
    ];
  }, [form]);

  const liveDuration = useMemo(
    () => calculateRestDurationLabel(form.restStart, form.restEnd),
    [form.restStart, form.restEnd]
  );

  const previewValues = useMemo(() => ({
    attendance: form.attendance,
    timeIn: formatTimeDisplay(form.timeIn ? timeInputValueToIso(date, form.timeIn) : null),
    timeOut: formatTimeDisplay(form.timeOut ? timeInputValueToIso(date, form.timeOut) : null),
    breakfast: form.breakfast,
    breakfastNote: form.breakfastNote,
    lunch: form.lunch,
    lunchNote: form.lunchNote,
    eveningSnacks: form.eveningSnacks,
    eveningSnacksNote: form.eveningSnacksNote,
    restStart: formatTimeDisplay(form.restStart ? timeInputValueToIso(date, form.restStart) : null),
    restEnd: formatTimeDisplay(form.restEnd ? timeInputValueToIso(date, form.restEnd) : null),
    bowelHabitsType: form.bowelHabitsType,
    bowelHabitsNote: form.bowelHabitsNote,
    notes: form.notes,
    activities: form.activities,
  }), [form, date]);

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="sm" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
            <Skeleton variant="circular" width={44} height={44} />
            <Skeleton variant="circular" width={52} height={52} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="55%" height={26} />
              <Skeleton variant="text" width="40%" height={18} />
            </Box>
          </Stack>
          <Stack spacing={1.5}>
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} variant="rounded" height={140} sx={{ borderRadius: '18px' }} />
            ))}
          </Stack>
        </Container>
      </Box>
    );
  }

  // ── Not found state ───────────────────────────────────
  if (!child) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
        <Navbar />
        <Container maxWidth="sm" sx={{ p: 2 }}>
          <Alert severity="error" sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={load} startIcon={<RefreshIcon />}>Retry</Button>}
          >
            {error || 'Child not found.'}
          </Alert>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
            Back to today
          </Button>
        </Container>
      </Box>
    );
  }

  const palette    = getGenderPalette(child.gender);
  const statusMeta = getStatusMeta(report?.status);
  const isAbsent   = form.attendance === 'Absent';
  const busy       = !!quickLoading;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: `calc(${isLocked ? 24 : 104}px + ${brand.safeBottom})` }}>
      <Navbar />

      {/* ── Child header ── */}
      <Box sx={{ background: palette.headerGradient, py: 1.5 }}>
        <Container maxWidth="sm" sx={{ px: 2 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <IconButton
              onClick={() => navigate('/dashboard')}
              aria-label="Back to today"
              sx={{ bgcolor: 'rgba(255,255,255,0.8)', flexShrink: 0, '&:hover': { bgcolor: '#fff' } }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Avatar
              src={child.photo || undefined}
              sx={{
                width: 48, height: 48, flexShrink: 0,
                bgcolor: palette.softMid, color: palette.text,
                fontSize: '1.2rem', fontWeight: 800,
                border: `2px solid ${palette.border}`,
              }}
            >
              {child.name?.[0]?.toUpperCase()}
            </Avatar>

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="h6" component="h1" noWrap sx={{ fontSize: '1.15rem', lineHeight: 1.2 }}>
                {child.name}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                <Chip
                  label={statusMeta.label} color={statusMeta.color} size="small"
                  sx={{ height: 24, fontSize: '0.75rem', flexShrink: 0 }}
                />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {formatLongDate(date)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* ── Main content ── */}
      <Container maxWidth="sm" sx={{ px: 2, pt: 2 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {isSending && (
          <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 1.5 }}
            action={<Button color="inherit" size="small" onClick={load}>Refresh</Button>}
          >
            Sending now. Refresh in a moment.
          </Alert>
        )}

        <Stack spacing={1.5}>

          {/* ══ Attendance ══ */}
          <Section icon={<AccessTimeIcon fontSize="small" />} title="Attendance" accent={palette.main}>
            <ToggleButtonGroup
              exclusive fullWidth
              value={form.attendance}
              disabled={isLocked}
              onChange={(_, value) => { if (value) updateField('attendance', value); }}
              aria-label="Attendance"
              sx={{
                mb: isAbsent ? 0 : 2,
                '& .MuiToggleButton-root': {
                  minHeight: 48, fontWeight: 800, fontSize: '0.95rem', textTransform: 'none',
                  borderRadius: '14px', borderWidth: '1.5px',
                },
                '& .MuiToggleButton-root.Mui-selected': {
                  bgcolor: isAbsent ? 'secondary.main' : 'success.main', color: '#fff',
                  '&:hover': { bgcolor: isAbsent ? 'secondary.dark' : 'success.dark' },
                },
              }}
            >
              <ToggleButton value="Present">Present</ToggleButton>
              <ToggleButton value="Absent">Absent</ToggleButton>
            </ToggleButtonGroup>

            <Collapse in={!isAbsent} unmountOnExit>
              <Stack direction="row" spacing={1.25} sx={{ mb: 1.25 }}>
                <StampButton
                  label="Check in" busyLabel="Checking in…" busy={quickLoading === 'checkin'}
                  icon={<LoginIcon />} done={!!form.timeIn}
                  onClick={() => runQuickAction('checkin', () => apiCheckIn(childId, { date }), 'Checked in', 'timeIn')}
                  disabled={isLocked || busy}
                />
                <StampButton
                  label="Check out" busyLabel="Checking out…" busy={quickLoading === 'checkout'}
                  icon={<LogoutIcon />} done={!!form.timeOut || !form.timeIn}
                  onClick={() => runQuickAction('checkout', () => apiCheckOut(childId, { date }), 'Checked out', 'timeOut')}
                  disabled={isLocked || busy || !report}
                />
              </Stack>
              <Stack direction="row" spacing={1.25}>
                <TextField
                  fullWidth type="time" label="Time in"
                  disabled={isLocked}
                  value={form.timeIn}
                  onChange={(e) => updateField('timeIn', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth type="time" label="Time out"
                  disabled={isLocked}
                  value={form.timeOut}
                  onChange={(e) => updateField('timeOut', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!validationErrors.timeOut}
                  helperText={validationErrors.timeOut}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                The buttons stamp the time right now. Adjust it in the fields if needed.
              </Typography>
            </Collapse>
          </Section>

          {!isAbsent && (
            <>
              {/* ══ Meals ══ */}
              <Section icon={<RestaurantIcon fontSize="small" />} title="Meals" accent={brand.accents.meals}>
                <Stack spacing={2.5}>
                  {MEALS.map((meal) => (
                    <Box key={meal.field}>
                      <ChoiceChips
                        label={`${meal.title} · how much did they eat?`}
                        options={MEAL_OPTIONS}
                        value={form[meal.field]}
                        onChange={(value) => updateField(meal.field, value)}
                        disabled={isLocked}
                        accent={brand.accents.meals}
                        clearable
                      />
                      <TextField
                        fullWidth
                        label={`${meal.title} note (optional)`}
                        disabled={isLocked}
                        value={form[meal.noteField]}
                        onChange={(e) => updateField(meal.noteField, e.target.value)}
                        placeholder={meal.placeholder}
                        sx={{ mt: 1.25 }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Section>

              {/* ══ Rest ══ */}
              <Section icon={<HotelIcon fontSize="small" />} title="Rest" accent={brand.accents.rest}>
                <Stack direction="row" spacing={1.25} sx={{ mb: 1.25 }}>
                  <StampButton
                    label="Start rest" busyLabel="Starting…" busy={quickLoading === 'reststart'}
                    icon={<BedtimeIcon />} done={!!form.restStart}
                    onClick={() => runQuickAction('reststart', () => apiStartRest(childId, { date }), 'Rest started', 'restStart')}
                    disabled={isLocked || busy}
                  />
                  <StampButton
                    label="End rest" busyLabel="Ending…" busy={quickLoading === 'restend'}
                    icon={<WbSunnyIcon />} done={!!form.restEnd || !form.restStart}
                    onClick={() => runQuickAction('restend', () => apiEndRest(childId, { date }), 'Rest ended', 'restEnd')}
                    disabled={isLocked || busy || !report?.restStart}
                  />
                </Stack>
                <Stack direction="row" spacing={1.25}>
                  <TextField
                    fullWidth type="time" label="Rest start"
                    disabled={isLocked}
                    value={form.restStart}
                    onChange={(e) => updateField('restStart', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth type="time" label="Rest end"
                    disabled={isLocked}
                    value={form.restEnd}
                    onChange={(e) => updateField('restEnd', e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!validationErrors.restEnd}
                    helperText={validationErrors.restEnd}
                  />
                </Stack>
                {(liveDuration || report?.restDuration) && (
                  <Typography variant="body2" sx={{ mt: 1.25, fontWeight: 700, color: brand.accents.rest }}>
                    Rested for {liveDuration || report.restDuration}
                  </Typography>
                )}
              </Section>

              {/* ══ Bowel habits ══ */}
              <Section icon={<SpaIcon fontSize="small" />} title="Bowel habits" accent={brand.accents.bowel}>
                <ChoiceChips
                  options={BOWEL_OPTIONS}
                  value={form.bowelHabitsType}
                  onChange={(value) => updateField('bowelHabitsType', value)}
                  disabled={isLocked}
                  accent={brand.accents.bowel}
                  label="Bowel habits"
                  hideLabel
                />
                <TextField
                  fullWidth label="Note (optional)"
                  disabled={isLocked}
                  value={form.bowelHabitsNote}
                  onChange={(e) => updateField('bowelHabitsNote', e.target.value)}
                  sx={{ mt: 1.25 }}
                />
              </Section>
            </>
          )}

          {/* ══ Notes ══ */}
          <Section icon={<EditNoteIcon fontSize="small" />} title="Notes for the parent" accent={brand.accents.notes}>
            <Stack spacing={1.5}>
              {!isAbsent && (
                <TextField
                  fullWidth label="Activities today (optional)"
                  disabled={isLocked}
                  value={form.activities}
                  onChange={(e) => updateField('activities', e.target.value)}
                  placeholder="e.g. Painting, outdoor play, story time"
                />
              )}
              <TextField
                fullWidth multiline minRows={3}
                label="Notes (optional)"
                disabled={isLocked}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Mood, milestones, anything the parent should know"
              />
            </Stack>
          </Section>

          {/* ══ Preview ══ */}
          <Box>
            <Button
              variant="text"
              fullWidth
              startIcon={showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? 'Hide preview' : 'See what the parent will get'}
            </Button>
            <Collapse in={showPreview} unmountOnExit>
              <Box sx={{ pt: 1 }}>
                <ReportPreview
                  child={child}
                  date={date}
                  values={previewValues}
                  restDuration={liveDuration || report?.restDuration}
                  status={report?.status}
                  sentAt={report?.sentAt}
                />
              </Box>
            </Collapse>
          </Box>

          {/* ══ Send ══ */}
          <SendPanel
            child={child}
            report={report}
            checklist={checklist}
            absent={isAbsent}
            sending={sending}
            onSend={() => setConfirmOpen(true)}
            onRetry={handleRetry}
            onRefresh={load}
          />

        </Stack>
      </Container>

      {/* ── Sticky Save bar ── */}
      {!isLocked && (
        <Box sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          bgcolor: 'rgba(255,248,242,0.94)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid', borderColor: 'divider',
          pt: 1.5, pb: `calc(12px + ${brand.safeBottom})`,
          zIndex: 1200,
        }}>
          <Container maxWidth="sm" sx={{ px: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || busy}
              sx={{ boxShadow: brand.raisedShadow }}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Container>
        </Box>
      )}

      {/* ── Confirm send (bottom sheet on phones) ── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pt: 2.5, pb: 1 }}>
          <Box sx={{ display: { xs: 'block', sm: 'none' }, width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />
          <Typography variant="h6" component="span">Send {child.name}&apos;s report?</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-word' }}>
            It will be emailed to <strong>{child.parentEmail}</strong>. After sending, the report
            can&apos;t be changed.
          </Typography>

          <Stack spacing={0.75} sx={{ bgcolor: brand.cream, borderRadius: '14px', p: 1.5 }}>
            {checklist.map((item) => (
              <ChecklistItem key={item.label} done={item.done} label={item.label} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} size="large" sx={{ flex: 1 }}>
            Not yet
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<SendIcon />}
            onClick={handleCompleteAndSend}
            disabled={sending}
            sx={{ flex: 2 }}
          >
            Send now
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: `calc(${isLocked ? 16 : 96}px + ${brand.safeBottom}) !important` }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar.severity || 'success'}
          variant="filled"
          sx={{ fontWeight: 700 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
