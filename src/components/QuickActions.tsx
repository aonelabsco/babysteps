'use client';

import { useState, useEffect, useRef } from 'react';
import type { EventType, PoopSize, BabyEvent, BreastSide, FeedingMode, MealType, Allergen } from '@/lib/types';
import { COMMON_ALLERGENS } from '@/lib/types';

interface EventExtra {
  quantity?: number;
  unit?: 'ml' | 'oz';
  size?: PoopSize;
  breastSide?: BreastSide;
  breastDuration?: number;
  foodName?: string;
  mealType?: MealType;
  allergens?: Allergen[];
  tummyDuration?: number;
}

interface QuickActionsProps {
  defaultUnit: 'ml' | 'oz' | null;
  feedingMode: FeedingMode;
  lastSleepEvent: BabyEvent | null;
  onLog: (type: EventType, timestamp: number, extra?: EventExtra) => void;
  disabled?: boolean;
}

const ML_PRESETS = [60, 90, 120, 150];
const OZ_PRESETS = [2, 3, 4, 5];

type ExpandedAction = 'feed' | 'breast' | 'poop' | 'pee' | 'sleep' | 'solid' | 'tummy' | null;

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

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuickActions({ defaultUnit, feedingMode, lastSleepEvent, onLog, disabled }: QuickActionsProps) {
  const [expanded, setExpanded] = useState<ExpandedAction>(null);
  const [selectedSize, setSelectedSize] = useState<PoopSize>('medium');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // Breastfeeding state
  const [breastSide, setBreastSide] = useState<BreastSide>('left');
  const [breastTimerRunning, setBreastTimerRunning] = useState(false);
  const [breastSeconds, setBreastSeconds] = useState(0);
  const breastStartTime = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Solid food state
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState<MealType>('snack');
  const [selectedAllergens, setSelectedAllergens] = useState<Set<Allergen>>(new Set());

  // Tummy time state
  const [tummyTimerRunning, setTummyTimerRunning] = useState(false);
  const [tummySeconds, setTummySeconds] = useState(0);
  const tummyStartTime = useRef<number | null>(null);
  const tummyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unit = defaultUnit || 'ml';
  const presets = unit === 'oz' ? OZ_PRESETS : ML_PRESETS;
  const isSleeping = lastSleepEvent?.type === 'sleep';
  const sleepLabel = isSleeping ? 'woke up' : 'slept';
  const sleepType: EventType = isSleeping ? 'wake' : 'sleep';

  const showFormula = feedingMode === 'formula' || feedingMode === 'both';
  const showBreast = feedingMode === 'breast' || feedingMode === 'both';

  // Timer effects
  useEffect(() => {
    if (breastTimerRunning) {
      timerRef.current = setInterval(() => setBreastSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [breastTimerRunning]);

  useEffect(() => {
    if (tummyTimerRunning) {
      tummyTimerRef.current = setInterval(() => setTummySeconds((s) => s + 1), 1000);
    } else if (tummyTimerRef.current) {
      clearInterval(tummyTimerRef.current);
      tummyTimerRef.current = null;
    }
    return () => { if (tummyTimerRef.current) clearInterval(tummyTimerRef.current); };
  }, [tummyTimerRunning]);

  const resetTimers = (except?: 'breast' | 'tummy') => {
    if (except !== 'breast') {
      setBreastTimerRunning(false);
      setBreastSeconds(0);
      breastStartTime.current = null;
    }
    if (except !== 'tummy') {
      setTummyTimerRunning(false);
      setTummySeconds(0);
      tummyStartTime.current = null;
    }
  };

  const toggle = (action: ExpandedAction) => {
    if (expanded === action) {
      setExpanded(null);
      resetTimers();
    } else {
      setExpanded(action);
      setSelectedSize('medium');
      setSelectedAmount(null);
      setCustomAmount('');
      setFoodName('');
      setSelectedAllergens(new Set());
      resetTimers(action === 'breast' ? 'breast' : action === 'tummy' ? 'tummy' : undefined);
    }
  };

  const logWithTimestamp = (type: EventType, timestamp: number, extra?: EventExtra) => {
    onLog(type, timestamp, extra);
    setExpanded(null);
    setSelectedAmount(null);
    setCustomAmount('');
    setFoodName('');
    setSelectedAllergens(new Set());
    resetTimers();
  };

  const startBreastTimer = () => {
    breastStartTime.current = Date.now();
    setBreastSeconds(0);
    setBreastTimerRunning(true);
  };

  const stopAndLogBreast = () => {
    const duration = Math.max(1, Math.round(breastSeconds / 60));
    const startTs = breastStartTime.current || (Date.now() - breastSeconds * 1000);
    logWithTimestamp('breast', startTs, {
      breastSide,
      breastDuration: duration,
    });
  };

  return (
    <div className="space-y-2">
      {/* Feed buttons — based on feeding mode */}
      {showFormula && showBreast ? (
        <div className="flex gap-2">
          <button
            onClick={() => toggle('feed')}
            disabled={disabled}
            className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
              expanded === 'feed'
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            🍼 formula
          </button>
          <button
            onClick={() => toggle('breast')}
            disabled={disabled}
            className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
              expanded === 'breast'
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            🤱 breast
          </button>
        </div>
      ) : showFormula ? (
        <button
          onClick={() => toggle('feed')}
          disabled={disabled}
          className={`w-full py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'feed'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          🍼 feed
        </button>
      ) : (
        <button
          onClick={() => toggle('breast')}
          disabled={disabled}
          className={`w-full py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'breast'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          🤱 breastfeed
        </button>
      )}

      {/* Formula feed expanded panel */}
      {expanded === 'feed' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-3">
          <div className="flex gap-2">
            {presets.map((amt) => (
              <button
                key={amt}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                className={`flex-1 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  selectedAmount === amt
                    ? 'bg-accent-500 text-white'
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {amt} {unit}
              </button>
            ))}
            <div className="flex-1">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                placeholder="other"
                className="w-full min-w-0 py-2.5 px-2 rounded-lg text-base text-center bg-dark-800 text-gray-300 placeholder-gray-600 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
          </div>

          {(selectedAmount || customAmount) ? (
            <TimePicker onSelect={(ts) => {
              const amount = selectedAmount || parseFloat(customAmount);
              if (amount) logWithTimestamp('feed', ts, { quantity: amount, unit });
            }} />
          ) : (
            <p className="text-base text-gray-600 text-center">pick an amount, then choose when</p>
          )}
        </div>
      )}

      {/* Breast feed expanded panel */}
      {expanded === 'breast' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-3">
          {/* Side selector */}
          <div className="flex gap-2">
            {(['left', 'right', 'both'] as BreastSide[]).map((s) => (
              <button
                key={s}
                onClick={() => setBreastSide(s)}
                className={`flex-1 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  breastSide === s
                    ? 'bg-accent-500 text-white'
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Timer */}
          <div className="text-center space-y-2">
            <p className="text-3xl font-bold text-gray-100 font-mono tracking-wider">
              {formatTimer(breastSeconds)}
            </p>
            {!breastTimerRunning ? (
              <div className="flex gap-2">
                <button
                  onClick={startBreastTimer}
                  className="flex-1 py-2.5 rounded-lg text-base font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors"
                >
                  start timer
                </button>
                {/* Quick log without timer */}
                <button
                  onClick={() => {
                    // Log with manual duration entry
                    logWithTimestamp('breast', Date.now(), { breastSide });
                  }}
                  className="flex-1 py-2.5 rounded-lg text-base font-medium bg-dark-800 text-gray-400 hover:bg-dark-700 transition-colors"
                >
                  log without timer
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={stopAndLogBreast}
                  className="flex-1 py-3 rounded-lg text-base font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  done — log feed
                </button>
                <button
                  onClick={() => { setBreastTimerRunning(false); setBreastSeconds(0); breastStartTime.current = null; }}
                  className="px-4 py-3 rounded-lg text-base font-medium bg-dark-800 text-gray-400 hover:bg-dark-700 transition-colors"
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Second row: Pee | Poop | Sleep/Wake */}
      <div className="flex gap-2">
        <button
          onClick={() => toggle('pee')}
          disabled={disabled}
          className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'pee'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          💧 pee
        </button>
        <button
          onClick={() => toggle('poop')}
          disabled={disabled}
          className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'poop'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          💩 poop
        </button>
        <button
          onClick={() => toggle('sleep')}
          disabled={disabled}
          className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'sleep'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          😴 {sleepLabel}
        </button>
      </div>

      {/* Pee expanded — time picker */}
      {expanded === 'pee' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700">
          <TimePicker onSelect={(ts) => logWithTimestamp('pee', ts)} />
        </div>
      )}

      {/* Poop expanded — size picker + time picker */}
      {expanded === 'poop' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-3">
          <div className="flex gap-2">
            {(['small', 'medium', 'big'] as PoopSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`flex-1 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  selectedSize === s
                    ? 'bg-accent-500 text-white'
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <TimePicker onSelect={(ts) => logWithTimestamp('poop', ts, { size: selectedSize })} />
        </div>
      )}

      {/* Sleep/Wake expanded — time picker */}
      {expanded === 'sleep' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700">
          <TimePicker onSelect={(ts) => logWithTimestamp(sleepType, ts)} />
        </div>
      )}

      {/* Third row: Solids | Tummy time */}
      <div className="flex gap-2">
        <button
          onClick={() => toggle('solid')}
          disabled={disabled}
          className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'solid'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          🥑 solids
        </button>
        <button
          onClick={() => toggle('tummy')}
          disabled={disabled}
          className={`flex-1 py-4 rounded-xl text-lg font-semibold transition-all disabled:opacity-50 ${
            expanded === 'tummy'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          👶 tummy time
        </button>
      </div>

      {/* Solid food expanded panel */}
      {expanded === 'solid' && (
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
          {/* Allergen tags */}
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
              logWithTimestamp('solid', ts, {
                foodName: foodName.trim(),
                mealType,
                allergens: selectedAllergens.size > 0 ? [...selectedAllergens] : undefined,
              });
            }} />
          ) : (
            <p className="text-base text-gray-600 text-center">type what baby ate, then choose when</p>
          )}
        </div>
      )}

      {/* Tummy time expanded panel */}
      {expanded === 'tummy' && (
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
                  onClick={() => logWithTimestamp('tummytime', Date.now())}
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
                    logWithTimestamp('tummytime', startTs, { tummyDuration: duration });
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
    </div>
  );
}
