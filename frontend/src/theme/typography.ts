import type { ThemeOptions } from '@mui/material/styles';

export const typography: ThemeOptions['typography'] = {
  fontFamily: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h4: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h5: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
  },
  body2: {
    fontSize: '0.8125rem',
    lineHeight: 1.7,
  },
  button: {
    textTransform: 'none',
    fontWeight: 600,
  },
};
