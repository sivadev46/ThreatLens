import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, User, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/NotificationToast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('alex.chen');
  const [password, setPassword] = useState('Sentinel@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to root
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please provide both operator identifier and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        showToast({
          type: 'success',
          title: 'Authentication Successful',
          message: `Authenticated as ${username}. Initializing security console.`,
        });
        navigate('/', { replace: true });
      } else {
        setError(result.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication service error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('alex.chen');
    setPassword('Sentinel@2026');
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#060a12] relative overflow-hidden select-none">
      {/* Subtle background ambient radial gradient */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[360px] bg-sky-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-[360px] h-[240px] bg-indigo-500/5 blur-[110px] pointer-events-none rounded-full" />

      <div className="w-full max-w-[380px] relative z-10 space-y-6">
        {/* Minimal Sentinel Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 shadow-sm shadow-sky-500/10">
            <Shield className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Sentinel SOC</h1>
            <p className="text-xs text-slate-400 mt-0.5">Security Log Analyzer & IDS</p>
          </div>
        </div>

        {/* Compact Login Card */}
        <div className="p-6 rounded-xl border border-white/[0.08] bg-[#0c121e]/95 backdrop-blur-md shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-slate-200">Operator Sign In</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TLS Encrypted</span>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Username / Email */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5" htmlFor="login-username">
                Username / Email
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex.chen"
                  autoComplete="username"
                  required
                  className="w-full bg-[#070b13] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
            </div>

            {/* Password with show/hide control */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-[#070b13] border border-white/[0.1] rounded-lg pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Validation & Error Display */}
            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed"
              >
                {error}
              </div>
            )}

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-sky-600/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Demo Helper Note (Explicitly labeled) */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 font-mono cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>Fill Demo (alex.chen)</span>
              </button>
              <span className="text-slate-500 font-mono text-[10px]">Demo Mode</span>
            </div>
          </form>
        </div>

        {/* Minimal Footer */}
        <p className="text-center text-[11px] text-slate-500 font-mono">
          Sentinel SOC Platform &bull; v2.4
        </p>
      </div>
    </div>
  );
};
