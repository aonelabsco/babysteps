'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import Header from '@/components/Header';
import { addBaby, removeBaby, updateBaby, signOut } from '@/lib/firebase';
import type { Baby, BabySex } from '@/lib/types';

function formatBirthday(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function BabyProfileEditor({ baby, familyId }: { baby: Baby; familyId: string }) {
  const [editing, setEditing] = useState(false);
  const [birthday, setBirthday] = useState(
    baby.birthday ? new Date(baby.birthday).toISOString().split('T')[0] : ''
  );
  const [sex, setSex] = useState<BabySex | ''>(baby.sex || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: Baby = {
        ...baby,
        birthday: birthday ? new Date(birthday + 'T12:00:00Z').getTime() : undefined,
        sex: sex || undefined,
      };
      await updateBaby(familyId, updated, baby);
      setEditing(false);
    } catch {
      alert('Failed to update');
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div className="py-3 px-4 rounded-xl bg-dark-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-lg text-gray-200 font-medium">{baby.name}</span>
          <button
            onClick={() => setEditing(true)}
            className="text-base text-accent-400 hover:text-accent-300"
          >
            edit
          </button>
        </div>
        {baby.birthday && (
          <p className="text-base text-gray-400">born {formatBirthday(baby.birthday)}</p>
        )}
        {baby.sex && (
          <p className="text-base text-gray-500">{baby.sex === 'male' ? 'boy' : 'girl'}</p>
        )}
        {!baby.birthday && !baby.sex && (
          <p className="text-base text-gray-600">tap edit to add birthday & sex</p>
        )}
      </div>
    );
  }

  return (
    <div className="py-3 px-4 rounded-xl bg-dark-800 space-y-3">
      <p className="text-lg text-gray-200 font-medium">{baby.name}</p>
      <div>
        <label className="text-base text-gray-400 mb-1 block">birthday</label>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className="max-w-[200px] px-4 py-2.5 rounded-xl border border-dark-600 bg-dark-900 text-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
      </div>
      <div>
        <label className="text-base text-gray-400 mb-1 block">sex</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSex('male')}
            className={`flex-1 py-2.5 rounded-xl text-base font-medium transition-colors ${
              sex === 'male' ? 'bg-accent-500 text-white' : 'bg-dark-900 text-gray-400 hover:bg-dark-700'
            }`}
          >
            boy
          </button>
          <button
            onClick={() => setSex('female')}
            className={`flex-1 py-2.5 rounded-xl text-base font-medium transition-colors ${
              sex === 'female' ? 'bg-accent-500 text-white' : 'bg-dark-900 text-gray-400 hover:bg-dark-700'
            }`}
          >
            girl
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 text-base"
        >
          {saving ? 'saving...' : 'save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-5 py-2.5 rounded-xl bg-dark-900 text-gray-400 hover:bg-dark-700 text-base"
        >
          cancel
        </button>
      </div>
    </div>
  );
}

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
        <div className="text-gray-500">loading...</div>
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
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-100">settings</h1>

        {/* Family info */}
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700 space-y-3">
          <h2 className="text-base font-semibold text-gray-500">family</h2>
          <div className="flex items-center justify-between">
            <span className="text-lg text-gray-200 font-medium">{family.name}</span>
            <div className="text-right">
              <p className="text-base text-gray-500">share this code with partner</p>
              <p className="text-2xl font-bold text-accent-400 tracking-widest">{family.code}</p>
            </div>
          </div>
          <div className="border-t border-dark-700 pt-3">
            <p className="text-base text-gray-500 mb-1">members</p>
            {family.members.map((m) => (
              <p key={m.uid} className="text-lg text-gray-300">
                {m.name} {m.uid === user?.uid && '(you)'}
              </p>
            ))}
          </div>
        </div>

        {/* Babies */}
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700 space-y-3">
          <h2 className="text-base font-semibold text-gray-500">babies</h2>

          {family.babies?.length > 0 ? (
            <div className="space-y-2">
              {family.babies.map((baby) => (
                <div key={baby.id} className="space-y-1">
                  <BabyProfileEditor baby={baby} familyId={family.id} />
                  <button
                    onClick={() => handleRemoveBaby(baby)}
                    className="text-base text-gray-600 hover:text-red-400 px-4 py-1"
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-base">no babies added yet</p>
          )}

          <form onSubmit={handleAddBaby} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newBabyName}
              onChange={(e) => setNewBabyName(e.target.value)}
              placeholder="baby's name"
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 placeholder-gray-600 text-base focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="submit"
              disabled={adding || !newBabyName.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 text-base"
            >
              add
            </button>
          </form>
        </div>

        {/* Default unit */}
        {family.defaultUnit && (
          <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700">
            <h2 className="text-base font-semibold text-gray-500 mb-1">default unit</h2>
            <p className="text-lg text-gray-200">{family.defaultUnit === 'ml' ? 'milliliters (ml)' : 'ounces (oz)'}</p>
            <p className="text-base text-gray-600 mt-1">set by first feed entry. log a feed with a different unit to change.</p>
          </div>
        )}

        {/* Account */}
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-700 space-y-3">
          <h2 className="text-base font-semibold text-gray-500">account</h2>
          <p className="text-lg text-gray-300">{user?.email}</p>
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-xl border border-dark-600 text-gray-400 font-medium hover:bg-dark-800 transition-colors text-base"
          >
            sign out
          </button>
        </div>
      </div>

      <Header />
    </div>
  );
}
