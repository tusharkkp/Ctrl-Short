/**
 * Purpose:
 * Analytics dashboard modal displaying total clicks, unique visitor estimates,
 * time-series click history, device distributions, and geographic statistics.
 */

import React, { useEffect, useState } from 'react';
import { getUrlAnalytics } from '../../lib/api/analytics';
import type { AnalyticsData, BreakdownStat } from '../../types/api';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortCode: string;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  shortCode,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !shortCode) return;

    setLoading(true);
    setError(null);

    getUrlAnalytics(shortCode)
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not fetch analytics.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, shortCode]);

  if (!isOpen) return null;

  const renderBarChart = (title: string, items: BreakdownStat[] = []) => {
    if (!items.length) {
      return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-white/50 mb-3">{title}</h4>
          <p className="text-xs text-white/30 italic">No traffic recorded yet</p>
        </div>
      );
    }

    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-white/60 mb-3">{title}</h4>
        <div className="space-y-2.5">
          {items.slice(0, 4).map((item) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white/80 truncate max-w-[160px]">{item.name}</span>
                <span className="text-white/50">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.percentage, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] bg-[#0A0A0A] border border-white/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="analytics-modal-title" className="text-lg font-medium">Link Analytics</h2>
              <span className="text-xs font-mono px-2 py-0.5 bg-white/10 text-white rounded">
                /{shortCode}
              </span>
            </div>
            {data?.originalUrl && (
              <p className="text-xs text-white/50 font-mono truncate max-w-md mt-1">
                {data.originalUrl}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/60 hover:text-white p-1 rounded text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 mt-6 space-y-6 flex-1 text-left">
          {loading ? (
            <div className="text-center py-16 text-white/40 font-mono text-sm">
              Loading analytics metrics...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs uppercase tracking-wider font-mono text-white/50 mb-1">
                    Total Clicks
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono">
                    {data?.totalClicks || 0}
                  </div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs uppercase tracking-wider font-mono text-white/50 mb-1">
                    Unique Visitors
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono">
                    {data?.uniqueVisitors || 0}
                  </div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl col-span-2 sm:col-span-1">
                  <div className="text-xs uppercase tracking-wider font-mono text-white/50 mb-1">
                    Privacy Protection
                  </div>
                  <div className="text-xs font-mono text-white/80 mt-1">
                    Salted SHA-256 (Zero IP logging)
                  </div>
                </div>
              </div>

              {/* Click Activity Over Time */}
              {data?.clicksOverTime && data.clicksOverTime.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-white/60 mb-3">
                    Daily Click Activity
                  </h4>
                  <div className="flex items-end gap-2 h-24 pt-4 border-b border-white/10">
                    {data.clicksOverTime.map((point) => {
                      const maxClicks = Math.max(...data.clicksOverTime.map((p) => p.clicks), 1);
                      const heightPercent = Math.max((point.clicks / maxClicks) * 100, 10);
                      return (
                        <div key={point.date} className="flex-1 flex flex-col items-center gap-1 group">
                          <div
                            className="w-full bg-white group-hover:bg-white/80 rounded-t transition-all"
                            style={{ height: `${heightPercent}%` }}
                            title={`${point.date}: ${point.clicks} clicks`}
                          />
                          <span className="text-[10px] font-mono text-white/40 truncate w-full text-center">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Breakdowns Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderBarChart('Top Devices', data?.devices)}
                {renderBarChart('Top Browsers', data?.browsers)}
                {renderBarChart('Operating Systems', data?.operatingSystems)}
                {renderBarChart('Top Referrers', data?.referrers)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
