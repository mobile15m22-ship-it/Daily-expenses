/**
 * Firebase Client Adapter
 * Connects directly to Google Firebase Firestore for saving and retrieving expenses.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { FirebaseConfigParams } from './cloudConfig';
import { Transaction } from '../types';

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function initFirebase(config: FirebaseConfigParams): { app: FirebaseApp; db: Firestore } | null {
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
      projectId: config.projectId,
      storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });

    const db = getFirestore(app);
    cachedApp = app;
    cachedDb = db;
    return { app, db };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return null;
  }
}

export async function testFirebaseConnection(config: FirebaseConfigParams): Promise<{ success: boolean; message: string }> {
  try {
    const res = initFirebase(config);
    if (!res) {
      return { success: false, message: 'প্রয়োজনীয় API Key বা Project ID দেওয়া হয়নি।' };
    }

    // Try a ping check
    const testDocRef = doc(res.db, '_health_check', 'ping');
    await setDoc(testDocRef, { ping: Date.now(), status: 'connected' });
    return { success: true, message: 'Google Firebase এর সাথে সফলভাবে কানেক্ট হয়েছে!' };
  } catch (err: any) {
    console.error('Firebase test error:', err);
    const msg = err.message || '';
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return { 
        success: false, 
        message: 'কানেকশন হয়েছে, তবে Firestore Rules এ রিড/রাইট অনুমতি দিতে হবে (Test Mode অন করুন)।' 
      };
    }
    return { success: false, message: 'কানেকশন ব্যর্থ হয়েছে: ' + (err.message || 'ভুল কনফিগারেশন') };
  }
}

export async function syncTransactionToFirestore(config: FirebaseConfigParams, tx: Transaction): Promise<boolean> {
  try {
    const res = initFirebase(config);
    if (!res) return false;

    const docRef = doc(res.db, 'transactions', tx.id);
    await setDoc(docRef, tx);
    return true;
  } catch (err) {
    console.error('Error syncing transaction to Firestore:', err);
    return false;
  }
}

export async function deleteTransactionFromFirestore(config: FirebaseConfigParams, id: string): Promise<boolean> {
  try {
    const res = initFirebase(config);
    if (!res) return false;

    const docRef = doc(res.db, 'transactions', id);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Error deleting from Firestore:', err);
    return false;
  }
}

export async function fetchTransactionsFromFirestore(config: FirebaseConfigParams, userId: string): Promise<Transaction[]> {
  try {
    const res = initFirebase(config);
    if (!res) return [];

    const q = query(collection(res.db, 'transactions'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: Transaction[] = [];
    snapshot.forEach(d => {
      list.push(d.data() as Transaction);
    });
    return list;
  } catch (err) {
    console.error('Error fetching from Firestore:', err);
    return [];
  }
}
