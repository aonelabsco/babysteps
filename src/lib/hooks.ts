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

  return {
    lastFeedTime: lastFeed?.timestamp || null,
    lastFeedQuantity: lastFeed?.quantity || null,
    lastFeedUnit: lastFeed?.unit || null,
    totalMilk,
    milkUnit,
    poopCount: todayEvents.filter((e) => e.type === 'poop').length,
    peeCount: todayEvents.filter((e) => e.type === 'pee').length,
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
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  }, [lastFeedTime, thresholdHours]);

  return alert;
}
