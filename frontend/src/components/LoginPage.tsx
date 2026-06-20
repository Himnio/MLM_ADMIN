'use client';

import { useState } from 'react';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    const res = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', { email, password });
    setLoading(false);
    if (res.success && res.data) {
      api.setTokens(res.data.access_token, res.data.refresh_token);
      onLogin();
    } else {
      setError(res.message || res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold text-white">M</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">MLM Admin Panel</h2>
          <p className="text-indigo-200/80 text-lg max-w-md">
            Manage your multi-level marketing network with powerful analytics and real-time insights.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { value: '10K+', label: 'Members' },
              { value: '$2M+', label: 'Revenue' },
              { value: '99.9%', label: 'Uptime' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-indigo-200/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-xl shadow-primary/30">
              <span className="text-3xl font-bold text-white">M</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Welcome Back</h2>
            <p className="text-text-muted mt-1">Sign in to your admin account</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-bold text-text-primary">Welcome Back</h2>
            <p className="text-text-muted mt-2">Sign in to your admin account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input pl-10"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-slide-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base relative overflow-hidden group"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-text-muted">
            &copy; {new Date().getFullYear()} MLM Admin Panel. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
