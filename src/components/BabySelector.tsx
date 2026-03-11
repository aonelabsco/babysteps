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
      <h2 className="text-lg font-semibold text-gray-800">{babies[0].name}</h2>
    );
  }

  return (
    <div className="flex gap-2">
      {babies.map((baby) => (
        <button
          key={baby.id}
          onClick={() => onSelect(baby.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedId === baby.id
              ? 'bg-pink-500 text-white'
              : 'bg-pink-100 text-gray-700 hover:bg-pink-200'
          }`}
        >
          {baby.name}
        </button>
      ))}
    </div>
  );
}
