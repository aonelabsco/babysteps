'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import EventLog from '@/components/EventLog';
import Header from '@/components/Header';
import { subscribeToEvents } from '@/lib/firebase';
import type { BabyEvent } from '@/lib/types';

export default function HistoryPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'feed' | 'poop' | 'pee'>('all');

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
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div className="min-h-screen bg-pink-50 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">History</h1>
          <BabySelector
            babies={family.babies || []}
            selectedId={selectedBabyId}
            onSelect={setSelectedBabyId}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'feed', 'poop', 'pee'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-500 border border-pink-100'
              }`}
            >
              {f === 'all' ? 'All' : f === 'feed' ? '🍼 Feeds' : f === 'poop' ? '💩 Poops' : '💧 Pee'}
            </button>
          ))}
        </div>

        {/* Event log */}
        <div className="bg-white rounded-2xl p-4 border border-pink-100">
          <EventLog events={filtered} showDelete={true} />
        </div>

        <p className="text-xs text-center text-gray-400">
          Showing all logged activity. Share this screen with your doctor.
        </p>
      </div>

      <Header />
    </div>
  );
}
