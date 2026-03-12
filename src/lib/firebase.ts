import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { Family, FamilyMember, Baby, BabyEvent } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

function getApp() {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

export function getFirebaseAuth() {
  return getAuth(getApp());
}

export function getFirebaseDb() {
  return getFirestore(getApp());
}

// Lazy singletons for client-side use
export const auth = typeof window !== 'undefined' ? getFirebaseAuth() : (null as any);
export const db = typeof window !== 'undefined' ? getFirebaseDb() : (null as any);

const googleProvider = new GoogleAuthProvider();

// Detect if we're in a context where popups won't work
function shouldUseRedirect(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  // In-app browsers (WhatsApp, Instagram, Facebook, etc.) and iOS PWA
  const isInAppBrowser = /fban|fbav|instagram|whatsapp|line|wechat|twitter/i.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return isInAppBrowser || isStandalone;
}

export async function signInWithGoogle() {
  if (shouldUseRedirect()) {
    return signInWithRedirect(auth, googleProvider);
  }
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    // If popup fails (blocked, storage issue), fall back to redirect
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/internal-error' ||
      err.message?.includes('missing initial state')
    ) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  }
}

// Call this on app init to handle redirect results
export async function handleRedirectResult() {
  try {
    await getRedirectResult(auth);
  } catch {
    // Ignore redirect errors
  }
}

export async function signOut() {
  return fbSignOut(auth);
}

// Generate a random 6-digit family code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createFamily(
  name: string,
  user: { uid: string; displayName: string | null; email: string | null }
): Promise<Family> {
  const code = generateCode();
  const member: FamilyMember = {
    uid: user.uid,
    name: user.displayName || 'Parent',
    email: user.email || '',
    joinedAt: Date.now(),
  };
  const familyData = {
    name,
    code,
    defaultUnit: null,
    createdBy: user.uid,
    createdAt: Date.now(),
    babies: [],
    members: [member],
  };
  const ref = await addDoc(collection(db, 'families'), familyData);
  await setDoc(doc(db, 'userFamilies', user.uid), { familyId: ref.id });
  return { id: ref.id, ...familyData };
}

export async function joinFamily(
  code: string,
  user: { uid: string; displayName: string | null; email: string | null }
): Promise<Family | null> {
  const q = query(collection(db, 'families'), where('code', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const familyDoc = snap.docs[0];
  const familyData = familyDoc.data() as Omit<Family, 'id'>;

  if (!familyData.members.find((m) => m.uid === user.uid)) {
    const member: FamilyMember = {
      uid: user.uid,
      name: user.displayName || 'Parent',
      email: user.email || '',
      joinedAt: Date.now(),
    };
    await updateDoc(familyDoc.ref, { members: arrayUnion(member) });
    familyData.members.push(member);
  }

  await setDoc(doc(db, 'userFamilies', user.uid), { familyId: familyDoc.id });
  return { id: familyDoc.id, ...familyData };
}

export async function getUserFamily(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'userFamilies', uid));
  if (!snap.exists()) return null;
  return snap.data().familyId;
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const snap = await getDoc(doc(db, 'families', familyId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Family;
}

export function subscribeToFamily(
  familyId: string,
  callback: (family: Family) => void
) {
  return onSnapshot(doc(db, 'families', familyId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as Family);
    }
  });
}

export async function addBaby(familyId: string, name: string): Promise<Baby> {
  const baby: Baby = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
  };
  await updateDoc(doc(db, 'families', familyId), {
    babies: arrayUnion(baby),
  });
  return baby;
}

export async function removeBaby(familyId: string, baby: Baby) {
  await updateDoc(doc(db, 'families', familyId), {
    babies: arrayRemove(baby),
  });
}

export async function setDefaultUnit(familyId: string, unit: 'ml' | 'oz') {
  await updateDoc(doc(db, 'families', familyId), { defaultUnit: unit });
}

export async function addEvent(event: Omit<BabyEvent, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), event);
  return ref.id;
}

export async function deleteEvent(eventId: string) {
  await deleteDoc(doc(db, 'events', eventId));
}

export async function updateEventTimestamp(eventId: string, newTimestamp: number) {
  await updateDoc(doc(db, 'events', eventId), { timestamp: newTimestamp });
}

export function subscribeToEvents(
  familyId: string,
  babyId: string,
  callback: (events: BabyEvent[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'events'),
    where('familyId', '==', familyId),
    where('babyId', '==', babyId),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BabyEvent));
      callback(events);
    },
    (err) => {
      console.error('Firestore subscribeToEvents error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToDayEvents(
  familyId: string,
  babyId: string,
  callback: (events: BabyEvent[]) => void,
  onError?: (err: Error) => void
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, 'events'),
    where('familyId', '==', familyId),
    where('babyId', '==', babyId),
    where('timestamp', '>=', startOfDay.getTime()),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BabyEvent));
      callback(events);
    },
    (err) => {
      console.error('Firestore subscribeToDayEvents error:', err);
      if (onError) onError(err);
    }
  );
}
