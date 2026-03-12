'use client';

import { useState } from 'react';
import { createFamily, joinFamily } from '@/lib/firebase';
import { useAuthContext } from './AuthProvider';

export default function FamilySetup() {
  const { user, refreshFamily } = useAuthContext();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createFamily(familyName.trim(), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      });
      await refreshFamily();
    } catch (err: any) {
      setError(err.message || 'Failed to create family');
    }
    setLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await joinFamily(code.trim(), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      });
      if (!result) {
        setError('No family found with that code. Please check and try again.');
      } else {
        await refreshFamily();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join family');
    }
    setLoading(false);
  };

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-gray-100 text-center lowercase">welcome!</h1>
          <p className="text-gray-500 text-center text-sm lowercase">
            create a new family or join an existing one with a code.
          </p>
          <button
            onClick={() => setMode('create')}
            className="w-full py-3 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 transition-colors lowercase"
          >
            create new family
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-3 rounded-xl bg-dark-800 text-gray-200 font-medium border border-dark-700 hover:bg-dark-700 transition-colors lowercase"
          >
            join with code
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
        <form onSubmit={handleCreate} className="w-full max-w-sm space-y-4">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-gray-500 text-sm lowercase"
          >
            &larr; back
          </button>
          <h1 className="text-2xl font-bold text-gray-100 lowercase">create family</h1>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="family name (e.g., the smiths)"
            className="w-full px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500 lowercase"
          />
          {error && <p className="text-red-400 text-sm lowercase">{error}</p>}
          <button
            type="submit"
            disabled={loading || !familyName.trim()}
            className="w-full py-3 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 lowercase"
          >
            {loading ? 'creating...' : 'create'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
        <button
          type="button"
          onClick={() => setMode('choose')}
          className="text-gray-500 text-sm lowercase"
        >
          &larr; back
        </button>
        <h1 className="text-2xl font-bold text-gray-100 lowercase">join family</h1>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="enter 6-digit family code"
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl border border-dark-600 bg-dark-800 text-gray-200 text-center text-2xl tracking-widest placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        {error && <p className="text-red-400 text-sm lowercase">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-3 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 lowercase"
        >
          {loading ? 'joining...' : 'join'}
        </button>
      </form>
    </div>
  );
}
