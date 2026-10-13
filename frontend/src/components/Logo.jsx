import { Box } from '@mui/material';
import { brand } from '../theme.js';

const HEART =
  'M256 420 C256 420 96 320 96 208 C96 150 140 112 190 112 C222 112 244 128 256 150 C268 128 290 112 322 112 C372 112 416 150 416 208 C416 320 256 420 256 420 Z';

// The TenderHeart mark: a big heart holding a little one, on a coral tile.
export default function Logo({ size = 36 }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.28)}px`,
        background: brand.logoGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 512 512" width={size * 0.78} height={size * 0.78}>
        <path d={HEART} fill="#ffffff" />
        <path d={HEART} fill="#E2705C" transform="translate(256 276) scale(0.36) translate(-256 -266)" />
      </svg>
    </Box>
  );
}
