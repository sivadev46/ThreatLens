import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/NotificationToast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [username, setUsername] = useState('alex.chen');
  const [password, setPassword] = useState('Sentinel@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      showToast({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome back, ${username}. SOC session initialized.`,
      });
      navigate('/');
    }, 500);
  };

  const fillDemo = () => {
    setUsername('alex.chen');
    setPassword('Sentinel@2026');
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#05080e] relative overflow-hidden text-slate-100">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-indigo-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="w-full max-w-sm space-y-5 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400 mb-1 shadow-lg shadow-sky-500/10">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Sentinel SOC
          </h1>
          <p className="text-xs text-slate-400">
            Enterprise Security Telemetry & Intrusion Detection
          </p>
        </div>

        {/* Login Form Box */}
        <div className="p-6 rounded-xl border border-white/[0.08] bg-[#090d16]/90 backdrop-blur-md shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
            <span className="text-xs font-semibold text-slate-200">Operator Sign In</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>TLS 1.3 / E2EE</span>
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Operator Username
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst.username"
                  className="w-full bg-[#05080e] border border-white/[0.08] rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#05080e] border border-white/[0.08] rounded-md pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
              </div>
            </div>

            {error && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2 text-xs mt-1"
              isLoading={isLoading}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Authenticate Operator
            </Button>

            <div className="pt-2 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={fillDemo}
                className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer font-mono"
              >
                <KeyRound className="w-3 h-3" />
                <span>Fill Demo Credentials</span>
              </button>
              <span className="text-slate-500 font-mono">BCrypt / SHA-256</span>
            </div>
          </form>
        </div>

        <div className="text-center text-[10px] font-mono text-slate-500">
          Sentinel Enterprise IDS &bull; Production v2.4
        </div>
      </div>
    </div>
  );
};
