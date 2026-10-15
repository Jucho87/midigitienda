import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

interface ThemeContextType {
  primaryColor: string;
  secondaryColor: string;
  setBrandingColors: (primary: string, secondary: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export const ThemeProvider: React.FC<{
  initialPrimary?: string;
  initialSecondary?: string;
  children: React.ReactNode;
}> = ({ initialPrimary = '#10B981', initialSecondary = '#0284C7', children }) => {
  const [primaryColor, setPrimaryColor] = useState<string>(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState<string>(initialSecondary);

  const applyColors = (pColor: string, sColor: string) => {
    try {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', pColor);
      root.style.setProperty('--secondary-color', sColor);

      const pRgb = hexToRgb(pColor);
      const sRgb = hexToRgb(sColor);

      root.style.setProperty('--primary-color-rgb', `${pRgb.r}, ${pRgb.g}, ${pRgb.b}`);
      root.style.setProperty('--secondary-color-rgb', `${sRgb.r}, ${sRgb.g}, ${sRgb.b}`);
    } catch (e) {
      console.error('Error applying theme variables', e);
    }
  };

  useEffect(() => {
    applyColors(primaryColor, secondaryColor);
  }, [primaryColor, secondaryColor]);

  const setBrandingColors = (primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
  };

  const value = useMemo(
    () => ({
      primaryColor,
      secondaryColor,
      setBrandingColors,
    }),
    [primaryColor, secondaryColor]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
