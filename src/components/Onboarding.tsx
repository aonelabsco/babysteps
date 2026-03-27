'use client';

import { useState } from 'react';
import { addBabyWithDetails, updateFamilyUnits } from '@/lib/firebase';
import type { BabySex, FeedingMode } from '@/lib/types';

interface OnboardingProps {
  familyId: string;
  onComplete: () => void;
}

type Step = 'baby' | 'preferences';

export default function Onboarding({ familyId, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('baby');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [sex, setSex] = useState<BabySex | ''>('');
  const [feedingMode, setFeedingMode] = useState<FeedingMode>('formula');
  const [unit, setUnit] = useState<'ml' | 'oz'>('ml');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddBaby = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await addBabyWithDetails(familyId, {
        name: name.trim(),
        birthday: birthday ? new Date(birthday + 'T12:00:00Z').getTime() : undefined,
        sex: sex || undefined,
      });
      setStep('preferences');
    } catch {
      setError('failed to add baby. try again.');
    }
    setSaving(false);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await updateFamilyUnits(familyId, {
        feedingMode,
        defaultUnit: unit,
      });
    } catch {
      // Non-critical, continue anyway
    }
    setSaving(false);
    onComplete();
  };

  if (step === 'baby') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-100">let's get started</h1>
            <p className="text-gray-500 text-base">tell us about your little one</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-base text-gray-400 mb-1.5 block">baby's name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., emma"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 placeholder-gray-600 text-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="text-base text-gray-400 mb-1.5 block">birthday (optional)</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>

            <div>
              <label className="text-base text-gray-400 mb-1.5 block">sex (optional)</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSex('male')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-colors ${
                    sex === 'male' ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-400 border border-dark-600 hover:bg-dark-700'
                  }`}
                >
                  boy
                </button>
                <button
                  onClick={() => setSex('female')}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-colors ${
                    sex === 'female' ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-400 border border-dark-600 hover:bg-dark-700'
                  }`}
                >
                  girl
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleAddBaby}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl bg-accent-500 text-white font-medium text-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'saving...' : 'next'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-100">almost there!</h1>
          <p className="text-gray-500 text-base">choose your preferences</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-base text-gray-400 mb-2 block">how do you feed?</label>
            <div className="flex gap-2">
              {([['formula', '🍼 formula'], ['breast', '🤱 breast'], ['both', 'both']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFeedingMode(val)}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-colors ${
                    feedingMode === val ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-400 border border-dark-600 hover:bg-dark-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-base text-gray-400 mb-2 block">feed volume unit</label>
            <div className="flex gap-2">
              {([['ml', 'ml'], ['oz', 'oz']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setUnit(val)}
                  className={`flex-1 py-3 rounded-xl text-base font-medium transition-colors ${
                    unit === val ? 'bg-accent-500 text-white' : 'bg-dark-800 text-gray-400 border border-dark-600 hover:bg-dark-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-accent-500 text-white font-medium text-lg hover:bg-accent-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'saving...' : 'start tracking'}
        </button>

        <button
          onClick={onComplete}
          className="w-full text-center text-gray-600 text-sm hover:text-gray-400 transition-colors"
        >
          skip for now
        </button>
      </div>
    </div>
  );
}
