'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import SummaryCard from '@/components/SummaryCard';
import VoiceInput from '@/components/VoiceInput';
import EventLog from '@/components/EventLog';
import Header from '@/components/Header';
import { subscribeToDayEvents, addEvent, setDefaultUnit } from '@/lib/firebase';
import { useDaySummary, useFeedAlert } from '@/lib/hooks';
import type { BabyEvent, ParsedInput } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Redirect if not logged in or no family
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    } else if (!loading && !familyLoading && !family) {
      router.replace('/');
    }
  }, [user, loading, family, familyLoading, router]);

  // Auto-select first baby
  useEffect(() => {
    if (family?.babies?.length && !selectedBabyId) {
      setSelectedBabyId(family.babies[0].id);
    }
  }, [family?.babies, selectedBabyId]);

  // Subscribe to today's events
  useEffect(() => {
    if (!family?.id || !selectedBabyId) return;
    const unsub = subscribeToDayEvents(family.id, selectedBabyId, setEvents);
    return unsub;
  }, [family?.id, selectedBabyId]);

  const summary = useDaySummary(events);
  const feedAlert = useFeedAlert(summary.lastFeedTime);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleParsed = async (parsed: ParsedInput) => {
    if (!family || !user) return;

    // If baby name is specified and we have multiple babies, try to find it
    let babyId = selectedBabyId;
    let babyName = family.babies.find((b) => b.id === selectedBabyId)?.name || '';
    if (parsed.babyName) {
      const match = family.babies.find(
        (b) => b.name.toLowerCase() === parsed.babyName!.toLowerCase()
      );
      if (match) {
        babyId = match.id;
        babyName = match.name;
      }
    }

    if (!babyId) {
      showToast('Please add a baby first in Settings');
      return;
    }

    // Determine unit — use parsed unit, or family default, or set the default
    let unit = parsed.unit;
    if (parsed.type === 'feed' && !unit) {
      unit = family.defaultUnit || 'ml';
    }
    if (parsed.type === 'feed' && unit && !family.defaultUnit) {
      await setDefaultUnit(family.id, unit);
    }

    setSaving(true);
    try {
      await addEvent({
        familyId: family.id,
        babyId,
        babyName,
        type: parsed.type,
        timestamp: Date.now(),
        createdBy: user.uid,
        createdByName: user.displayName || 'Parent',
        ...(parsed.type === 'feed' && { quantity: parsed.quantity, unit }),
        ...(parsed.type === 'poop' && { size: parsed.size }),
      });
      const labels = { feed: 'Feed logged', poop: 'Poop logged', pee: 'Pee logged' };
      showToast(labels[parsed.type]);
    } catch (err) {
      showToast('Failed to save. Try again.');
    }
    setSaving(false);
  };

  if (loading || familyLoading || !family) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const noBabies = !family.babies || family.babies.length === 0;

  return (
    <div className="min-h-screen bg-pink-50 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">baby steps</h1>
          <BabySelector
            babies={family.babies || []}
            selectedId={selectedBabyId}
            onSelect={setSelectedBabyId}
          />
        </div>

        {noBabies ? (
          <div className="bg-white rounded-2xl p-6 border border-pink-100 text-center">
            <p className="text-gray-500 mb-3">Add your baby to get started</p>
            <button
              onClick={() => router.push('/settings')}
              className="px-6 py-2 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600"
            >
              Go to Settings
            </button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <SummaryCard summary={summary} feedAlert={feedAlert} />

            {/* Voice/text input */}
            <VoiceInput
              babyNames={family.babies.map((b) => b.name)}
              onParsed={handleParsed}
              disabled={saving}
            />

            {/* Recent activity */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Recent Activity</h3>
              <EventLog events={events} limit={10} />
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 animate-bounce">
          {toast}
        </div>
      )}

      <Header />
    </div>
  );
}
