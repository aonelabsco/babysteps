'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    { key: 'poop', label: '💩 poops' },
    { key: 'pee', label: '💧 pee' },
    { key: 'sleep', label: '😴 sleep' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">history</h1>
          <BabySelector
            babies={family.babies || []}
            selectedId={selectedBabyId}
            onSelect={setSelectedBabyId}
          />
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
