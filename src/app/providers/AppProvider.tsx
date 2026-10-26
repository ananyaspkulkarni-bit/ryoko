import React from 'react';
import { BrowserRouter } from 'react-router-dom';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};
