'use client';

import type { BabyEvent } from '@/lib/types';
import { deleteEvent } from '@/lib/firebase';
import { useState } from 'react';

interface EventLogProps {
  events: BabyEvent[];
  limit?: number;
  showDelete?: boolean;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function eventDescription(event: BabyEvent): string {
  switch (event.type) {
    case 'feed':
      return `Fed ${event.quantity || '?'} ${event.unit || 'ml'}`;
    case 'poop':
      return `Poop (${event.size || 'medium'})`;
    case 'pee':
      return 'Diaper change (pee)';
  }
}

function eventIcon(type: string): string {
  switch (type) {
    case 'feed': return '🍼';
    case 'poop': return '💩';
    case 'pee': return '💧';
    default: return '📝';
  }
}

export default function EventLog({ events, limit, showDelete = false }: EventLogProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const displayed = limit ? events.slice(0, limit) : events;

  if (displayed.length === 0) {
    return (
      <p className="text-center text-gray-400 py-6 text-sm">No activity logged yet</p>
    );
  }

  // Group by date for full history
  let lastDate = '';

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    setDeleting(id);
    try {
      await deleteEvent(id);
    } catch {
      alert('Failed to delete');
    }
    setDeleting(null);
  };

  return (
    <div className="space-y-1">
      {displayed.map((event) => {
        const dateStr = formatDate(event.timestamp);
        const showDateHeader = !limit && dateStr !== lastDate;
        lastDate = dateStr;

        return (
          <div key={event.id}>
            {showDateHeader && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-3 pb-1 px-1">
                {dateStr}
              </p>
            )}
            <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-pink-50 transition-colors group">
              <span className="text-lg">{eventIcon(event.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium">{eventDescription(event)}</p>
                <p className="text-xs text-gray-400">
                  {formatTime(event.timestamp)}
                  {event.createdByName && ` · ${event.createdByName}`}
                  {event.babyName && !limit && ` · ${event.babyName}`}
                </p>
              </div>
              {showDelete && (
                <button
                  onClick={() => handleDelete(event.id)}
                  disabled={deleting === event.id}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-pink-500 text-xs transition-opacity disabled:opacity-50"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
