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
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Welcome!</h1>
          <p className="text-gray-500 text-center text-sm">
            Create a new family or join an existing one with a code.
          </p>
          <button
            onClick={() => setMode('create')}
            className="w-full py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600 transition-colors"
          >
            Create New Family
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-3 rounded-xl bg-white text-gray-800 font-medium border border-pink-200 hover:bg-pink-50 transition-colors"
          >
            Join with Code
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-6">
        <form onSubmit={handleCreate} className="w-full max-w-sm space-y-4">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-gray-400 text-sm"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Family</h1>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Family name (e.g., The Smiths)"
            className="w-full px-4 py-3 rounded-xl border border-pink-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          {error && <p className="text-pink-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !familyName.trim()}
            className="w-full py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-6">
      <form onSubmit={handleJoin} className="w-full max-w-sm space-y-4">
        <button
          type="button"
          onClick={() => setMode('choose')}
          className="text-gray-400 text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Join Family</h1>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit family code"
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl border border-pink-200 bg-white text-gray-800 text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        {error && <p className="text-pink-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-3 rounded-xl bg-pink-500 text-white font-medium hover:bg-pink-600 disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}
