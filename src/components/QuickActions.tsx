'use client';

import { useState } from 'react';
import type { EventType, PoopSize, BabyEvent } from '@/lib/types';

interface QuickActionsProps {
  defaultUnit: 'ml' | 'oz' | null;
  lastSleepEvent: BabyEvent | null;
  onLog: (type: EventType, timestamp: number, extra?: { quantity?: number; unit?: 'ml' | 'oz'; size?: PoopSize }) => void;
  disabled?: boolean;
}

const ML_PRESETS = [60, 90, 120, 150];
const OZ_PRESETS = [2, 3, 4, 5];

type ExpandedAction = 'feed' | 'poop' | 'pee' | 'sleep' | null;

function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function timeStringToTimestamp(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  // If the chosen time is in the future (e.g. user picks 11pm but it's 2am), assume yesterday
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
        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
          className="flex-1 py-2 px-3 rounded-lg text-sm text-center bg-dark-800 text-gray-300 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        {mode === 'custom' && (
          <button
            onClick={() => onSelect(timeStringToTimestamp(customTime))}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-500 text-white hover:bg-accent-600 transition-colors"
          >
            log
          </button>
        )}
      </div>
    </div>
  );
}

export default function QuickActions({ defaultUnit, lastSleepEvent, onLog, disabled }: QuickActionsProps) {
  const [expanded, setExpanded] = useState<ExpandedAction>(null);
  const [selectedSize, setSelectedSize] = useState<PoopSize>('medium');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const unit = defaultUnit || 'ml';
  const presets = unit === 'oz' ? OZ_PRESETS : ML_PRESETS;
  const isSleeping = lastSleepEvent?.type === 'sleep';
  const sleepLabel = isSleeping ? 'woke up' : 'slept';
  const sleepType: EventType = isSleeping ? 'wake' : 'sleep';

  const toggle = (action: ExpandedAction) => {
    if (expanded === action) {
      setExpanded(null);
    } else {
      setExpanded(action);
      setSelectedSize('medium');
      setSelectedAmount(null);
      setCustomAmount('');
    }
  };

  const logWithTimestamp = (type: EventType, timestamp: number, extra?: { quantity?: number; unit?: 'ml' | 'oz'; size?: PoopSize }) => {
    onLog(type, timestamp, extra);
    setExpanded(null);
    setSelectedAmount(null);
    setCustomAmount('');
  };

  return (
    <div className="space-y-2">
      {/* Feed button — full width, top priority */}
      <button
        onClick={() => toggle('feed')}
        disabled={disabled}
        className={`w-full py-3.5 rounded-xl text-base font-semibold transition-all disabled:opacity-50 ${
          expanded === 'feed'
            ? 'bg-accent-500 text-white'
            : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
        }`}
      >
        🍼 feed
      </button>

      {/* Feed expanded panel */}
      {expanded === 'feed' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700 space-y-3">
          {/* Amount presets */}
          <div className="flex gap-2">
            {presets.map((amt) => (
              <button
                key={amt}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
                className="w-full py-2.5 px-2 rounded-lg text-sm text-center bg-dark-800 text-gray-300 placeholder-gray-600 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Time picker */}
          {(selectedAmount || customAmount) ? (
            <TimePicker onSelect={(ts) => {
              const amount = selectedAmount || parseFloat(customAmount);
              if (amount) logWithTimestamp('feed', ts, { quantity: amount, unit });
            }} />
          ) : (
            <p className="text-sm text-gray-600 text-center">pick an amount, then choose when</p>
          )}
        </div>
      )}

      {/* Second row: Pee | Poop | Sleep/Wake */}
      <div className="flex gap-2">
        <button
          onClick={() => toggle('pee')}
          disabled={disabled}
          className={`flex-1 py-3.5 rounded-xl text-base font-semibold transition-all disabled:opacity-50 ${
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
          className={`flex-1 py-3.5 rounded-xl text-base font-semibold transition-all disabled:opacity-50 ${
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
          className={`flex-1 py-3.5 rounded-xl text-base font-semibold transition-all disabled:opacity-50 ${
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
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
    </div>
  );
}
