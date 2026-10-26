import React from 'react';
import { AppProvider } from './providers/AppProvider';
import { AppRoutes } from './routes';
import '../styles/tokens.css';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
};

export default App;
