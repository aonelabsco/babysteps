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
import type { BabyEvent, EventType, ParsedInput, PoopSize, BreastSide, Allergen } from '@/lib/types';

function NoteInput({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl text-base font-medium bg-dark-800 text-gray-400 border border-dark-600 hover:bg-dark-700 transition-colors"
      >
        📝 leave a note for the family
      </button>
    );
  }

  return (
    <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="leave a note for the family..."
        rows={2}
        autoFocus
        className="w-full py-2 px-3 rounded-lg text-base bg-dark-800 text-gray-200 placeholder-gray-600 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (text.trim()) {
              onSubmit(text.trim());
              setText('');
              setOpen(false);
            }
          }}
          disabled={disabled || !text.trim()}
          className="flex-1 py-2 rounded-lg text-base font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          save note
        </button>
        <button
          onClick={() => { setOpen(false); setText(''); }}
          className="px-4 py-2 rounded-lg text-base bg-dark-800 text-gray-400 hover:bg-dark-700 transition-colors"
        >
          cancel
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dismissedNotes, setDismissedNotes] = useState<Set<string>>(new Set());

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
    extra?: { quantity?: number; unit?: 'ml' | 'oz'; size?: PoopSize; breastSide?: BreastSide; breastDuration?: number; foodName?: string; allergens?: Allergen[]; tummyDuration?: number; milestoneName?: string; noteText?: string }
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
      ...(type === 'feed' ? { quantity: extra?.quantity, unit } : {}),
      ...(type === 'poop' ? { size: extra?.size } : {}),
      ...(type === 'breast' ? { breastSide: extra?.breastSide, breastDuration: extra?.breastDuration } : {}),
      ...(type === 'solid' ? { foodName: extra?.foodName, allergens: extra?.allergens } : {}),
      ...(type === 'tummytime' ? { tummyDuration: extra?.tummyDuration } : {}),
      ...(type === 'milestone' ? { milestoneName: extra?.milestoneName } : {}),
      ...(type === 'note' ? { noteText: extra?.noteText } : {}),
    };

    // Optimistic update — add to local state immediately
    setEvents((prev) => [newEvent, ...prev].sort((a, b) => b.timestamp - a.timestamp));

    const labels: Record<EventType, string> = {
      feed: 'feed logged',
      breast: 'breastfeed logged',
      poop: 'poop logged',
      pee: 'pee logged',
      sleep: 'sleep logged',
      wake: 'wake logged',
      solid: 'solid food logged',
      tummytime: 'tummy time logged',
      milestone: 'milestone logged',
      note: 'note saved',
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
        ...(type === 'feed' ? { quantity: extra?.quantity, unit } : {}),
        ...(type === 'poop' ? { size: extra?.size } : {}),
        ...(type === 'breast' ? { breastSide: extra?.breastSide, breastDuration: extra?.breastDuration } : {}),
        ...(type === 'solid' ? { foodName: extra?.foodName, allergens: extra?.allergens } : {}),
        ...(type === 'tummytime' ? { tummyDuration: extra?.tummyDuration } : {}),
        ...(type === 'milestone' ? { milestoneName: extra?.milestoneName } : {}),
        ...(type === 'note' ? { noteText: extra?.noteText } : {}),
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
      breastSide: parsed.breastSide,
      breastDuration: parsed.breastDuration,
      foodName: parsed.foodName,
      allergens: parsed.allergens,
      tummyDuration: parsed.tummyDuration,
      milestoneName: parsed.milestoneName,
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
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-100">baby steps.</h1>
          <div className="flex items-center gap-2">
            <BabySelector
              babies={family.babies || []}
              selectedId={selectedBabyId}
              onSelect={setSelectedBabyId}
            />
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
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

            {/* Family notes notification */}
            {(() => {
              const notes = events.filter((e) => e.type === 'note' && e.noteText && !dismissedNotes.has(e.id));
              if (notes.length === 0) return null;
              return (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-amber-900/30 rounded-xl px-4 py-3 border border-amber-700/50 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-amber-200/70 font-medium">
                          {note.createdByName} · {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-base text-amber-100 mt-0.5">{note.noteText}</p>
                      </div>
                      <button
                        onClick={() => setDismissedNotes((prev) => new Set([...prev, note.id]))}
                        className="p-1 text-amber-400/60 hover:text-amber-300 transition-colors shrink-0"
                        aria-label="Dismiss note"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            <QuickActions
              defaultUnit={family.defaultUnit}
              feedingMode={family.feedingMode || 'formula'}
              lastSleepEvent={summary.lastSleepEvent}
              onLog={logEvent}
              disabled={saving}
            />

            <VoiceInput
              babyNames={family.babies.map((b) => b.name)}
              onParsed={handleParsed}
              disabled={saving}
            />

            {/* Quick note */}
            <NoteInput onSubmit={(text) => logEvent('note', Date.now(), { noteText: text })} disabled={saving} />

            <div>
              <h3 className="text-lg font-semibold text-gray-500 mb-2">recent</h3>
              <EventLog events={events} limit={5} />
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-50">
          <div className="bg-dark-700 text-gray-100 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg animate-bounce border border-dark-600">
            {toast}
          </div>
        </div>
      )}

      <Header />
    </div>
  );
}
