'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, User, Lock, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [loginID, setLoginID] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    setHasPrefilled(params.has('login_id') || params.has('password'));
  }, []);

  useEffect(() => {
    if (!mounted || hasPrefilled) return;
    const token = localStorage.getItem('member_token');
    if (token) {
      fetch(`${API_BASE}/member/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        if (r.ok) router.push('/member/dashboard');
      }).catch(() => {});
    }
  }, [router, mounted, hasPrefilled]);

  useEffect(() => {
    const lid = searchParams.get('login_id');
    const pwd = searchParams.get('password');
    if (lid) setLoginID(lid);
    if (pwd) setPassword(pwd);
  }, [searchParams]);

  // Auto-submit when both fields are pre-filled from registration
  useEffect(() => {
    const lid = searchParams.get('login_id');
    const pwd = searchParams.get('password');
    if (lid && pwd) {
      const timer = setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginID.trim() || !password.trim()) {
      setError('Please enter your Member ID/Username and Password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/member/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: loginID, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('member_token', data.access_token);
        localStorage.setItem('member_user', JSON.stringify(data.user));
        sessionStorage.setItem('member_password', password);
        router.push('/member/dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-xl shadow-primary/30">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Member Login</h1>
          <p className="text-sm text-text-muted mt-1">Sign in with your Member ID or Username</p>
        </div>

        <div className="stat-card">
          <form ref={formRef} onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Member ID or Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input type="text" value={loginID} onChange={e => setLoginID(e.target.value)}
                  placeholder="MEM7XK2P or john_doe_abcd" className="input pl-10 h-12 sm:h-auto" autoFocus />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" className="input pl-10 pr-10 h-12 sm:h-auto" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2 animate-slide-down">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base">
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default function MemberLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
