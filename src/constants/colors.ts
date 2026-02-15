// Design system colors
export const Colors = {
  light: {
    primary: '#2563EB', // Blue
    primaryDark: '#1E40AF',
    secondary: '#10B981', // Green
    accent: '#F59E0B', // Amber
    background: '#FFFFFF',
    surface: '#F9FAFB',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    income: '#10B981',
    expense: '#EF4444',
    transfer: '#3B82F6',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#111827',
    surface: '#1F2937',
    card: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    income: '#34D399',
    expense: '#F87171',
    transfer: '#60A5FA',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export type ColorScheme = keyof typeof Colors;
