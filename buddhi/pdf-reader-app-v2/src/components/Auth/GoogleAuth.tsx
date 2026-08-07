// src/components/Auth/GoogleAuth.tsx

import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { GOOGLE_CLIENT_ID } from '../../utils/constants';

const GoogleAuth: React.FC = () => {
  const { login } = useAuth();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        await login(credentialResponse.credential);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">PDF Reader</h1>
          <p className="text-gray-600">Sign in to access your documents</p>
        </div>
        
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => {
              console.log('Login Failed');
            }}
            useOneTap
          />
        </div>
      </div>
    </div>
  );
};

const GoogleAuthWrapper: React.FC = () => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-red-600">Google Client ID not configured</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleAuth />
    </GoogleOAuthProvider>
  );
};

export default GoogleAuthWrapper;