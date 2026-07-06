'use client';

import { useEffect, useState } from 'react';
import { Link2, Copy, CheckCircle, Users, ExternalLink, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export default function DistributorReferralView() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    if (!token) return;

    fetch(`${API_BASE}/member/referral-info`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setInfo(res.data);
        else setError(res.message || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const getReferralLink = (code: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/register?ref=${code}`;
    }
    return `/register?ref=${code}`;
  };

  const copyLink = () => {
    if (!info?.referral_code) return;
    navigator.clipboard.writeText(getReferralLink(info.referral_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-primary" /></div>;
  if (error) return <div className="py-16 text-center text-red-500">{error}</div>;

  const referralLink = info?.referral_code ? getReferralLink(info.referral_code) : '';

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="stat-card bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
        <div className="flex items-center gap-3 mb-2">
          <Link2 size={20} />
          <h2 className="text-lg font-semibold">Your Referral Link</h2>
        </div>
        <p className="text-sm text-white/80">Share this link to invite new distributors</p>
      </div>

      {info && info.referral_code ? (
        <>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-text-muted" />
              <span className="text-sm text-text-muted">
                {info.total_used} {info.total_used === 1 ? 'person has' : 'people have'} registered using your link
              </span>
            </div>

            <label className="block text-sm font-medium text-text-secondary mb-1">Your Referral Code</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface px-4 py-3 rounded-xl border border-border font-mono text-lg text-primary font-bold">
                {info.referral_code}
              </code>
              <button onClick={() => {
                navigator.clipboard.writeText(info.referral_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }} className="btn-primary px-4 py-3">
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="stat-card">
            <label className="block text-sm font-medium text-text-secondary mb-1">Full Referral Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="input flex-1 font-mono text-sm"
              />
              <button onClick={copyLink} className="btn-primary whitespace-nowrap flex items-center gap-2">
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
              <ExternalLink size={12} />
              Share this link with potential distributors to grow your network
            </p>
          </div>
        </>
      ) : (
        <div className="stat-card py-12 text-center">
          <p className="text-text-muted">No referral code available</p>
        </div>
      )}
    </div>
  );
}
