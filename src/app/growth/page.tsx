'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import Header from '@/components/Header';
import { subscribeToGrowthRecords, addGrowthRecord, deleteGrowthRecord } from '@/lib/firebase';
import type { GrowthRecord } from '@/lib/types';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function calculateAge(birthday: number): string {
  const now = new Date();
  // Use UTC to extract the birth date consistently (birthday is stored as UTC noon)
  const birthYear = new Date(birthday).getUTCFullYear();
  const birthMonth = new Date(birthday).getUTCMonth();
  const birthDay = new Date(birthday).getUTCDate();
  let months = (now.getFullYear() - birthYear) * 12 + (now.getMonth() - birthMonth);
  if (now.getDate() < birthDay) months--;
  if (months < 1) {
    const days = Math.floor((now.getTime() - birthday) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''} old`;
  }
  if (months < 24) {
    return `${months} month${months !== 1 ? 's' : ''} old`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0
    ? `${years} yr${years !== 1 ? 's' : ''} ${remainingMonths} mo`
    : `${years} year${years !== 1 ? 's' : ''} old`;
}

export default function GrowthPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formWeight, setFormWeight] = useState('');
  const [formLength, setFormLength] = useState('');
  const [formHead, setFormHead] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/');
    if (!loading && !familyLoading && !family) router.replace('/');
  }, [user, loading, family, familyLoading, router]);

  useEffect(() => {
    if (family?.babies?.length && !selectedBabyId) {
      setSelectedBabyId(family.babies[0].id);
    }
  }, [family?.babies, selectedBabyId]);

  useEffect(() => {
    if (!family?.id || !selectedBabyId) return;
    const unsub = subscribeToGrowthRecords(family.id, selectedBabyId, setRecords, (err) => {
      console.error('Growth subscription error:', err.message);
    });
    return unsub;
  }, [family?.id, selectedBabyId]);

  if (loading || familyLoading || !family) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-gray-500">loading...</div>
      </div>
    );
  }

  const selectedBaby = family.babies?.find((b) => b.id === selectedBabyId);
  const wUnit = family.weightUnit || 'kg';
  const lUnit = family.lengthUnit || 'cm';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family || !user || !selectedBabyId) return;
    if (!formWeight && !formLength && !formHead) return;

    setSaving(true);
    try {
      const record: Omit<GrowthRecord, 'id'> = {
        familyId: family.id,
        babyId: selectedBabyId,
        date: new Date(formDate + 'T12:00:00Z').getTime(),
        createdBy: user.uid,
        createdAt: Date.now(),
      };
      if (formWeight) record.weight = parseFloat(formWeight);
      if (formLength) record.length = parseFloat(formLength);
      if (formHead) record.headCircumference = parseFloat(formHead);
      const id = await addGrowthRecord(record);
      // Optimistic update so the record shows immediately
      setRecords((prev) => [{ id, ...record } as GrowthRecord, ...prev].sort((a, b) => b.date - a.date));
      setShowForm(false);
      setFormWeight('');
      setFormLength('');
      setFormHead('');
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message || err));
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    try {
      await deleteGrowthRecord(id);
    } catch {
      alert('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">growth</h1>
          <BabySelector
            babies={family.babies || []}
            selectedId={selectedBabyId}
            onSelect={setSelectedBabyId}
          />
        </div>

        {/* Baby info card */}
        {selectedBaby && (
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-100">{selectedBaby.name}</p>
                {selectedBaby.birthday && (
                  <p className="text-base text-gray-400">
                    {calculateAge(selectedBaby.birthday)} · born {formatDate(selectedBaby.birthday)}
                  </p>
                )}
                {selectedBaby.sex && (
                  <p className="text-base text-gray-500 mt-0.5">
                    {selectedBaby.sex === 'male' ? 'boy' : 'girl'}
                  </p>
                )}
              </div>
              {!selectedBaby.birthday && (
                <button
                  onClick={() => router.push('/settings')}
                  className="text-base text-accent-400 hover:text-accent-300"
                >
                  add birthday
                </button>
              )}
            </div>
          </div>
        )}

        {/* Latest measurements */}
        {records.length > 0 && (
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700">
            <h2 className="text-base font-semibold text-gray-500 mb-3">latest measurements</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <p className="text-xl text-gray-100 font-semibold">
                  {records[0].weight ? `${records[0].weight} ${wUnit}` : '--'}
                </p>
                <p className="text-base text-gray-500 mt-0.5">weight</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <p className="text-xl text-gray-100 font-semibold">
                  {records[0].length ? `${records[0].length} ${lUnit}` : '--'}
                </p>
                <p className="text-base text-gray-500 mt-0.5">length</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <p className="text-xl text-gray-100 font-semibold">
                  {records[0].headCircumference ? `${records[0].headCircumference} ${lUnit}` : '--'}
                </p>
                <p className="text-base text-gray-500 mt-0.5">head</p>
              </div>
            </div>
          </div>
        )}

        {/* Add record button / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-xl text-lg font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-colors"
          >
            + add measurement
          </button>
        ) : (
          <form onSubmit={handleAdd} className="bg-dark-900 rounded-2xl p-4 border border-dark-700 space-y-3">
            <h2 className="text-base font-semibold text-gray-500">new measurement</h2>
            <div>
              <label className="text-base text-gray-400 mb-1 block">date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="max-w-[200px] px-4 py-2.5 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-base text-gray-400 mb-1 block">weight ({wUnit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  placeholder={wUnit === 'lbs' ? '7.7' : '3.5'}
                  className="w-full px-3 py-2.5 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 text-base placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-400 mb-1 block">length ({lUnit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={formLength}
                  onChange={(e) => setFormLength(e.target.value)}
                  placeholder={lUnit === 'in' ? '20' : '50'}
                  className="w-full px-3 py-2.5 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 text-base placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="text-base text-gray-400 mb-1 block">head ({lUnit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={formHead}
                  onChange={(e) => setFormHead(e.target.value)}
                  placeholder="35"
                  className="w-full px-3 py-2.5 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 text-base placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || (!formWeight && !formLength && !formHead)}
                className="flex-1 py-2.5 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 text-base"
              >
                {saving ? 'saving...' : 'save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl bg-dark-800 text-gray-400 hover:bg-dark-700 text-base"
              >
                cancel
              </button>
            </div>
          </form>
        )}

        {/* History */}
        {records.length > 0 && (
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700">
            <h2 className="text-base font-semibold text-gray-500 mb-3">history</h2>
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-dark-800 group">
                  <div>
                    <p className="text-base text-gray-300 font-medium">{formatDate(r.date)}</p>
                    <p className="text-base text-gray-500">
                      {[
                        r.weight && `${r.weight} ${wUnit}`,
                        r.length && `${r.length} ${lUnit}`,
                        r.headCircumference && `head ${r.headCircumference} ${lUnit}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-center text-gray-600">
          track weight, length & head circumference for doctor visits.
        </p>
      </div>

      <Header />
    </div>
  );
}
