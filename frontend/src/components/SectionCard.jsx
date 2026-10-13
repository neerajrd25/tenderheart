import { Box, Paper, Stack, Typography } from '@mui/material';

export default function SectionCard({ icon, title, accent, children }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ color: accent, display: 'flex' }}>{icon}</Box>
        <Typography variant="h6">{title}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}
