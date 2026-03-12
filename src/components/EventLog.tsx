'use client';

import type { BabyEvent } from '@/lib/types';
import { deleteEvent, updateEventTimestamp } from '@/lib/firebase';
import { useState } from 'react';

interface EventLogProps {
  events: BabyEvent[];
  limit?: number;
  showDelete?: boolean;
  collapsible?: boolean;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return 'today';
  if (isYesterday) return 'yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function eventDescription(event: BabyEvent): string {
  switch (event.type) {
    case 'feed':
      return `fed ${event.quantity || '?'} ${event.unit || 'ml'}`;
    case 'poop':
      return `poop (${event.size || 'medium'})`;
    case 'pee':
      return 'diaper change (pee)';
    case 'sleep':
      return 'fell asleep';
    case 'wake':
      return 'woke up';
  }
}

function eventIcon(type: string): string {
  switch (type) {
    case 'feed': return '🍼';
    case 'poop': return '💩';
    case 'pee': return '💧';
    case 'sleep': return '😴';
    case 'wake': return '☀️';
    default: return '📝';
  }
}

export default function EventLog({ events, limit, showDelete = false, collapsible = false }: EventLogProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const displayed = limit ? events.slice(0, limit) : events;

  if (displayed.length === 0) {
    return (
      <p className="text-center text-gray-600 py-6 text-sm">no activity logged yet</p>
    );
  }

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

  const handleEditTime = async (eventId: string, currentTimestamp: number) => {
    if (editingId === eventId) {
      // Save
      if (editTime) {
        const [hours, minutes] = editTime.split(':').map(Number);
        const d = new Date(currentTimestamp);
        d.setHours(hours, minutes);
        try {
          await updateEventTimestamp(eventId, d.getTime());
        } catch {
          alert('Failed to update time');
        }
      }
      setEditingId(null);
      setEditTime('');
    } else {
      // Start editing
      setEditingId(eventId);
      const d = new Date(currentTimestamp);
      setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  };

  const toggleDate = (dateStr: string) => {
    const next = new Set(collapsedDates);
    if (next.has(dateStr)) {
      next.delete(dateStr);
    } else {
      next.add(dateStr);
    }
    setCollapsedDates(next);
  };

  // Group events by date
  const grouped: { date: string; events: BabyEvent[] }[] = [];
  let currentDate = '';
  for (const event of displayed) {
    const dateStr = formatDate(event.timestamp);
    if (dateStr !== currentDate) {
      currentDate = dateStr;
      grouped.push({ date: dateStr, events: [event] });
    } else {
      grouped[grouped.length - 1].events.push(event);
    }
  }

  return (
    <div className="space-y-1">
      {grouped.map((group) => {
        const isCollapsed = collapsible && collapsedDates.has(group.date);
        const showHeader = !limit;

        return (
          <div key={group.date}>
            {showHeader && (
              <button
                onClick={() => collapsible && toggleDate(group.date)}
                className={`flex items-center gap-2 w-full text-left text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3 pb-1 px-1 ${
                  collapsible ? 'hover:text-gray-300' : ''
                }`}
              >
                {collapsible && (
                  <span className="text-gray-600 text-[10px]">{isCollapsed ? '▶' : '▼'}</span>
                )}
                {group.date}
                <span className="text-gray-600 font-normal normal-case">({group.events.length})</span>
              </button>
            )}
            {!isCollapsed &&
              group.events.map((event) => (
                <div key={event.id}>
                  <div
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-dark-800 transition-colors group cursor-pointer"
                    onClick={() => showDelete && handleEditTime(event.id, event.timestamp)}
                  >
                    <span className="text-lg">{eventIcon(event.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 font-medium">{eventDescription(event)}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime(event.timestamp)}
                        {event.createdByName && ` · ${event.createdByName}`}
                        {event.babyName && !limit && ` · ${event.babyName}`}
                      </p>
                    </div>
                    {showDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                        disabled={deleting === event.id}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-opacity disabled:opacity-50"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {/* Inline time editor */}
                  {editingId === event.id && (
                    <div className="flex items-center gap-2 px-3 pb-2 ml-10">
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-dark-800 text-gray-200 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditTime(event.id, event.timestamp); }}
                        className="px-3 py-1.5 rounded-lg text-xs bg-accent-500 text-white font-medium hover:bg-accent-600"
                      >
                        save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        className="px-3 py-1.5 rounded-lg text-xs bg-dark-800 text-gray-400 hover:bg-dark-700"
                      >
                        cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
