'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import SummaryCard from '@/components/SummaryCard';
import QuickActions from '@/components/QuickActions';
import VoiceInput from '@/components/VoiceInput';
import EventLog from '@/components/EventLog';
import Header from '@/components/Header';
import { subscribeToDayEvents, addEvent, setDefaultUnit } from '@/lib/firebase';
import { useDaySummary, useFeedAlert } from '@/lib/hooks';
import type { BabyEvent, EventType, ParsedInput, PoopSize } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    } else if (!loading && !familyLoading && !family) {
      router.replace('/');
    }
  }, [user, loading, family, familyLoading, router]);

  useEffect(() => {
    if (family?.babies?.length && !selectedBabyId) {
      setSelectedBabyId(family.babies[0].id);
    }
  }, [family?.babies, selectedBabyId]);

  useEffect(() => {
    if (!family?.id || !selectedBabyId) return;
    const unsub = subscribeToDayEvents(
      family.id,
      selectedBabyId,
      setEvents,
      (err) => {
        // Firestore index errors contain a URL to create the index
        const msg = err.message || '';
        if (msg.includes('index')) {
          console.error('Missing Firestore index. Create it here:', msg);
        }
      }
    );
    return unsub;
  }, [family?.id, selectedBabyId]);

  const summary = useDaySummary(events);
  const feedAlert = useFeedAlert(summary.lastFeedTime);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // Shared logging function with optimistic update
  const logEvent = useCallback(async (
    type: EventType,
    timestamp: number,
    extra?: { quantity?: number; unit?: 'ml' | 'oz'; size?: PoopSize }
  ) => {
    if (!family || !user || !selectedBabyId) return;

    const babyName = family.babies.find((b) => b.id === selectedBabyId)?.name || '';
    const unit = extra?.unit || (type === 'feed' ? (family.defaultUnit || 'ml') : undefined);

    // Set default unit on first feed
    if (type === 'feed' && unit && !family.defaultUnit) {
      setDefaultUnit(family.id, unit);
    }

    const newEvent: BabyEvent = {
      id: `optimistic-${Date.now()}`,
      familyId: family.id,
      babyId: selectedBabyId,
      babyName,
      type,
      timestamp,
      createdBy: user.uid,
      createdByName: user.displayName || 'Parent',
      ...(type === 'feed' && { quantity: extra?.quantity, unit }),
      ...(type === 'poop' && { size: extra?.size }),
    };

    // Optimistic update — add to local state immediately
    setEvents((prev) => [newEvent, ...prev].sort((a, b) => b.timestamp - a.timestamp));

    const labels: Record<EventType, string> = {
      feed: 'feed logged',
      poop: 'poop logged',
      pee: 'pee logged',
      sleep: 'sleep logged',
      wake: 'wake logged',
    };
    showToast(labels[type]);

    setSaving(true);
    try {
      await addEvent({
        familyId: family.id,
        babyId: selectedBabyId,
        babyName,
        type,
        timestamp,
        createdBy: user.uid,
        createdByName: user.displayName || 'Parent',
        ...(type === 'feed' && { quantity: extra?.quantity, unit }),
        ...(type === 'poop' && { size: extra?.size }),
      });
    } catch {
      showToast('failed to save. try again.');
      // Remove optimistic entry on failure
      setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
    }
    setSaving(false);
  }, [family, user, selectedBabyId, showToast]);

  // Handle voice/text parsed input
  const handleParsed = useCallback(async (parsed: ParsedInput) => {
    if (!family || !user) return;

    let babyId = selectedBabyId;
    if (parsed.babyName) {
      const match = family.babies.find(
        (b) => b.name.toLowerCase() === parsed.babyName!.toLowerCase()
      );
      if (match) babyId = match.id;
    }

    if (!babyId) {
      showToast('please add a baby first in settings');
      return;
    }

    const timestamp = parsed.timestamp || Date.now();
    await logEvent(parsed.type, timestamp, {
      quantity: parsed.quantity,
      unit: parsed.unit,
      size: parsed.size,
    });
  }, [family, user, selectedBabyId, logEvent, showToast]);

  if (loading || familyLoading || !family) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-gray-500">loading...</div>
      </div>
    );
  }

  const noBabies = !family.babies || family.babies.length === 0;

  return (
    <div className="min-h-screen bg-dark-950 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-100">baby steps.</h1>
          <BabySelector
            babies={family.babies || []}
            selectedId={selectedBabyId}
            onSelect={setSelectedBabyId}
          />
        </div>

        {noBabies ? (
          <div className="bg-dark-900 rounded-2xl p-6 border border-dark-700 text-center">
            <p className="text-gray-400 mb-3">add your baby to get started</p>
            <button
              onClick={() => router.push('/settings')}
              className="px-6 py-2 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600"
            >
              go to settings
            </button>
          </div>
        ) : (
          <>
            <SummaryCard summary={summary} feedAlert={feedAlert} />

            <QuickActions
              defaultUnit={family.defaultUnit}
              lastSleepEvent={summary.lastSleepEvent}
              onLog={logEvent}
              disabled={saving}
            />

            <VoiceInput
              babyNames={family.babies.map((b) => b.name)}
              onParsed={handleParsed}
              disabled={saving}
            />

            <div>
              <h3 className="text-lg font-semibold text-gray-500 mb-2">recent</h3>
              <EventLog events={events} limit={5} />
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-dark-700 text-gray-100 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 animate-bounce border border-dark-600">
          {toast}
        </div>
      )}

      <Header />
    </div>
  );
}
