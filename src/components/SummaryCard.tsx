'use client';

import type { DaySummary } from '@/lib/types';

interface SummaryCardProps {
  summary: DaySummary;
  feedAlert: boolean;
}

function formatTime(ts: number | null): string {
  if (!ts) return '--';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SummaryCard({ summary, feedAlert }: SummaryCardProps) {
  return (
    <div className="bg-dark-900 rounded-2xl p-5 shadow-sm border border-dark-700 space-y-3">
      {feedAlert && (
        <div className="bg-red-900/30 text-red-400 rounded-xl px-4 py-2 text-sm font-medium border border-red-900/50">
          It&apos;s been over 3 hours since the last feed
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatBox
          label="Last Feed"
          value={
            summary.lastFeedTime
              ? `${formatTime(summary.lastFeedTime)} — ${summary.lastFeedQuantity}${summary.lastFeedUnit}`
              : 'No feeds today'
          }
        />
        <StatBox
          label="Total Milk Today"
          value={summary.totalMilk > 0 ? `${summary.totalMilk} ${summary.milkUnit}` : '--'}
        />
        <StatBox label="Poops Today" value={String(summary.poopCount)} />
        <StatBox label="Pee Changes Today" value={String(summary.peeCount)} />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-800 rounded-xl p-3">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-base text-gray-100 font-semibold mt-0.5">{value}</p>
    </div>
  );
}
