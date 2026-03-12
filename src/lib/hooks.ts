'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import type { BabyEvent, DaySummary } from './types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}

export function useDaySummary(events: BabyEvent[]): DaySummary {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTs = startOfDay.getTime();

  const todayEvents = events.filter((e) => e.timestamp >= startTs);

  const feeds = todayEvents.filter((e) => e.type === 'feed');
  const lastFeed = feeds.length > 0 ? feeds[0] : null; // already sorted desc

  const totalMilk = feeds.reduce((sum, e) => sum + (e.quantity || 0), 0);
  const milkUnit = lastFeed?.unit || feeds.find((f) => f.unit)?.unit || 'ml';

  const sleepWakeEvents = todayEvents.filter((e) => e.type === 'sleep' || e.type === 'wake');
  const lastSleepEvent = sleepWakeEvents.length > 0 ? sleepWakeEvents[0] : null;

  return {
    lastFeedTime: lastFeed?.timestamp || null,
    lastFeedQuantity: lastFeed?.quantity || null,
    lastFeedUnit: lastFeed?.unit || null,
    totalMilk,
    milkUnit,
    poopCount: todayEvents.filter((e) => e.type === 'poop').length,
    peeCount: todayEvents.filter((e) => e.type === 'pee').length,
    lastSleepEvent,
    sleepCount: todayEvents.filter((e) => e.type === 'sleep').length,
  };
}

export function useFeedAlert(lastFeedTime: number | null, thresholdHours = 3) {
  const [alert, setAlert] = useState(false);

  useEffect(() => {
    function check() {
      if (!lastFeedTime) {
        setAlert(false);
        return;
      }
      const hoursSince = (Date.now() - lastFeedTime) / (1000 * 60 * 60);
      setAlert(hoursSince >= thresholdHours);
    }
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [lastFeedTime, thresholdHours]);

  return alert;
}

export interface PeriodAverages {
  avgFeedsPerDay: number;
  avgMilkPerDay: number;
  avgPoopsPerDay: number;
  avgPeesPerDay: number;
  avgSleepsPerDay: number;
  milkUnit: string;
  daysCovered: number;
}

export function computeAverages(events: BabyEvent[], days: number): PeriodAverages {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = events.filter((e) => e.timestamp >= cutoff);

  if (filtered.length === 0) {
    return { avgFeedsPerDay: 0, avgMilkPerDay: 0, avgPoopsPerDay: 0, avgPeesPerDay: 0, avgSleepsPerDay: 0, milkUnit: 'ml', daysCovered: 0 };
  }

  // Calculate actual days covered (from earliest event to now)
  const earliest = Math.min(...filtered.map((e) => e.timestamp));
  const daysCovered = Math.max(1, Math.ceil((Date.now() - earliest) / (24 * 60 * 60 * 1000)));

  const feeds = filtered.filter((e) => e.type === 'feed');
  const totalMilk = feeds.reduce((sum, e) => sum + (e.quantity || 0), 0);
  const milkUnit = feeds.find((f) => f.unit)?.unit || 'ml';

  return {
    avgFeedsPerDay: Math.round((feeds.length / daysCovered) * 10) / 10,
    avgMilkPerDay: Math.round(totalMilk / daysCovered),
    avgPoopsPerDay: Math.round((filtered.filter((e) => e.type === 'poop').length / daysCovered) * 10) / 10,
    avgPeesPerDay: Math.round((filtered.filter((e) => e.type === 'pee').length / daysCovered) * 10) / 10,
    avgSleepsPerDay: Math.round((filtered.filter((e) => e.type === 'sleep').length / daysCovered) * 10) / 10,
    milkUnit,
    daysCovered,
  };
}
