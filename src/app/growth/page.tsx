'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import BabySelector from '@/components/BabySelector';
import Header from '@/components/Header';
import GrowthChart from '@/components/GrowthChart';
import { subscribeToGrowthRecords, addGrowthRecord, deleteGrowthRecord } from '@/lib/firebase';
import type { GrowthRecord } from '@/lib/types';
import { WHO } from '@/lib/who-data';
import type { BabySex } from '@/lib/types';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function calculateAge(birthday: number): string {
  const now = new Date();
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

function getPercentile(value: number, birthday: number, recordDate: number, sex: BabySex, metric: 'weight' | 'length' | 'head'): string {
  const ageMonths = Math.round((recordDate - birthday) / (1000 * 60 * 60 * 24 * 30.44));
  const month = Math.max(0, Math.min(24, ageMonths));
  const sexKey = sex === 'male' ? 'boys' : 'girls';
  const row = WHO[metric][sexKey][month];
  if (!row) return '--';

  // P3=0, P15=1, P50=2, P85=3, P97=4
  if (value <= row[0]) return '<3rd';
  if (value <= row[1]) return '3rd-15th';
  if (value <= row[2]) return '15th-50th';
  if (value <= row[3]) return '50th-85th';
  if (value <= row[4]) return '85th-97th';
  return '>97th';
}

type ChartMetric = 'weight' | 'length' | 'head';

export default function GrowthPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('weight');
  const [doctorMode, setDoctorMode] = useState(false);

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
      if (formWeight) {
        const w = parseFloat(formWeight);
        record.weight = wUnit === 'lbs' ? Math.round(w / 2.20462 * 100) / 100 : w;
      }
      if (formLength) {
        const l = parseFloat(formLength);
        record.length = lUnit === 'in' ? Math.round(l * 2.54 * 10) / 10 : l;
      }
      if (formHead) {
        const h = parseFloat(formHead);
        record.headCircumference = lUnit === 'in' ? Math.round(h * 2.54 * 10) / 10 : h;
      }
      const id = await addGrowthRecord(record);
      setRecords((prev) => [{ id, ...record } as GrowthRecord, ...prev].sort((a, b) => b.date - a.date));
      setShowForm(false);
      setFormWeight('');
      setFormLength('');
      setFormHead('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Failed to save: ' + msg);
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

  const displayWeight = (kg: number) => wUnit === 'lbs' ? `${Math.round(kg * 2.20462 * 10) / 10} lbs` : `${kg} kg`;
  const displayLength = (cm: number) => lUnit === 'in' ? `${Math.round(cm / 2.54 * 10) / 10} in` : `${cm} cm`;

  // Doctor mode view
  if (doctorMode && selectedBaby) {
    return (
      <div className="min-h-screen bg-white pb-24">
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setDoctorMode(false)}
              className="text-blue-600 text-base font-medium"
            >
              ← back
            </button>
            <p className="text-xs text-gray-400">baby steps</p>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{selectedBaby.name}</h1>
            {selectedBaby.birthday && (
              <p className="text-base text-gray-600">
                {calculateAge(selectedBaby.birthday)} · born {formatDate(selectedBaby.birthday)}
                {selectedBaby.sex && ` · ${selectedBaby.sex === 'male' ? 'boy' : 'girl'}`}
              </p>
            )}
          </div>

          {/* Growth charts in doctor mode */}
          {selectedBaby.birthday && selectedBaby.sex && (
            <div className="space-y-4">
              {(['weight', 'length', 'head'] as ChartMetric[]).map((m) => (
                <div key={m} className="border border-gray-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {m === 'weight' ? `weight (${wUnit})` : m === 'length' ? `length (${lUnit})` : `head circumference (${lUnit})`}
                  </p>
                  <GrowthChart records={records} birthday={selectedBaby.birthday!} sex={selectedBaby.sex!} metric={m} weightUnit={wUnit} lengthUnit={lUnit} />
                </div>
              ))}
            </div>
          )}

          {/* Measurements table */}
          {records.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-2">measurements</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-medium">date</th>
                    <th className="text-right py-2 text-gray-500 font-medium">weight</th>
                    <th className="text-right py-2 text-gray-500 font-medium">length</th>
                    <th className="text-right py-2 text-gray-500 font-medium">head</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 text-gray-700">{formatDate(r.date)}</td>
                      <td className="py-2 text-right text-gray-900">
                        {r.weight ? displayWeight(r.weight) : '--'}
                        {r.weight && selectedBaby.birthday && selectedBaby.sex && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({getPercentile(r.weight, selectedBaby.birthday, r.date, selectedBaby.sex, 'weight')})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {r.length ? displayLength(r.length) : '--'}
                        {r.length && selectedBaby.birthday && selectedBaby.sex && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({getPercentile(r.length, selectedBaby.birthday, r.date, selectedBaby.sex, 'length')})
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {r.headCircumference ? displayLength(r.headCircumference) : '--'}
                        {r.headCircumference && selectedBaby.birthday && selectedBaby.sex && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({getPercentile(r.headCircumference, selectedBaby.birthday, r.date, selectedBaby.sex, 'head')})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-center text-gray-400 pt-2">
            WHO Child Growth Standards · percentiles for 0–24 months
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-100">growth</h1>
          <div className="flex items-center gap-2">
            <BabySelector
              babies={family.babies || []}
              selectedId={selectedBabyId}
              onSelect={setSelectedBabyId}
            />
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
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
              <div className="flex flex-col items-end gap-2">
                {!selectedBaby.birthday && (
                  <button
                    onClick={() => router.push('/settings')}
                    className="text-base text-accent-400 hover:text-accent-300"
                  >
                    add birthday
                  </button>
                )}
                {records.length > 0 && selectedBaby.birthday && selectedBaby.sex && (
                  <button
                    onClick={() => setDoctorMode(true)}
                    className="text-sm text-accent-400 hover:text-accent-300 font-medium"
                  >
                    doctor view
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Growth chart */}
        {selectedBaby?.birthday && selectedBaby?.sex && records.length > 0 && (
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-500">growth chart</h2>
              <div className="flex gap-1">
                {(['weight', 'length', 'head'] as ChartMetric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      chartMetric === m
                        ? 'bg-accent-500 text-white'
                        : 'bg-dark-800 text-gray-500 hover:bg-dark-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <GrowthChart
              records={records}
              birthday={selectedBaby.birthday}
              sex={selectedBaby.sex}
              metric={chartMetric}
              weightUnit={wUnit}
              lengthUnit={lUnit}
            />
            <p className="text-xs text-gray-600 text-center">WHO percentiles: 3rd, 15th, 50th, 85th, 97th</p>
          </div>
        )}

        {/* Latest measurements */}
        {records.length > 0 && (
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-700">
            <h2 className="text-base font-semibold text-gray-500 mb-3">latest measurements</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <p className="text-xl text-gray-100 font-semibold">
                  {records[0].weight ? displayWeight(records[0].weight) : '--'}
                </p>
                <p className="text-base text-gray-500 mt-0.5">weight</p>
                {records[0].weight && selectedBaby?.birthday && selectedBaby?.sex && (
                  <p className="text-xs text-accent-400 mt-0.5">
                    {getPercentile(records[0].weight, selectedBaby.birthday, records[0].date, selectedBaby.sex, 'weight')}
                  </p>
                )}
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <p className="text-xl text-gray-100 font-semibold">
                  {records[0].length ? displayLength(records[0].length) : '--'}
                </p>
                <p className="text-base text-gray-500 mt-0.5">length</p>
                {records[0].length && selectedBaby?.birthday && selectedBaby?.sex && (
                  <p className="text-xs text-accent-400 mt-0.5">
                    {getPercentile(records[0].length, selectedBaby.birthday, records[0].date, selectedBaby.sex, 'length')}
                  </p>
                )}
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <p className="text-xl text-gray-100 font-semibold">
                  {records[0].headCircumference ? displayLength(records[0].headCircumference) : '--'}
                </p>
                <p className="text-base text-gray-500 mt-0.5">head</p>
                {records[0].headCircumference && selectedBaby?.birthday && selectedBaby?.sex && (
                  <p className="text-xs text-accent-400 mt-0.5">
                    {getPercentile(records[0].headCircumference, selectedBaby.birthday, records[0].date, selectedBaby.sex, 'head')}
                  </p>
                )}
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
                        r.weight && displayWeight(r.weight),
                        r.length && displayLength(r.length),
                        r.headCircumference && `head ${displayLength(r.headCircumference)}`,
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

        {!selectedBaby?.birthday || !selectedBaby?.sex ? (
          <p className="text-sm text-center text-gray-600">
            add birthday & sex in settings to see WHO growth charts & percentiles.
          </p>
        ) : (
          <p className="text-sm text-center text-gray-600">
            track weight, length & head circumference for doctor visits.
          </p>
        )}
      </div>

      <Header />
    </div>
  );
}
