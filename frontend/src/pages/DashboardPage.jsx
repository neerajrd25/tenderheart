import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Container, Fab, IconButton,
  InputAdornment, LinearProgress, Skeleton,
  Snackbar, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupsIcon from '@mui/icons-material/Groups';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Navbar from '../components/Navbar.jsx';
import ChildCard from '../components/ChildCard.jsx';
import StatTile from '../components/StatTile.jsx';
import AddChildDialog from '../components/AddChildDialog.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';
import Logo from '../components/Logo.jsx';
import { brand } from '../theme.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchChildren } from '../api/children.js';
import { fetchDailyReport } from '../api/dailyReports.js';
import { formatLongDate, getGreeting, todayIsoDate } from '../utils/time.js';
import { FILTERS, getDashboardGroup } from '../utils/reportStatus.js';

// ── Skeleton card for loading state ────────────────────────
function SkeletonCard() {
  return (
    <Box sx={{ borderRadius: '18px', border: '1.5px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: '#fff' }}>
      <Box sx={{ p: 1.75 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          <Skeleton variant="circular" width={52} height={52} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="60%" height={22} />
            <Skeleton variant="text" width="40%" height={18} />
          </Box>
        </Stack>
        <Skeleton variant="rounded" height={52} />
      </Box>
    </Box>
  );
}

export default function DashboardPage() {
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [children,  setChildren]  = useState([]);
  const [reports,   setReports]   = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('ALL');
  const [snackbar,  setSnackbar]  = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const date = todayIsoDate();

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const list = await fetchChildren();
      setChildren(list);
      const entries = await Promise.all(
        list.map(async (child) => {
          try { return [child._id, await fetchDailyReport(child._id, todayIsoDate())]; }
          catch  { return [child._id, null]; }
        })
      );
      setReports(Object.fromEntries(entries));
    } catch {
      setError('Couldn\u2019t load children. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const r = { ALL: children.length, NOT_STARTED: 0, IN_PROGRESS: 0, READY: 0, FAILED: 0, SENT: 0 };
    children.forEach((c) => { r[getDashboardGroup(reports[c._id])] += 1; });
    return r;
  }, [children, reports]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return children.filter((c) => {
      if (term && !c.name.toLowerCase().includes(term) && !(c.parentName || '').toLowerCase().includes(term)) return false;
      return filter === 'ALL' || getDashboardGroup(reports[c._id]) === filter;
    });
  }, [children, reports, search, filter]);

  const sentPercent = counts.ALL ? Math.round((counts.SENT / counts.ALL) * 100) : 0;
  const firstName   = user?.name?.split(' ')[0];

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: `calc(96px + ${brand.safeBottom})` }}>
      <Navbar />

      {/* ── Greeting ── */}
      <Box sx={{ background: brand.heroGradient, pt: 2.5, pb: 5.5 }}>
        <Container maxWidth="sm" sx={{ px: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {formatLongDate(date)}
              </Typography>
              <Typography variant="h5" component="h1" sx={{ mt: 0.25 }}>
                {getGreeting()}{firstName ? `, ${firstName}` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loading
                  ? 'Loading…'
                  : `${counts.ALL} child${counts.ALL !== 1 ? 'ren' : ''} · ${counts.SENT} report${counts.SENT !== 1 ? 's' : ''} sent`}
              </Typography>
            </Box>

            <IconButton
              aria-label="Refresh"
              onClick={() => load(true)}
              disabled={loading || refreshing}
              sx={{ bgcolor: 'rgba(255,255,255,0.75)', flexShrink: 0, '&:hover': { bgcolor: '#fff' } }}
            >
              <RefreshIcon sx={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
              }} />
            </IconButton>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ px: 2, mt: -4 }}>

        {/* ── Stat tiles (2×2 grid) ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mb: 1.5 }}>
          <StatTile icon={<GroupsIcon />} label="Enrolled" value={counts.ALL}
            color="primary" onClick={() => setFilter('ALL')} selected={filter === 'ALL'} />
          <StatTile icon={<HourglassTopIcon />} label="In daycare" value={counts.IN_PROGRESS}
            color="warning" onClick={() => setFilter('IN_PROGRESS')} selected={filter === 'IN_PROGRESS'} />
          <StatTile icon={<MarkEmailReadIcon />} label="Ready to send" value={counts.READY}
            color="info" onClick={() => setFilter('READY')} selected={filter === 'READY'} />
          <StatTile icon={<CheckCircleIcon />} label="Sent" value={counts.SENT}
            color="success" onClick={() => setFilter('SENT')} selected={filter === 'SENT'} />
        </Box>

        {/* ── Day progress ── */}
        {counts.ALL > 0 && (
          <Box sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1.5px solid', borderColor: 'divider', p: 1.75, mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="body2" fontWeight={700}>Reports sent today</Typography>
              <Typography variant="body2" fontWeight={800} color={sentPercent === 100 ? 'success.main' : 'text.secondary'}>
                {counts.SENT} of {counts.ALL}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={sentPercent}
              color="success"
              sx={{ height: 8, bgcolor: brand.sageSoft }}
            />
            {counts.FAILED > 0 && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                <ReportProblemIcon sx={{ fontSize: 16, color: 'error.main' }} />
                <Typography variant="caption" color="error.main" fontWeight={700}>
                  {counts.FAILED} report{counts.FAILED > 1 ? 's' : ''} need{counts.FAILED === 1 ? 's' : ''} attention
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        <InstallPrompt sx={{ mb: 1.5 }} />

        <Typography variant="h6" component="h2" sx={{ mt: 2.5, mb: 1.25 }}>
          Today&apos;s children
        </Typography>

        {/* ── Search ── */}
        <TextField
          fullWidth
          type="search"
          placeholder="Search child or parent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Search child or parent', enterKeyHint: 'search' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.25 }}
        />

        {/* ── Filter chips (horizontal scroll, bleeds to the screen edge) ── */}
        <Stack
          direction="row" spacing={1}
          sx={{
            overflowX: 'auto', mx: -2, px: 2, pb: 1, mb: 1,
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {FILTERS.map((item) => (
            <Chip
              key={item.key}
              label={`${item.label} · ${counts[item.key]}`}
              color={filter === item.key ? 'primary' : 'default'}
              variant={filter === item.key ? 'filled' : 'outlined'}
              onClick={() => setFilter(item.key)}
              sx={{ height: 40, px: 0.5, flexShrink: 0, fontSize: '0.85rem', bgcolor: filter === item.key ? undefined : '#fff' }}
            />
          ))}
        </Stack>

        {/* ── Error ── */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={() => load()}>Retry</Button>}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1.25}>
            {[0, 1, 2, 3].map((n) => <SkeletonCard key={n} />)}
          </Stack>

        ) : children.length === 0 && !error ? (
          <Box sx={{ textAlign: 'center', py: 6, px: 3, bgcolor: '#fff', borderRadius: '18px', border: '1.5px dashed', borderColor: 'divider' }}>
            <Box sx={{ display: 'inline-flex', mb: 2 }}><Logo size={64} /></Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>No children yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Add your first child to start their daily reports.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} size="large" onClick={() => setDialogOpen(true)}>
              Add a child
            </Button>
          </Box>

        ) : visible.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5, px: 3, bgcolor: '#fff', borderRadius: '18px', border: '1.5px dashed', borderColor: 'divider' }}>
            <SearchIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ mb: 0.5 }}>No matches</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Try a different search or filter.
            </Typography>
            <Button variant="outlined" onClick={() => { setSearch(''); setFilter('ALL'); }}>
              Clear filters
            </Button>
          </Box>

        ) : (
          <Stack spacing={1.25}>
            {visible.map((child) => (
              <ChildCard
                key={child._id}
                child={child}
                report={reports[child._id]}
                onClick={() => navigate(`/children/${child._id}/report`)}
              />
            ))}
          </Stack>
        )}
      </Container>

      {/* ── Add child ── */}
      {children.length > 0 && (
        <Fab
          color="primary"
          variant="extended"
          aria-label="Add child"
          onClick={() => setDialogOpen(true)}
          sx={{
            position: 'fixed', right: 16, bottom: `calc(20px + ${brand.safeBottom})`,
            height: 56, px: 2.5, boxShadow: brand.raisedShadow,
          }}
        >
          <AddIcon sx={{ mr: 0.75 }} /> Add child
        </Fab>
      )}

      <AddChildDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          setSnackbar('Child added');
          load(true);
        }}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3500}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: `calc(88px + ${brand.safeBottom}) !important` }}
      />
    </Box>
  );
}
