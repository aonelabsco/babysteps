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

  // Breastfeeding summary
  const breastfeeds = todayEvents.filter((e) => e.type === 'breast');
  const lastBreastfeed = breastfeeds.length > 0 ? breastfeeds[0] : null;
  const totalBreastMinutes = breastfeeds.reduce((sum, e) => sum + (e.breastDuration || 0), 0);

  // For sleep status, look at ALL events (including pre-midnight) to find the last sleep/wake
  // Events array may contain a pre-midnight sleep event for cross-midnight tracking
  const allSleepWakeEvents = events.filter((e) => e.type === 'sleep' || e.type === 'wake');
  const lastSleepEvent = allSleepWakeEvents.length > 0 ? allSleepWakeEvents[0] : null;

  // Calculate total nap time and last nap duration
  // Walk through sleep/wake pairs chronologically
  const sleepWakeChronological = [...allSleepWakeEvents].reverse(); // oldest first
  let totalNapMinutes = 0;
  let lastNapMinutes: number | null = null;

  for (let i = 0; i < sleepWakeChronological.length; i++) {
    const ev = sleepWakeChronological[i];
    if (ev.type === 'sleep') {
      const wakeEv = sleepWakeChronological[i + 1];
      const wakeTime = wakeEv?.type === 'wake' ? wakeEv.timestamp : null;
      if (wakeTime) {
        // Only count nap time that falls within today
        const napStart = Math.max(ev.timestamp, startTs);
        const napMinutes = Math.floor((wakeTime - napStart) / 60000);
        if (napMinutes > 0) {
          totalNapMinutes += napMinutes;
          lastNapMinutes = napMinutes;
        }
      } else if (ev.type === 'sleep' && !wakeEv) {
        // Currently sleeping — count time so far today
        const napStart = Math.max(ev.timestamp, startTs);
        const napMinutes = Math.floor((Date.now() - napStart) / 60000);
        if (napMinutes > 0) {
          totalNapMinutes += napMinutes;
        }
      }
    }
  }

  // Last feed time considers both formula and breast
  const allFeeds = todayEvents.filter((e) => e.type === 'feed' || e.type === 'breast');
  const lastAnyFeed = allFeeds.length > 0 ? allFeeds[0] : null;

  return {
    lastFeedTime: lastAnyFeed?.timestamp || null,
    lastFeedQuantity: lastFeed?.quantity || null,
    lastFeedUnit: lastFeed?.unit || null,
    totalMilk,
    milkUnit,
    breastfeedCount: breastfeeds.length,
    lastBreastfeedTime: lastBreastfeed?.timestamp || null,
    totalBreastMinutes,
    poopCount: todayEvents.filter((e) => e.type === 'poop').length,
    peeCount: todayEvents.filter((e) => e.type === 'pee').length,
    lastSleepEvent,
    sleepCount: todayEvents.filter((e) => e.type === 'sleep').length,
    totalNapMinutes,
    lastNapMinutes,
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

export function computeYesterday(events: BabyEvent[]): PeriodAverages {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = startOfToday.getTime();
  const yesterdayTs = todayTs - 24 * 60 * 60 * 1000;

  const filtered = events.filter((e) => e.timestamp >= yesterdayTs && e.timestamp < todayTs);

  if (filtered.length === 0) {
    return { avgFeedsPerDay: 0, avgMilkPerDay: 0, avgPoopsPerDay: 0, avgPeesPerDay: 0, avgSleepsPerDay: 0, milkUnit: 'ml', daysCovered: 0 };
  }

  const feeds = filtered.filter((e) => e.type === 'feed');
  const totalMilk = feeds.reduce((sum, e) => sum + (e.quantity || 0), 0);
  const milkUnit = feeds.find((f) => f.unit)?.unit || 'ml';

  return {
    avgFeedsPerDay: feeds.length,
    avgMilkPerDay: totalMilk,
    avgPoopsPerDay: filtered.filter((e) => e.type === 'poop').length,
    avgPeesPerDay: filtered.filter((e) => e.type === 'pee').length,
    avgSleepsPerDay: filtered.filter((e) => e.type === 'sleep').length,
    milkUnit,
    daysCovered: 1,
  };
}

export function computeAverages(events: BabyEvent[], days: number): PeriodAverages {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = startOfToday.getTime();
  const cutoff = todayTs - days * 24 * 60 * 60 * 1000;

  // Exclude current day to avoid skewing the average with incomplete data
  const filtered = events.filter((e) => e.timestamp >= cutoff && e.timestamp < todayTs);

  if (filtered.length === 0) {
    return { avgFeedsPerDay: 0, avgMilkPerDay: 0, avgPoopsPerDay: 0, avgPeesPerDay: 0, avgSleepsPerDay: 0, milkUnit: 'ml', daysCovered: 0 };
  }

  // Calculate actual days covered (from earliest event to start of today)
  const earliest = Math.min(...filtered.map((e) => e.timestamp));
  const daysCovered = Math.max(1, Math.ceil((todayTs - earliest) / (24 * 60 * 60 * 1000)));

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
