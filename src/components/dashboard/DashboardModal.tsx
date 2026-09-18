/**
 * Purpose:
 * Central developer dashboard allowing users to create shortened URLs,
 * customize aliases, set expirations, manage existing links, toggle status,
 * launch analytics views, and generate QR codes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createUrl, deleteUrl, listUrls, updateUrl } from '../../lib/api/urls';
import type { UrlModel } from '../../types/api';
import { QrModal } from '../modals/QrModal';
import { AnalyticsModal } from './AnalyticsModal';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [urls, setUrls] = useState<UrlModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expirationOption, setExpirationOption] = useState<string>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sub-modals for QR and Analytics
  const [qrUrl, setQrUrl] = useState<{ url: string; shortCode: string } | null>(null);
  const [analyticsCode, setAnalyticsCode] = useState<string | null>(null);

  const fetchUserUrls = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await listUrls();
      setUrls(data);
    } catch (err) {
      console.error('Failed to load user URLs:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchUserUrls();
    }
  }, [isOpen, isAuthenticated, fetchUserUrls]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!originalUrl.trim()) {
      setFormError('Please enter a destination URL.');
      return;
    }

    let expiresInSeconds: number | undefined;
    if (expirationOption === '1h') expiresInSeconds = 3600;
    else if (expirationOption === '1d') expiresInSeconds = 86400;
    else if (expirationOption === '7d') expiresInSeconds = 7 * 86400;

    setCreating(true);
    try {
      const newUrl = await createUrl({
        originalUrl: originalUrl.trim(),
        customAlias: customAlias.trim() || undefined,
        expiresInSeconds,
      });

      setUrls((prev) => [newUrl, ...prev]);
      setOriginalUrl('');
      setCustomAlias('');
      setExpirationOption('none');
      setShowAdvanced(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create short link.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (url: UrlModel) => {
    try {
      const updated = await updateUrl(url.shortCode, { isActive: !url.isActive });
      setUrls((prev) => prev.map((u) => (u.shortCode === url.shortCode ? updated : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not toggle link status.');
    }
  };

  const handleDelete = async (shortCode: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete /${shortCode}?`)) {
      return;
    }

    try {
      await deleteUrl(shortCode);
      setUrls((prev) => prev.filter((u) => u.shortCode !== shortCode));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete link.');
    }
  };

  const handleCopy = (shortUrl: string, code: string) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A0A0A] border border-white/20 rounded-2xl p-5 sm:p-8 text-white shadow-2xl flex flex-col">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="font-heading text-xl sm:text-2xl font-medium tracking-tight">Ctrl Short</span>
              <span className="text-xl text-white/80 select-none">✳︎</span>
              <span className="text-xs font-mono px-2 py-0.5 bg-white/10 text-white/70 rounded">
                Dashboard
              </span>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white/60 hidden sm:inline truncate max-w-[180px]">
                    {user?.email}
                  </span>
                  <button
                    type="button"
                    onClick={signOut}
                    className="text-xs font-mono text-white/50 hover:text-white underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-xs font-mono py-1.5 px-3 bg-white text-black rounded-full font-medium hover:bg-white/90"
                >
                  Sign In
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="text-white/60 hover:text-white p-1 rounded text-xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="overflow-y-auto pr-1 mt-6 space-y-6 flex-1 text-left">
            {/* Shorten Creation Box */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
              <h2 id="dashboard-modal-title" className="text-sm font-mono uppercase tracking-wider text-white/70 mb-3">
                Create Short Link
              </h2>

              {formError && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-200 font-mono">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={originalUrl}
                    onChange={(e) => setOriginalUrl(e.target.value)}
                    placeholder="https://example.com/your-very-long-url-destination"
                    required
                    className="flex-1 px-4 py-2.5 bg-black/60 border border-white/15 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white font-mono transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={creating}
                    className="py-2.5 px-6 bg-white text-black font-medium rounded-lg text-sm hover:bg-white/90 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    {creating ? 'Shortening...' : 'Shorten Link'}
                  </button>
                </div>

                {/* Advanced Options Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <span>{showAdvanced ? '− Hide options' : '+ Custom alias & expiration'}</span>
                  </button>
                </div>

                {showAdvanced && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60 mb-1">
                        Custom Alias (optional)
                      </label>
                      <div className="flex items-center bg-black/60 border border-white/15 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-white/40 select-none">/</span>
                        <input
                          type="text"
                          value={customAlias}
                          onChange={(e) => setCustomAlias(e.target.value)}
                          placeholder="my-link"
                          className="w-full bg-transparent text-sm text-white focus:outline-none font-mono placeholder-white/30 ml-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60 mb-1">
                        Link Expiration
                      </label>
                      <select
                        value={expirationOption}
                        onChange={(e) => setExpirationOption(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none font-mono"
                      >
                        <option value="none">No expiration (Permanent)</option>
                        <option value="1h">Expire after 1 hour</option>
                        <option value="1d">Expire after 24 hours</option>
                        <option value="7d">Expire after 7 days</option>
                      </select>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Links List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-mono uppercase tracking-wider text-white/70">
                  Your Links ({urls.length})
                </h3>
                <button
                  type="button"
                  onClick={fetchUserUrls}
                  disabled={loading}
                  className="text-xs font-mono text-white/50 hover:text-white transition-colors"
                >
                  {loading ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>

              {!isAuthenticated ? (
                <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-sm text-white/70 mb-3">
                    Sign in with your developer account to manage links and view live analytics.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="py-2 px-5 bg-white text-black font-medium text-xs rounded-full hover:bg-white/90"
                  >
                    Sign In or Create Account
                  </button>
                </div>
              ) : urls.length === 0 && !loading ? (
                <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl text-sm text-white/40 font-mono">
                  No shortened links yet. Create your first link above.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {urls.map((url) => (
                    <div
                      key={url.shortCode}
                      className="p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/25 transition-all"
                    >
                      {/* Link Info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={url.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm sm:text-base font-semibold text-white hover:underline truncate"
                          >
                            {url.shortUrl}
                          </a>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              !url.isActive
                                ? 'border-red-500/50 text-red-400 bg-red-950/30'
                                : url.expiresAt && Date.now() / 1000 > url.expiresAt
                                ? 'border-yellow-500/50 text-yellow-400 bg-yellow-950/30'
                                : 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                            }`}
                          >
                            {!url.isActive
                              ? 'Disabled'
                              : url.expiresAt && Date.now() / 1000 > url.expiresAt
                              ? 'Expired'
                              : 'Active'}
                          </span>
                        </div>

                        <p className="text-xs text-white/50 truncate max-w-md font-mono">
                          ↳ {url.originalUrl}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-white/40 font-mono pt-0.5">
                          <span>{new Date(url.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{url.totalClicks || 0} clicks</span>
                          {url.expiresAt && (
                            <>
                              <span>•</span>
                              <span>Expires: {new Date(url.expiresAt * 1000).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(url.shortUrl, url.shortCode)}
                          className="px-2.5 py-1.5 text-xs font-mono bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                        >
                          {copiedCode === url.shortCode ? '✓ Copied' : 'Copy'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setAnalyticsCode(url.shortCode)}
                          className="px-2.5 py-1.5 text-xs font-mono bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                        >
                          Analytics
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrUrl({ url: url.shortUrl, shortCode: url.shortCode })}
                          className="px-2.5 py-1.5 text-xs font-mono bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                        >
                          QR
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(url)}
                          title={url.isActive ? 'Disable link' : 'Enable link'}
                          className="px-2 py-1.5 text-xs font-mono text-white/60 hover:text-white"
                        >
                          {url.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(url.shortCode)}
                          title="Delete link"
                          className="px-2 py-1.5 text-xs font-mono text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {qrUrl && (
        <QrModal
          isOpen={Boolean(qrUrl)}
          onClose={() => setQrUrl(null)}
          url={qrUrl.url}
          shortCode={qrUrl.shortCode}
        />
      )}

      {analyticsCode && (
        <AnalyticsModal
          isOpen={Boolean(analyticsCode)}
          onClose={() => setAnalyticsCode(null)}
          shortCode={analyticsCode}
        />
      )}
    </>
  );
};
