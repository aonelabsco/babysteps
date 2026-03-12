'use client';

import { useState } from 'react';
import type { EventType, PoopSize, BabyEvent } from '@/lib/types';

interface QuickActionsProps {
  defaultUnit: 'ml' | 'oz' | null;
  lastSleepEvent: BabyEvent | null;
  onLog: (type: EventType, timestamp: number, extra?: { quantity?: number; unit?: 'ml' | 'oz'; size?: PoopSize }) => void;
  disabled?: boolean;
}

const TIME_OPTIONS = [
  { label: 'now', offset: 0 },
  { label: '15m ago', offset: 15 * 60 * 1000 },
  { label: '30m ago', offset: 30 * 60 * 1000 },
  { label: '1h ago', offset: 60 * 60 * 1000 },
  { label: '2h ago', offset: 2 * 60 * 60 * 1000 },
];

const ML_PRESETS = [60, 90, 120, 150];
const OZ_PRESETS = [2, 3, 4, 5];

type ExpandedAction = 'feed' | 'poop' | 'pee' | 'sleep' | null;

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

  const logWithTime = (type: EventType, offsetMs: number, extra?: { quantity?: number; unit?: 'ml' | 'oz'; size?: PoopSize }) => {
    onLog(type, Date.now() - offsetMs, extra);
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
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
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
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
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
                className="w-full py-2 px-2 rounded-lg text-xs text-center bg-dark-800 text-gray-300 placeholder-gray-600 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
          </div>

          {/* Time picker — tapping logs the feed */}
          <div className="flex gap-1.5">
            {TIME_OPTIONS.map((t) => {
              const amount = selectedAmount || (customAmount ? parseFloat(customAmount) : null);
              return (
                <button
                  key={t.label}
                  disabled={!amount}
                  onClick={() => amount && logWithTime('feed', t.offset, { quantity: amount, unit })}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-dark-800 text-gray-400 hover:bg-accent-600 hover:text-white disabled:opacity-30 disabled:hover:bg-dark-800 disabled:hover:text-gray-400 transition-colors"
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {!(selectedAmount || customAmount) && (
            <p className="text-xs text-gray-600 text-center">pick an amount, then tap when</p>
          )}
        </div>
      )}

      {/* Second row: Pee | Poop | Sleep/Wake */}
      <div className="flex gap-2">
        <button
          onClick={() => toggle('pee')}
          disabled={disabled}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
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
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
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
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
            expanded === 'sleep'
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-300 border border-dark-600 hover:bg-dark-700'
          }`}
        >
          😴 {sleepLabel}
        </button>
      </div>

      {/* Pee expanded — just time picker */}
      {expanded === 'pee' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700">
          <div className="flex gap-1.5">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.label}
                onClick={() => logWithTime('pee', t.offset)}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-dark-800 text-gray-400 hover:bg-accent-600 hover:text-white transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
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
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedSize === s
                    ? 'bg-accent-500 text-white'
                    : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.label}
                onClick={() => logWithTime('poop', t.offset, { size: selectedSize })}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-dark-800 text-gray-400 hover:bg-accent-600 hover:text-white transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sleep/Wake expanded — just time picker */}
      {expanded === 'sleep' && (
        <div className="bg-dark-900 rounded-xl p-3 border border-dark-700">
          <div className="flex gap-1.5">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t.label}
                onClick={() => logWithTime(sleepType, t.offset)}
                className="flex-1 py-2 rounded-lg text-xs font-medium bg-dark-800 text-gray-400 hover:bg-accent-600 hover:text-white transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
