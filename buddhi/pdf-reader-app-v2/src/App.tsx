// src/App.tsx

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GoogleAuth from './components/Auth/GoogleAuth';
import MainLayout from './components/Layout/MainLayout';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <MainLayout /> : <GoogleAuth />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;