export const colors = {
  primary: "#0F6E56",    // Skin+ primary green
  secondary: "#0d5a47",  // Slightly darker green
  accent: "#10b981",     // Light green for secondary things
  danger: "#ef4444",     // Red
  success: "#10b981",    // Green
  warning: "#f59e0b",    // Amber
  
  // Specific semantic for verdicts
  bgAmelioration: "#f0fdf4",
  borderAmelioration: "#4ade80",
  textAmelioration: "#15803d",
  
  bgAggravation: "#fef2f2",
  borderAggravation: "#f87171",
  textAggravation: "#b91c1c",

  bgStable: "#fffbeb",
  borderStable: "#fbbf24",
  textStable: "#b45309",

  // Grays
  dark: "#1f2937",       // Dark gray
  gray: "#6b7280",       // Medium gray
  lightGray: "#9ca3af",  // Light gray
  border: "#e5e7eb",     // Border gray
  background: "#f9fafb",// Light background
  white: "#ffffff",
  
  // Specific UI colors
  cardBg: "#ffffff",
  listItemBg: "#f3f4f6",
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.dark,
  },
  h2: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.dark,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.dark,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.dark,
  },
  body: {
    fontSize: 14,
    fontWeight: "400",
    color: colors.gray,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.dark,
  },
  small: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.lightGray,
  },
  smallBold: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};
