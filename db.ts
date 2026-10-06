/**
 * Database Service & Local Storage Engine
 * Provides secure multi-user authentication, data isolation, and expense CRUD operations.
 * Designed to be modular so it can be used offline or easily connected to Firebase / Supabase.
 */

import { Transaction, User, StoredUserAccount } from '../types';

const STORAGE_KEYS = {
  USERS: 'hisab_khata_users_v1',
  CURRENT_USER_ID: 'hisab_khata_active_uid_v1',
  TRANSACTIONS_PREFIX: 'hisab_khata_tx_',
  BUDGET_PREFIX: 'hisab_khata_budget_',
};

/**
 * Hash password securely using browser's native Web Crypto API (SHA-256)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_hisab_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to get all registered users
function getStoredUsers(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading users from storage:', err);
    return [];
  }
}

// Helper to save all registered users
function saveStoredUsers(users: StoredUserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving users to storage:', err);
  }
}

/**
 * Register a new user
 */
export async function registerUser(name: string, email: string, password: string, currency: string = '৳'): Promise<{ user: User; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim() || !cleanEmail || !password) {
    return { user: null as any, error: 'সবগুলো তথ্য পূরণ করুন।' };
  }

  const users = getStoredUsers();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { user: null as any, error: 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।' };
  }

  const passwordHash = await hashPassword(password);
  const newUser: StoredUserAccount = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    email: cleanEmail,
    currency: currency || '৳',
    monthlyBudget: 25000,
    createdAt: Date.now(),
    passwordHash,
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Seed with useful initial dummy data for realistic first impression
  seedInitialDataForUser(newUser.id);

  // Set active user session
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);

  const { passwordHash: _, ...safeUser } = newUser;
  return { user: safeUser };
}

/**
 * Authenticate existing user
 */
export async function loginUser(email: string, password: string): Promise<{ user: User | null; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const users = getStoredUsers();
  const userAccount = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!userAccount) {
    return { user: null, error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' };
  }

  const inputHash = await hashPassword(password);
  if (inputHash !== userAccount.passwordHash) {
    return { user: null, error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' };
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userAccount.id);

  const { passwordHash: _, ...safeUser } = userAccount;
  return { user: safeUser };
}

/**
 * Check currently logged in user session
 */
export function getCurrentUser(): User | null {
  try {
    const activeId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!activeId) return null;

    const users = getStoredUsers();
    const userAccount = users.find(u => u.id === activeId);
    if (!userAccount) return null;

    const { passwordHash: _, ...safeUser } = userAccount;
    return safeUser;
  } catch {
    return null;
  }
}

/**
 * Log out active user
 */
export function logoutUser(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
}

/**
 * Update user profile (e.g. monthly budget, name, currency)
 */
export function updateUserProfile(userId: string, updates: Partial<User>): User | null {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...updates,
  };

  saveStoredUsers(users);
  const { passwordHash: _, ...safeUser } = users[index];
  return safeUser;
}

// ==================== TRANSACTION OPERATIONS ====================

function getTransactionStorageKey(userId: string): string {
  return `${STORAGE_KEYS.TRANSACTIONS_PREFIX}${userId}`;
}

export function getUserTransactions(userId: string): Transaction[] {
  try {
    const raw = localStorage.getItem(getTransactionStorageKey(userId));
    if (!raw) return [];
    const list: Transaction[] = JSON.parse(raw);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Error reading transactions:', err);
    return [];
  }
}

export function saveUserTransactions(userId: string, transactions: Transaction[]): void {
  try {
    localStorage.setItem(getTransactionStorageKey(userId), JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving transactions:', err);
  }
}

// Cloud sync helpers
import { getCloudSettings } from './cloudConfig';
import { syncTransactionToFirestore, deleteTransactionFromFirestore, fetchTransactionsFromFirestore } from './firebaseClient';
import { syncTransactionToSupabase, deleteTransactionFromSupabase } from './supabaseClient';

function triggerCloudSync(tx: Transaction): void {
  const settings = getCloudSettings();
  if (settings.provider === 'firebase' && settings.firebase.apiKey) {
    syncTransactionToFirestore(settings.firebase, tx).catch(err => console.error('Cloud sync error:', err));
  } else if (settings.provider === 'supabase' && settings.supabase.supabaseUrl) {
    syncTransactionToSupabase(settings.supabase, tx).catch(err => console.error('Cloud sync error:', err));
  }
}

function triggerCloudDelete(id: string): void {
  const settings = getCloudSettings();
  if (settings.provider === 'firebase' && settings.firebase.apiKey) {
    deleteTransactionFromFirestore(settings.firebase, id).catch(err => console.error('Cloud delete error:', err));
  } else if (settings.provider === 'supabase' && settings.supabase.supabaseUrl) {
    deleteTransactionFromSupabase(settings.supabase, id).catch(err => console.error('Cloud delete error:', err));
  }
}

export async function syncTransactionsFromCloud(userId: string): Promise<Transaction[]> {
  const settings = getCloudSettings();
  try {
    let cloudList: Transaction[] = [];
    if (settings.provider === 'firebase' && settings.firebase.apiKey) {
      cloudList = await fetchTransactionsFromFirestore(settings.firebase, userId);
    } else if (settings.provider === 'supabase' && settings.supabase.supabaseUrl) {
      const { fetchTransactionsFromSupabase } = await import('./supabaseClient');
      cloudList = await fetchTransactionsFromSupabase(settings.supabase, userId);
    }

    if (cloudList && cloudList.length > 0) {
      const localList = getUserTransactions(userId);
      const idMap = new Map<string, Transaction>();
      localList.forEach(t => idMap.set(t.id, t));
      cloudList.forEach(t => idMap.set(t.id, t));
      const merged = Array.from(idMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
      );
      saveUserTransactions(userId, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Background cloud sync note:', err);
  }
  return getUserTransactions(userId);
}

export function addTransaction(userId: string, data: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Transaction {
  const transactions = getUserTransactions(userId);
  const newTx: Transaction = {
    ...data,
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    createdAt: Date.now(),
  };

  transactions.unshift(newTx);
  saveUserTransactions(userId, transactions);
  triggerCloudSync(newTx);
  return newTx;
}

export function updateTransaction(userId: string, id: string, data: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>): Transaction | null {
  const transactions = getUserTransactions(userId);
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return null;

  transactions[index] = {
    ...transactions[index],
    ...data,
    updatedAt: Date.now(),
  };

  saveUserTransactions(userId, transactions);
  triggerCloudSync(transactions[index]);
  return transactions[index];
}

export function deleteTransaction(userId: string, id: string): boolean {
  const transactions = getUserTransactions(userId);
  const filtered = transactions.filter(t => t.id !== id);
  if (filtered.length === transactions.length) return false;

  saveUserTransactions(userId, filtered);
  triggerCloudDelete(id);
  return true;
}

// ==================== SEED SAMPLE DATA FOR NEW ACCOUNTS ====================

function seedInitialDataForUser(userId: string): void {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];

  const d1 = new Date(today);
  const d2 = new Date(today); d2.setDate(today.getDate() - 1);
  const d3 = new Date(today); d3.setDate(today.getDate() - 3);
  const d4 = new Date(today); d4.setDate(today.getDate() - 5);

  const initialList: Transaction[] = [
    {
      id: 'tx_seed_1',
      userId,
      type: 'income',
      amount: 45000,
      category: 'বেতন ও স্যালারি',
      paymentMethod: 'ব্যাংক ট্রান্সফার',
      date: format(d4),
      note: 'মাসিক বেতনের টাকা জমা হয়েছে',
      createdAt: Date.now() - 500000,
    },
    {
      id: 'tx_seed_2',
      userId,
      type: 'expense',
      amount: 12000,
      category: 'বাসা ভাড়া ও ইউটিলিটি',
      paymentMethod: 'ব্যাংক ট্রান্সফার',
      date: format(d4),
      note: 'চলতি মাসের বাসা ভাড়া ও বিদ্যুৎ বিল',
      createdAt: Date.now() - 400000,
    },
    {
      id: 'tx_seed_3',
      userId,
      type: 'expense',
      amount: 2850,
      category: 'নিত্যপ্রয়োজনীয় বাজার',
      paymentMethod: 'বিকাশ (bKash)',
      date: format(d3),
      note: 'সাপ্তাহিক বাজার (চাল, ডাল, মাছ, তেল)',
      createdAt: Date.now() - 300000,
    },
    {
      id: 'tx_seed_4',
      userId,
      type: 'expense',
      amount: 450,
      category: 'যাতায়াত ও ভাড়া',
      paymentMethod: 'ক্যাশ (Cash)',
      date: format(d2),
      note: 'অফিসে যাওয়া ও আসার সিএনজি ভাড়া',
      createdAt: Date.now() - 200000,
    },
    {
      id: 'tx_seed_5',
      userId,
      type: 'expense',
      amount: 820,
      category: 'খাবার ও রেস্তোরাঁ',
      paymentMethod: 'নগদ (Nagad)',
      date: format(d1),
      note: 'বন্ধুদের সাথে দুপুরের খাবার',
      createdAt: Date.now() - 100000,
    },
  ];

  saveUserTransactions(userId, initialList);
}

// ==================== EXPORT & IMPORT UTILITIES ====================

export function exportUserDataAsJSON(userId: string): string {
  const user = getCurrentUser();
  const transactions = getUserTransactions(userId);
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    user,
    transactions,
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function exportUserDataAsCSV(userId: string): string {
  const transactions = getUserTransactions(userId);
  if (transactions.length === 0) return 'তারিখ,প্রকার,পরিমাণ,ক্যাটাগরি,পেমেন্ট মাধ্যম,বিবরণ\n';

  const headers = ['তারিখ', 'প্রকার', 'পরিমাণ', 'ক্যাটাগরি', 'পেমেন্ট মাধ্যম', 'বিবরণ'];
  const rows = transactions.map(t => [
    `"${t.date}"`,
    `"${t.type === 'expense' ? 'ব্যয়' : 'আয়'}"`,
    `"${t.amount}"`,
    `"${t.category}"`,
    `"${t.paymentMethod}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function downloadExpensesCSV(userId: string): { success: boolean; count: number } {
  const csvContent = exportUserDataAsCSV(userId);
  const transactions = getUserTransactions(userId);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `hisabkhata_expenses_backup_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { success: true, count: transactions.length };
}

export function importUserDataFromJSON(userId: string, jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.transactions)) {
      return { success: false, count: 0, error: 'সঠিক JSON ফাইল ফরম্যাট নয়।' };
    }

    const currentTxs = getUserTransactions(userId);
    const importedTxs: Transaction[] = parsed.transactions.map((t: any) => ({
      ...t,
      id: t.id || 'imported_' + Math.random().toString(36).substring(2, 7),
      userId,
    }));

    // Merge without duplicates by ID
    const existingIds = new Set(currentTxs.map(t => t.id));
    const newItems = importedTxs.filter(t => !existingIds.has(t.id));
    const combined = [...newItems, ...currentTxs];

    saveUserTransactions(userId, combined);
    return { success: true, count: newItems.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'ডাটা ইমপোর্ট করতে ব্যর্থ হয়েছে।' };
  }
}
