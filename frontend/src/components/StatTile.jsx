import { ButtonBase, Typography, Box, alpha } from '@mui/material';

// Tappable dashboard counter. `color` is a palette key such as "primary" or "success".
export default function StatTile({ icon, label, value, color = 'primary', onClick, selected }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={(theme) => {
        const main = theme.palette[color].main;
        return {
          width: '100%',
          minHeight: 76,
          p: 1.5,
          gap: 1.25,
          justifyContent: 'flex-start',
          textAlign: 'left',
          borderRadius: '16px',
          border: '1.5px solid',
          borderColor: selected ? main : theme.palette.divider,
          // Tint layered over solid white so the tile stays opaque over the page gradient
          background: selected ? `linear-gradient(${alpha(main, 0.1)}, ${alpha(main, 0.1)}), #fff` : '#fff',
          transition: 'background-color .15s ease, border-color .15s ease, transform .1s ease',
          '&:active': { transform: 'scale(0.97)' },
          '& .stat-icon': {
            width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: selected ? '#fff' : main,
            bgcolor: selected ? main : alpha(main, 0.12),
            '& svg': { fontSize: '1.25rem' },
          },
        };
      }}
    >
      <Box className="stat-icon">{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.25, display: 'block' }}>
          {label}
        </Typography>
      </Box>
    </ButtonBase>
  );
}
