'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import EventLog from '@/components/EventLog';
import Header from '@/components/Header';
import { subscribeToEvents } from '@/lib/firebase';
import { computeAverages, computeYesterday } from '@/lib/hooks';
import type { BabyEvent, EventType } from '@/lib/types';

type FilterType = 'all' | EventType;

export default function HistoryPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [avgPeriod, setAvgPeriod] = useState<1 | 7 | 30>(1);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
    if (!loading && !familyLoading && !family) router.replace('/');
  }, [user, loading, family, familyLoading, router]);

  useEffect(() => {
    if (family?.babies?.length && !selectedBabyId) {
      setSelectedBabyId(family.babies[0].id);
    }
  }, [family?.babies, selectedBabyId]);

  useEffect(() => {
    if (!family?.id || !selectedBabyId) return;
    const unsub = subscribeToEvents(family.id, selectedBabyId, setEvents);
    return unsub;
  }, [family?.id, selectedBabyId]);

  if (loading || familyLoading || !family) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-gray-500">loading...</div>
      </div>
    );
  }

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const averages = avgPeriod === 1 ? computeYesterday(events) : computeAverages(events, avgPeriod);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'all' },
    { key: 'feed', label: '🍼 formula' },
    { key: 'breast', label: '🤱 breast' },
    { key: 'solid', label: '🥑 solids' },
    { key: 'poop', label: '💩 poops' },
    { key: 'pee', label: '💧 pee' },
    { key: 'sleep', label: '😴 sleep' },
    { key: 'tummytime', label: '👶 tummy' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">history</h1>
          <div className="flex items-center gap-2">
            <BabySelector
              babies={family.babies || []}
              selectedId={selectedBabyId}
              onSelect={setSelectedBabyId}
            />
            <Link
              href="/settings"
              className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Averages */}
        {averages.daysCovered > 0 && (
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500">{avgPeriod === 1 ? 'yesterday' : 'averages'}</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setAvgPeriod(1)}
                  className={`px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
                    avgPeriod === 1 ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-500'
                  }`}
                >
                  1d
                </button>
                <button
                  onClick={() => setAvgPeriod(7)}
                  className={`px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
                    avgPeriod === 7 ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-500'
                  }`}
                >
                  7d
                </button>
                <button
                  onClick={() => setAvgPeriod(30)}
                  className={`px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
                    avgPeriod === 30 ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-500'
                  }`}
                >
                  30d
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AvgBox label={avgPeriod === 1 ? 'feeds' : 'feeds/day'} value={String(averages.avgFeedsPerDay)} />
              <AvgBox label={avgPeriod === 1 ? averages.milkUnit : `${averages.milkUnit}/day`} value={String(averages.avgMilkPerDay)} />
              <AvgBox label={avgPeriod === 1 ? 'poops' : 'poops/day'} value={String(averages.avgPoopsPerDay)} />
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f.key
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-gray-400 border border-dark-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Event log */}
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700">
          <EventLog events={filtered} showDelete={true} collapsible={true} />
        </div>

        <p className="text-sm text-center text-gray-600">
          showing all logged activity. share this screen with your doctor.
        </p>
      </div>

      <Header />
    </div>
  );
}

function AvgBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-800 rounded-xl p-2.5 text-center">
      <p className="text-lg text-gray-100 font-semibold">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
