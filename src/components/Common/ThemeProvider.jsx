import React from "react";

// Simple ThemeProvider that provides a default white theme
// Theme customization has been removed

export const BACKGROUND_OPTIONS = [];

export const applyTheme = () => {};

export const BackgroundThemeProvider = ({ children }) => {
  return (
    <div className="bg-white min-h-screen">
      {children}
    </div>
  );
};

// Stub export for backward compatibility
export const useBackgroundTheme = () => {
  return {
    backgroundTheme: "default",
    changeTheme: () => {},
    BACKGROUND_OPTIONS,
  };
};

export default BackgroundThemeProvider;
