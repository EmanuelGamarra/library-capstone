export const theme = {
  colors: {
    primary: "#3d5a6c",
    secondary: "#c9a227",

    background: "#FFFFFF",
    surface: "#FFFFFF",

    textPrimary: "#111A26",
    textSecondary: "#5F6773",

    border: "#D9DEE5",

    success: {
      background: "#E4EFE1",
      text: "#3F6B3F",
    },

    warning: {
      background: "#F7ECD1",
      text: "#8A6A1D",
    },

    danger: {
      background: "#F5E0DE",
      text: "#A23B32",
    },
  },

  fonts: {
    heading: "'Lora', serif",
    body: "'Inter', sans-serif",
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    base: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
    xxxl: "64px",
  },

  radius: {
    control: "6px",
    card: "12px",
    pill: "999px",
  },

  shadows: {
    card: "0 1px 3px rgba(17, 26, 38, 0.08)",
  },

  breakpoints: {
    mobile: "768px",
    tablet: "1024px",
    desktopLarge: "1440px",
  },
} as const;

export type AppTheme = typeof theme;
