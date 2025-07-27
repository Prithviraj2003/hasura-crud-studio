"use client";

import React from "react";

// Strapi color palette converted to CSS custom properties
const strapiColors = {
  neutral: {
    0: "hsl(var(--strapi-neutral-0))",
    100: "hsl(var(--strapi-neutral-100))",
    200: "hsl(var(--strapi-neutral-200))",
    300: "hsl(var(--strapi-neutral-300))",
    400: "hsl(var(--strapi-neutral-400))",
    500: "hsl(var(--strapi-neutral-500))",
    600: "hsl(var(--strapi-neutral-600))",
    700: "hsl(var(--strapi-neutral-700))",
    800: "hsl(var(--strapi-neutral-800))",
    900: "hsl(var(--strapi-neutral-900))",
  },
  primary: {
    100: "hsl(var(--strapi-primary-100))",
    200: "hsl(var(--strapi-primary-200))",
    500: "hsl(var(--strapi-primary-500))",
    600: "hsl(var(--strapi-primary-600))",
    700: "hsl(var(--strapi-primary-700))",
  },
  secondary: {
    100: "hsl(var(--strapi-secondary-100))",
    200: "hsl(var(--strapi-secondary-200))",
    500: "hsl(var(--strapi-secondary-500))",
    600: "hsl(var(--strapi-secondary-600))",
    700: "hsl(var(--strapi-secondary-700))",
  },
  alternative: {
    100: "hsl(var(--strapi-alternative-100))",
    200: "hsl(var(--strapi-alternative-200))",
    500: "hsl(var(--strapi-alternative-500))",
    600: "hsl(var(--strapi-alternative-600))",
    700: "hsl(var(--strapi-alternative-700))",
  },
  warning: {
    100: "hsl(var(--strapi-warning-100))",
    200: "hsl(var(--strapi-warning-200))",
    500: "hsl(var(--strapi-warning-500))",
    600: "hsl(var(--strapi-warning-600))",
    700: "hsl(var(--strapi-warning-700))",
  },
  danger: {
    100: "hsl(var(--strapi-danger-100))",
    200: "hsl(var(--strapi-danger-200))",
    500: "hsl(var(--strapi-danger-500))",
    600: "hsl(var(--strapi-danger-600))",
    700: "hsl(var(--strapi-danger-700))",
  },
  success: {
    100: "hsl(var(--strapi-success-100))",
    200: "hsl(var(--strapi-success-200))",
    500: "hsl(var(--strapi-success-500))",
    600: "hsl(var(--strapi-success-600))",
    700: "hsl(var(--strapi-success-700))",
  },
};

// Theme context for accessing Strapi colors
const ThemeContext = React.createContext(strapiColors);

export const useStrapiTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useStrapiTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={strapiColors}>
      {children}
    </ThemeContext.Provider>
  );
};
