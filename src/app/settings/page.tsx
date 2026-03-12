'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import Header from '@/components/Header';
import { addBaby, removeBaby, signOut } from '@/lib/firebase';
import type { Baby } from '@/lib/types';

export default function SettingsPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [newBabyName, setNewBabyName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
    if (!loading && !familyLoading && !family) router.replace('/');
  }, [user, loading, family, familyLoading, router]);

  if (loading || familyLoading || !family) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const handleAddBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBabyName.trim()) return;
    setAdding(true);
    try {
      await addBaby(family.id, newBabyName.trim());
      setNewBabyName('');
    } catch {
      alert('Failed to add baby');
    }
    setAdding(false);
  };

  const handleRemoveBaby = async (baby: Baby) => {
    if (!confirm(`Remove ${baby.name}? This won't delete their logged data.`)) return;
    try {
      await removeBaby(family.id, baby);
    } catch {
      alert('Failed to remove baby');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-100">Settings</h1>

        {/* Family info */}
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Family</h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-200 font-medium">{family.name}</span>
            <div className="text-right">
              <p className="text-xs text-gray-500">Share this code with partner</p>
              <p className="text-2xl font-bold text-accent-400 tracking-widest">{family.code}</p>
            </div>
          </div>
          <div className="border-t border-dark-700 pt-3">
            <p className="text-xs text-gray-500 mb-1">Members</p>
            {family.members.map((m) => (
              <p key={m.uid} className="text-sm text-gray-300">
                {m.name} {m.uid === user?.uid && '(you)'}
              </p>
            ))}
          </div>
        </div>

        {/* Babies */}
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Babies</h2>

          {family.babies?.length > 0 ? (
            <div className="space-y-2">
              {family.babies.map((baby) => (
                <div
                  key={baby.id}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-dark-800"
                >
                  <span className="text-gray-200 font-medium">{baby.name}</span>
                  <button
                    onClick={() => handleRemoveBaby(baby)}
                    className="text-gray-600 hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No babies added yet</p>
          )}

          <form onSubmit={handleAddBaby} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newBabyName}
              onChange={(e) => setNewBabyName(e.target.value)}
              placeholder="Baby's name"
              className="flex-1 px-4 py-2.5 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="submit"
              disabled={adding || !newBabyName.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>

        {/* Default unit */}
        {family.defaultUnit && (
          <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700">
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Default Unit</h2>
            <p className="text-gray-200">{family.defaultUnit === 'ml' ? 'Milliliters (ml)' : 'Ounces (oz)'}</p>
            <p className="text-xs text-gray-600 mt-1">Set by first feed entry. Log a feed with a different unit to change.</p>
          </div>
        )}

        {/* Account */}
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Account</h2>
          <p className="text-sm text-gray-300">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-xl border border-dark-600 text-gray-400 font-medium hover:bg-dark-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <Header />
    </div>
  );
}
