'use client';

import type { BabyEvent } from '@/lib/types';
import { deleteEvent, updateEventTimestamp, updateEventFields } from '@/lib/firebase';
import { useState } from 'react';
import type { PoopSize } from '@/lib/types';

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
  const [editQuantity, setEditQuantity] = useState('');
  const [editSize, setEditSize] = useState<PoopSize>('medium');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const displayed = limit ? events.slice(0, limit) : events;

  if (displayed.length === 0) {
    return (
      <p className="text-center text-gray-600 py-6 text-base">no activity logged yet</p>
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

  const startEditing = (event: BabyEvent) => {
    setEditingId(event.id);
    const d = new Date(event.timestamp);
    setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    if (event.type === 'feed') setEditQuantity(String(event.quantity || ''));
    if (event.type === 'poop') setEditSize(event.size || 'medium');
  };

  const saveEdit = async (event: BabyEvent) => {
    try {
      // Update timestamp
      if (editTime) {
        const [hours, minutes] = editTime.split(':').map(Number);
        const d = new Date(event.timestamp);
        d.setHours(hours, minutes);
        await updateEventTimestamp(event.id, d.getTime());
      }
      // Update feed quantity
      if (event.type === 'feed' && editQuantity) {
        const qty = parseFloat(editQuantity);
        if (!isNaN(qty)) await updateEventFields(event.id, { quantity: qty });
      }
      // Update poop size
      if (event.type === 'poop') {
        await updateEventFields(event.id, { size: editSize });
      }
    } catch {
      alert('Failed to update');
    }
    setEditingId(null);
    setEditTime('');
    setEditQuantity('');
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
                className={`flex items-center gap-2 w-full text-left text-sm font-semibold text-gray-500 uppercase tracking-wide pt-3 pb-1 px-1 ${
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
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-dark-800 transition-colors group"
                  >
                    <span className="text-xl">{eventIcon(event.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg text-gray-200 font-medium">{eventDescription(event)}</p>
                      <p className="text-base text-gray-500">
                        {formatTime(event.timestamp)}
                        {event.createdByName && ` · ${event.createdByName}`}
                        {event.babyName && !limit && ` · ${event.babyName}`}
                      </p>
                    </div>
                    {showDelete && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); editingId === event.id ? saveEdit(event) : startEditing(event); }}
                          className="text-gray-600 hover:text-accent-400 transition-colors"
                          title="Edit"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                          disabled={deleting === event.id}
                          className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Inline editor */}
                  {editingId === event.id && (
                    <div className="flex flex-wrap items-center gap-2 px-3 pb-2 ml-10">
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-base bg-dark-800 text-gray-200 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
                      />
                      {event.type === 'feed' && (
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          placeholder="qty"
                          className="w-20 px-3 py-1.5 rounded-lg text-base bg-dark-800 text-gray-200 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        />
                      )}
                      {event.type === 'poop' && (
                        <select
                          value={editSize}
                          onChange={(e) => setEditSize(e.target.value as PoopSize)}
                          className="px-3 py-1.5 rounded-lg text-base bg-dark-800 text-gray-200 border border-dark-600 focus:outline-none focus:ring-1 focus:ring-accent-500"
                        >
                          <option value="small">small</option>
                          <option value="medium">medium</option>
                          <option value="big">big</option>
                        </select>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); saveEdit(event); }}
                        className="px-3 py-1.5 rounded-lg text-base bg-accent-500 text-white font-medium hover:bg-accent-600"
                      >
                        save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        className="px-3 py-1.5 rounded-lg text-base bg-dark-800 text-gray-400 hover:bg-dark-700"
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
