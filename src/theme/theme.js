export const lightColors = {
  primary: '#2A9D8F',
  primaryDark: '#21807A',
  primaryLight: '#E6F5F3',
  secondary: '#264653',
  background: '#FFFFFF',
  surface: '#F5FBFA',
  border: '#E1E8E7',
  text: '#1F2937',
  textMuted: '#6B7280',
  placeholder: '#9CA3AF',
  danger: '#E76F51',
  white: '#FFFFFF',
};

export const darkColors = {
  primary: '#53C6B5',
  primaryDark: '#83D8CB',
  primaryLight: '#183B38',
  secondary: '#E6F1F0',
  background: '#111817',
  surface: '#1B2423',
  border: '#34413F',
  text: '#F3F7F6',
  textMuted: '#B0BFBC',
  placeholder: '#879894',
  danger: '#FF8A71',
  white: '#17201F',
};

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const createTypography = (palette) => ({
  h1: { fontSize: 28, fontWeight: '700', color: palette.secondary },
  h2: { fontSize: 20, fontWeight: '600', color: palette.secondary },
  body: { fontSize: 15, fontWeight: '400', color: palette.text },
  caption: { fontSize: 13, fontWeight: '400', color: palette.textMuted },
  button: { fontSize: 16, fontWeight: '600' },
});

export const typography = createTypography(colors);