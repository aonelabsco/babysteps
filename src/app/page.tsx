'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase';
import { useAuthContext } from '@/components/AuthProvider';

export default function LoginPage() {
  const { user, loading, family, familyLoading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !familyLoading) {
      if (family) {
        router.replace('/dashboard');
      }
      // If user but no family, stay on this page but FamilySetup will show
    }
  }, [user, loading, family, familyLoading, router]);

  if (loading || familyLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user && !family) {
    // Show family setup - dynamic import to keep bundle small
    const FamilySetup = require('@/components/FamilySetup').default;
    return <FamilySetup />;
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-100">baby steps.</h1>
          <p className="text-gray-500 mt-2">track feeds, poops & diaper changes</p>
        </div>

        <button
          onClick={async () => {
            try {
              await signInWithGoogle();
            } catch (err: any) {
              if (err.code !== 'auth/popup-closed-by-user') {
                alert('Sign in failed. Please try again.');
              }
            }
          }}
          className="w-full py-3 rounded-xl bg-dark-800 text-gray-200 font-medium border border-dark-700 hover:bg-dark-700 transition-colors flex items-center justify-center gap-3 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs text-gray-600">
          Both parents sign in and share a family code to sync data
        </p>
      </div>
    </div>
  );
}
