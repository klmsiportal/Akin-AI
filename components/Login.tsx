import React from 'react';
import { Bot, LogIn } from 'lucide-react';
import { Button } from './Button';
import { ATTRIBUTION_TEXT } from '../constants';

interface LoginProps {
  onLogin: () => void;
  isLoading?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="min-h-screen bg-[#343541] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Bot className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome to AkinAI
          </h1>
          <p className="text-gray-400">
            The latest conversational AI experience.
          </p>
        </div>

        <div className="bg-[#444654] p-8 rounded-lg shadow-xl border border-white/5">
          <Button 
            onClick={onLogin}
            disabled={isLoading}
            className="w-full py-4 text-base"
            icon={<LogIn className="w-5 h-5" />}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          
          <div className="mt-6 text-xs text-gray-500 border-t border-white/10 pt-4">
             Secure authentication via Firebase
          </div>
        </div>

        <div className="pt-8 text-center text-gray-500 text-sm">
          <p className="font-medium text-emerald-500/80 mb-1">Created by</p>
          <p className="text-white font-semibold">{ATTRIBUTION_TEXT}</p>
          <p className="text-xs text-gray-600 mt-1">Monrovia, Liberia</p>
        </div>
      </div>
    </div>
  );
};