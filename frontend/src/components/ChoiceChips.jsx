import { Box, ButtonBase, Typography, alpha } from '@mui/material';

// One-tap single choice. Faster on a phone than opening a dropdown.
// Tapping the selected option again clears it when `clearable` is set.
export default function ChoiceChips({ label, hideLabel = false, options, value, onChange, disabled, accent, clearable = false }) {
  return (
    <Box role="radiogroup" aria-label={label}>
      {label && !hideLabel && (
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <ButtonBase
              key={option}
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(selected && clearable ? '' : option)}
              sx={(theme) => {
                const color = accent || theme.palette.primary.main;
                return {
                  minHeight: 44,
                  px: 2,
                  borderRadius: 999,
                  fontFamily: theme.typography.fontFamily,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  border: '1.5px solid',
                  borderColor: selected ? color : theme.palette.divider,
                  bgcolor: selected ? color : '#fff',
                  color: selected ? '#fff' : 'text.primary',
                  transition: 'background-color .12s ease, border-color .12s ease',
                  '&.Mui-disabled': { opacity: selected ? 0.75 : 0.45 },
                  '&:focus-visible': { outline: `3px solid ${alpha(color, 0.35)}`, outlineOffset: 2 },
                };
              }}
            >
              {option}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
