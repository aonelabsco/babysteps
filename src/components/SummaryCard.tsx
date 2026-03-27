'use client';

import { useState, useEffect } from 'react';
import type { DaySummary } from '@/lib/types';

interface SummaryCardProps {
  summary: DaySummary;
  feedAlert: boolean;
}

function formatTime(ts: number | null): string {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeSince(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hrs}h ${remaining}m ago` : `${hrs}h ago`;
}

export default function SummaryCard({ summary, feedAlert }: SummaryCardProps) {
  // Force re-render every 30 seconds so timeSince stays current
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const sleepStatus = summary.lastSleepEvent
    ? summary.lastSleepEvent.type === 'sleep'
      ? `sleeping — ${timeSince(summary.lastSleepEvent.timestamp)}`
      : `awake — woke ${timeSince(summary.lastSleepEvent.timestamp)}`
    : '--';

  const formatNapTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const napInfo = [];
  if (summary.totalNapMinutes > 0) napInfo.push(`total: ${formatNapTime(summary.totalNapMinutes)}`);
  if (summary.lastNapMinutes !== null) napInfo.push(`last nap: ${formatNapTime(summary.lastNapMinutes)}`);
  const napSummary = napInfo.length > 0 ? napInfo.join(' · ') : null;

  return (
    <div className="bg-dark-900 rounded-2xl p-4 shadow-sm border border-dark-700 space-y-3">
      {feedAlert && (
        <div className="bg-red-900/30 text-red-400 rounded-xl px-4 py-2.5 text-base font-medium border border-red-900/50">
          it&apos;s been over 3 hours since the last feed
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatBox
          label="last feed"
          value={
            summary.lastFeedTime
              ? `${formatTime(summary.lastFeedTime)} — ${summary.lastFeedQuantity}${summary.lastFeedUnit}`
              : 'no feeds today'
          }
        />
        <StatBox
          label="total milk today"
          value={summary.totalMilk > 0 ? `${summary.totalMilk} ${summary.milkUnit}` : '--'}
        />
        <StatBox label="poops today" value={String(summary.poopCount)} />
        <StatBox label="pee today" value={String(summary.peeCount)} />
        <StatBox label="sleep" value={sleepStatus} subtitle={napSummary} span2 />
      </div>
    </div>
  );
}

function StatBox({ label, value, subtitle, span2 }: { label: string; value: string; subtitle?: string | null; span2?: boolean }) {
  return (
    <div className={`bg-dark-800 rounded-xl p-3 ${span2 ? 'col-span-2' : ''}`}>
      <p className="text-base text-gray-500 font-medium">{label}</p>
      <p className="text-lg text-gray-100 font-semibold mt-0.5">{value}</p>
      {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
