'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import Header from '@/components/Header';
import { subscribeToEvents, addEvent } from '@/lib/firebase';
import type { BabyEvent, MealType, Allergen } from '@/lib/types';
import { COMMON_ALLERGENS, COMMON_MILESTONES } from '@/lib/types';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function timeStringToTimestamp(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (d.getTime() > Date.now() + 60000) {
    d.setDate(d.getDate() - 1);
  }
  return d.getTime();
}

function TimePicker({ onSelect }: { onSelect: (timestamp: number) => void }) {
  const [mode, setMode] = useState<'now' | 'custom'>('now');
  const [customTime, setCustomTime] = useState(getCurrentTimeString);

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => { setMode('now'); onSelect(Date.now()); }}
        className={`flex-1 py-2.5 rounded-lg text-base font-medium transition-colors ${
          mode === 'now'
            ? 'bg-accent-500 text-white'
            : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
        }`}
      >
        now
      </button>
      <div className="flex-1 flex gap-1.5">
        <input
          type="time"
          value={customTime}
          onChange={(e) => { setCustomTime(e.target.value); setMode('custom'); }}
          onFocus={() => setMode('custom')}
          className="flex-1 py-2 px-3 rounded-lg text-base text-center bg-dark-800 text-gray-300 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        {mode === 'custom' && (
          <button
            onClick={() => onSelect(timeStringToTimestamp(customTime))}
            className="px-4 py-2 rounded-lg text-base font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors"
          >
            log
          </button>
        )}
      </div>
    </div>
  );
}

type ActivePanel = 'solid' | 'tummy' | null;

export default function ActivityPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [toast, setToast] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Solid food state
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState<MealType>('snack');
  const [selectedAllergens, setSelectedAllergens] = useState<Set<Allergen>>(new Set());

  // Tummy time state
  const [tummyTimerRunning, setTummyTimerRunning] = useState(false);
  const [tummySeconds, setTummySeconds] = useState(0);
  const tummyStartTime = useRef<number | null>(null);
  const tummyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Milestone state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [customMilestone, setCustomMilestone] = useState('');

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

  // Tummy timer
  useEffect(() => {
    if (tummyTimerRunning) {
      tummyTimerRef.current = setInterval(() => setTummySeconds((s) => s + 1), 1000);
    } else if (tummyTimerRef.current) {
      clearInterval(tummyTimerRef.current);
      tummyTimerRef.current = null;
    }
    return () => { if (tummyTimerRef.current) clearInterval(tummyTimerRef.current); };
  }, [tummyTimerRunning]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const logEvent = useCallback(async (
    type: 'solid' | 'tummytime' | 'milestone',
    timestamp: number,
    extra?: { foodName?: string; mealType?: MealType; allergens?: Allergen[]; tummyDuration?: number; milestoneName?: string }
  ) => {
    if (!family || !user || !selectedBabyId) return;
    const babyName = family.babies.find((b) => b.id === selectedBabyId)?.name || '';
    try {
      await addEvent({
        familyId: family.id,
        babyId: selectedBabyId,
        babyName,
        type,
        timestamp,
        createdBy: user.uid,
        createdByName: user.displayName || 'Parent',
        ...(type === 'solid' && { foodName: extra?.foodName, mealType: extra?.mealType, allergens: extra?.allergens }),
        ...(type === 'tummytime' && { tummyDuration: extra?.tummyDuration }),
        ...(type === 'milestone' && { milestoneName: extra?.milestoneName }),
      });
      const labels = { solid: 'solid food logged', tummytime: 'tummy time logged', milestone: 'milestone logged' };
      showToast(labels[type]);
    } catch {
      showToast('failed to save. try again.');
    }
  }, [family, user, selectedBabyId, showToast]);

  if (loading || familyLoading || !family) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-gray-500">loading...</div>
      </div>
    );
  }

  const togglePanel = (panel: ActivePanel) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      setFoodName('');
      setSelectedAllergens(new Set());
      if (panel !== 'tummy') {
        setTummyTimerRunning(false);
        setTummySeconds(0);
        tummyStartTime.current = null;
      }
    }
  };

  // Milestone data
  const milestoneEvents = events.filter((e) => e.type === 'milestone');
  const achieved = new Set(milestoneEvents.map((e) => e.milestoneName));

  // Allergen data
  const solidEvents = events.filter((e) => e.type === 'solid' && e.allergens?.length);
  const introducedAllergens = new Map<Allergen, number>();
  [...solidEvents].reverse().forEach((e) => {
    e.allergens?.forEach((a) => {
      if (!introducedAllergens.has(a)) introducedAllergens.set(a, e.timestamp);
    });
  });

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">activity</h1>
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

        {/* Quick log buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => togglePanel('solid')}
            className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all ${
              activePanel === 'solid'
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            🥑 solids
          </button>
          <button
            onClick={() => togglePanel('tummy')}
            className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all ${
              activePanel === 'tummy'
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            👶 tummy time
          </button>
        </div>

        {/* Solid food panel */}
        {activePanel === 'solid' && (
          <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-3">
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="what did baby eat?"
              className="w-full py-2.5 px-3 rounded-lg text-base bg-dark-800 text-gray-200 placeholder-gray-600 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <div className="flex gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMealType(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mealType === m
                      ? 'bg-accent-500 text-white'
                      : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1.5">allergens (tap to tag)</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ALLERGENS.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      const next = new Set(selectedAllergens);
                      if (next.has(a)) next.delete(a); else next.add(a);
                      setSelectedAllergens(next);
                    }}
                    className={`px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedAllergens.has(a)
                        ? 'bg-orange-500/80 text-white'
                        : 'bg-dark-800 text-gray-500 hover:bg-dark-700'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            {foodName.trim() ? (
              <TimePicker onSelect={(ts) => {
                logEvent('solid', ts, {
                  foodName: foodName.trim(),
                  mealType,
                  allergens: selectedAllergens.size > 0 ? [...selectedAllergens] : undefined,
                });
                setFoodName('');
                setSelectedAllergens(new Set());
                setActivePanel(null);
              }} />
            ) : (
              <p className="text-base text-gray-600 text-center">type what baby ate, then choose when</p>
            )}
          </div>
        )}

        {/* Tummy time panel */}
        {activePanel === 'tummy' && (
          <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-3">
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold text-gray-100 font-mono tracking-wider">
                {formatTimer(tummySeconds)}
              </p>
              {!tummyTimerRunning ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { tummyStartTime.current = Date.now(); setTummySeconds(0); setTummyTimerRunning(true); }}
                    className="flex-1 py-2.5 rounded-lg text-base font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors"
                  >
                    start timer
                  </button>
                  <button
                    onClick={() => {
                      logEvent('tummytime', Date.now());
                      setActivePanel(null);
                    }}
                    className="flex-1 py-2.5 rounded-lg text-base font-medium bg-dark-800 text-gray-400 hover:bg-dark-700 transition-colors"
                  >
                    log without timer
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const duration = Math.max(1, Math.round(tummySeconds / 60));
                      const startTs = tummyStartTime.current || (Date.now() - tummySeconds * 1000);
                      logEvent('tummytime', startTs, { tummyDuration: duration });
                      setTummyTimerRunning(false);
                      setTummySeconds(0);
                      tummyStartTime.current = null;
                      setActivePanel(null);
                    }}
                    className="flex-1 py-3 rounded-lg text-base font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    done — log tummy time
                  </button>
                  <button
                    onClick={() => { setTummyTimerRunning(false); setTummySeconds(0); tummyStartTime.current = null; }}
                    className="px-4 py-3 rounded-lg text-base font-medium bg-dark-800 text-gray-400 hover:bg-dark-700 transition-colors"
                  >
                    cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-500">milestones</h2>
            <span className="text-sm text-gray-600">{achieved.size} recorded</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_MILESTONES.map((m) => (
              <button
                key={m}
                onClick={() => !achieved.has(m) && logEvent('milestone', Date.now(), { milestoneName: m })}
                className={`px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
                  achieved.has(m)
                    ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                    : 'bg-dark-800 text-gray-500 hover:bg-dark-700 hover:text-gray-300'
                }`}
              >
                {achieved.has(m) ? '✓ ' : ''}{m}
              </button>
            ))}
          </div>
          {!showMilestoneForm ? (
            <button
              onClick={() => setShowMilestoneForm(true)}
              className="text-sm text-accent-400 hover:text-accent-300"
            >
              + add custom milestone
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customMilestone}
                onChange={(e) => setCustomMilestone(e.target.value)}
                placeholder="e.g. first laugh"
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-dark-800 text-gray-200 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              <button
                onClick={() => {
                  if (customMilestone.trim()) {
                    logEvent('milestone', Date.now(), { milestoneName: customMilestone.trim() });
                    setCustomMilestone('');
                    setShowMilestoneForm(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-sm bg-accent-500 text-white font-medium"
              >
                add
              </button>
              <button
                onClick={() => { setShowMilestoneForm(false); setCustomMilestone(''); }}
                className="px-3 py-2 rounded-lg text-sm bg-dark-800 text-gray-400"
              >
                cancel
              </button>
            </div>
          )}
          {milestoneEvents.length > 0 && (
            <div className="space-y-1 pt-1">
              {milestoneEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">🌟 {e.milestoneName}</span>
                  <span className="text-gray-600">{new Date(e.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Allergens introduced */}
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-500">allergens introduced</h2>
            <span className="text-sm text-gray-600">{introducedAllergens.size}/{COMMON_ALLERGENS.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGENS.map((a) => {
              const date = introducedAllergens.get(a);
              return (
                <div
                  key={a}
                  className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                    date
                      ? 'bg-green-600/30 text-green-400 border border-green-600/50'
                      : 'bg-dark-800 text-gray-600'
                  }`}
                  title={date ? `introduced ${new Date(date).toLocaleDateString()}` : 'not yet introduced'}
                >
                  {date ? '✓ ' : ''}{a}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-600">
            tag allergens when logging solid foods to track introduction
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-dark-700 text-gray-100 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 animate-bounce border border-dark-600">
          {toast}
        </div>
      )}

      <Header />
    </div>
  );
}
