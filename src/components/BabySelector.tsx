'use client';

import type { Baby } from '@/lib/types';

interface BabySelectorProps {
  babies: Baby[];
  selectedId: string | null;
  onSelect: (babyId: string) => void;
}

export default function BabySelector({ babies, selectedId, onSelect }: BabySelectorProps) {
  if (babies.length === 0) return null;
  if (babies.length === 1) {
    return (
      <h2 className="text-lg font-semibold text-gray-200">{babies[0].name}</h2>
    );
  }

  return (
    <div className="flex gap-2">
      {babies.map((baby) => (
        <button
          key={baby.id}
          onClick={() => onSelect(baby.id)}
          className={`px-4 py-2 rounded-full text-lg font-medium transition-all ${
            selectedId === baby.id
              ? 'bg-accent-500 text-white'
              : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
          }`}
        >
          {baby.name}
        </button>
      ))}
    </div>
  );
}
