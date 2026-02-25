import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  brightness: number;
  setBrightness: (v: number) => void;
  contrast: number;
  setContrast: (v: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") setIsDark(false);
    const b = localStorage.getItem("brightness");
    const c = localStorage.getItem("contrast");
    if (b) setBrightness(Number(b));
    if (c) setContrast(Number(c));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--auditorium-brightness",
      `brightness(${brightness / 100})`
    );
    document.documentElement.style.setProperty(
      "--auditorium-contrast",
      `contrast(${contrast / 100})`
    );
    localStorage.setItem("brightness", String(brightness));
    localStorage.setItem("contrast", String(contrast));
  }, [brightness, contrast]);

  const toggleTheme = () => setIsDark((p) => !p);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, brightness, setBrightness, contrast, setContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
