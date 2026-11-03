import { useTheme } from '@/lib/theme';

export interface ChartPalette {
  paper: string;
  card: string;
  ink: string;
  soft: string;
  muted: string;
  line: string;
  accent: string;
  accentSoft: string;
  pine: string;
  gold: string;
  indigo: string;
}

export const chartPalettes: Record<'light' | 'dark', ChartPalette> = {
  light: {
    paper: '#f6f3ec',
    card: '#fffdf9',
    ink: '#1c1914',
    soft: '#4a443b',
    muted: '#7a7266',
    line: '#e3ddd0',
    accent: '#a63d2f',
    accentSoft: '#f5e7e1',
    pine: '#2f5d50',
    gold: '#b07d2b',
    indigo: '#4f5894',
  },
  dark: {
    paper: '#13110f',
    card: '#1c1915',
    ink: '#eee8de',
    soft: '#cbc3b5',
    muted: '#988f80',
    line: '#342f27',
    accent: '#db6d5b',
    accentSoft: '#3a211c',
    pine: '#6fa896',
    gold: '#d4a55c',
    indigo: '#98a0d4',
  },
};

export function useChartPalette(): ChartPalette {
  const { theme } = useTheme();
  return chartPalettes[theme];
}

/** 把十六进制颜色转成 rgba 字符串，用于热力图透明度渐变。 */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
