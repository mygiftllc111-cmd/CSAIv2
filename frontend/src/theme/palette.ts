// green-natural テーマ: 緑 × ベージュ
// 「世界一安心して話せるAI」にふさわしい、温かみと安心感のある配色

export const palette = {
  primary: {
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#8D6E63',
    light: '#A1887F',
    dark: '#6D4C41',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F5F0EB',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#3E2723',
    secondary: '#5D4037',
  },
  success: {
    main: '#66BB6A',
    light: '#A5D6A7',
    dark: '#43A047',
  },
  warning: {
    main: '#FFA726',
    light: '#FFB74D',
    dark: '#F57C00',
  },
  error: {
    main: '#EF5350',
    light: '#E57373',
    dark: '#D32F2F',
  },
  info: {
    main: '#42A5F5',
    light: '#64B5F6',
    dark: '#1E88E5',
  },
  divider: 'rgba(62, 39, 35, 0.12)',
} as const;
