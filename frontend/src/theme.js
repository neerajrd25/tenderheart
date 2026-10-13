import { createTheme, alpha } from '@mui/material/styles';

// TenderHeart palette: warm coral on cream with plum text and sage for "done".
// Every colour used in the app comes from here (theme.palette or `brand`).
const CORAL = '#C84B3A';
const PLUM = '#6B3A5B';
const INK = '#3B2434';
const CREAM = '#FFF8F2';
const SAGE = '#4F7F5E';

const HEADING_FONT = "'Fraunces', Georgia, 'Times New Roman', serif";
const BODY_FONT = "'Nunito', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const brand = {
  name: 'TenderHeart',
  byline: 'by NexusChain Consulting',
  headingFont: HEADING_FONT,
  cream: CREAM,
  hairline: alpha(INK, 0.1),
  softTint: '#FDEBE4',
  heroGradient: 'linear-gradient(160deg, #FDE6DC 0%, #FBEFE6 55%, #F6E7EE 100%)',
  logoGradient: 'linear-gradient(135deg, #E2705C 0%, #C84B3A 100%)',
  wordmarkGradient: `linear-gradient(90deg, ${CORAL}, ${PLUM})`,
  cardShadow: `0 1px 3px ${alpha(INK, 0.05)}, 0 6px 20px ${alpha(INK, 0.05)}`,
  raisedShadow: `0 8px 28px ${alpha(CORAL, 0.28)}`,
  sageSoft: '#EAF3EC',
  sageBorder: '#BBD6C2',
  sageText: '#2F5A3C',
  // Section accents on the report screen
  accents: {
    meals: '#A8620B',
    rest: '#7D5BA6',
    bowel: '#2F7C86',
    notes: PLUM,
  },
  // Space for the phone's home indicator when installed as an app
  safeBottom: 'env(safe-area-inset-bottom, 0px)',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: CORAL, light: '#F0A193', dark: '#A63A2B', contrastText: '#ffffff' },
    secondary: { main: PLUM, light: '#9A6C8A', dark: '#4A2640', contrastText: '#ffffff' },
    background: { default: CREAM, paper: '#ffffff' },
    success: { main: SAGE, light: '#7FA98B', dark: '#2F5A3C', contrastText: '#ffffff' },
    warning: { main: '#A8620B', light: '#D9952F', dark: '#7A4705', contrastText: '#ffffff' },
    error: { main: '#B93A32', light: '#DB6E66', dark: '#8A2620', contrastText: '#ffffff' },
    info: { main: '#2F7C86', light: '#7FBBC1', dark: '#1D5158', contrastText: '#ffffff' },
    text: { primary: INK, secondary: '#7A6672', disabled: alpha(INK, 0.38) },
    divider: alpha(INK, 0.1),
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: BODY_FONT,
    h4: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontFamily: HEADING_FONT, fontWeight: 700, letterSpacing: '-0.3px' },
    h6: { fontFamily: HEADING_FONT, fontWeight: 600, letterSpacing: '-0.2px' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
    body1: { lineHeight: 1.55 },
    // Material's own phone sizes: 15/13px text reads as native; MUI's web defaults (14/12px) read as small.
    body2: { fontSize: '0.9375rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
    caption: { fontSize: '0.8125rem', letterSpacing: '0.01em' },
    overline: { letterSpacing: '0.1em', fontWeight: 800, fontSize: '0.75rem' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 14,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeLarge: { minHeight: 54, fontSize: '1rem', borderRadius: 16 },
        sizeSmall: { minHeight: 40 },
        contained: {
          boxShadow: `0 2px 10px ${alpha(INK, 0.14)}`,
          '&:hover': { boxShadow: `0 4px 16px ${alpha(INK, 0.18)}` },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { minWidth: 44, minHeight: 44, borderRadius: 12 } },
    },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: '#ffffff',
          // 16px minimum stops iOS Safari zooming the page when a field is focused
          fontSize: '1rem',
          minHeight: 54,
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: CORAL },
        },
        multiline: { minHeight: 0 },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 18, boxShadow: brand.cardShadow } },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 18 } },
    },
    MuiAppBar: {
      styleOverrides: { root: { borderRadius: 0, boxShadow: 'none' } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700, borderRadius: 999 } },
    },
    // On phones every dialog is a bottom sheet, so its buttons sit under the thumb.
    MuiDialog: {
      styleOverrides: {
        container: ({ theme: t }) => ({
          [t.breakpoints.down('sm')]: { alignItems: 'flex-end' },
        }),
        paper: ({ theme: t }) => ({
          borderRadius: 24,
          [t.breakpoints.down('sm')]: {
            margin: 0,
            width: '100%',
            maxWidth: '100% !important',
            maxHeight: '92dvh',
            borderRadius: '24px 24px 0 0',
            paddingBottom: brand.safeBottom,
          },
        }),
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 14 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 10,
          margin: '2px 4px',
          '&:hover': { backgroundColor: alpha(CORAL, 0.08) },
        },
      },
    },
  },
});

// Per-child accent tints, tuned to sit inside the TenderHeart palette.
const GENDER_PALETTES = {
  female: {
    main: '#C2567A',
    soft: '#FDF0F4',
    softMid: '#F9DDE6',
    border: '#F1C3D2',
    text: '#7A2748',
    headerGradient: 'linear-gradient(135deg, #F9DDE6 0%, #FDF0F4 60%, #FFF8F2 100%)',
    gradient: 'linear-gradient(135deg, #F9DDE6 0%, #FDEBE4 100%)',
    chipBg: '#F9DDE6',
    chipText: '#7A2748',
    accentLight: '#E596B0',
  },
  male: {
    main: '#2F7C86',
    soft: '#EDF6F6',
    softMid: '#D8ECEC',
    border: '#B9DADB',
    text: '#1D5158',
    headerGradient: 'linear-gradient(135deg, #D8ECEC 0%, #EDF6F6 60%, #FFF8F2 100%)',
    gradient: 'linear-gradient(135deg, #D8ECEC 0%, #EAF3EC 100%)',
    chipBg: '#D8ECEC',
    chipText: '#1D5158',
    accentLight: '#7FBBC1',
  },
  other: {
    main: '#7D5BA6',
    soft: '#F4EFFA',
    softMid: '#E6DCF3',
    border: '#D2C2E8',
    text: '#4C2F73',
    headerGradient: 'linear-gradient(135deg, #E6DCF3 0%, #F4EFFA 60%, #FFF8F2 100%)',
    gradient: 'linear-gradient(135deg, #E6DCF3 0%, #F6E7EE 100%)',
    chipBg: '#E6DCF3',
    chipText: '#4C2F73',
    accentLight: '#B39AD6',
  },
};

export function getGenderPalette(gender) {
  return GENDER_PALETTES[gender] || GENDER_PALETTES.other;
}
