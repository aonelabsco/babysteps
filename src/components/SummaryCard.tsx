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
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100 space-y-3">
      {feedAlert && (
        <div className="bg-pink-100 text-pink-700 rounded-xl px-4 py-2 text-sm font-medium">
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
    <div className="bg-pink-50 rounded-xl p-3">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-base text-gray-900 font-semibold mt-0.5">{value}</p>
    </div>
  );
}
