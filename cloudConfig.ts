/**
 * Cloud Database Configuration Manager
 * Pre-configured with your Google Firebase Firestore project (firewritter-500cd).
 */

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface SupabaseConfigParams {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export type DbProviderType = 'local' | 'firebase' | 'supabase';

export interface CloudSettings {
  provider: DbProviderType;
  firebase: FirebaseConfigParams;
  supabase: SupabaseConfigParams;
  isConnected: boolean;
  lastChecked?: number;
}

const CLOUD_STORAGE_KEY = 'hisab_khata_cloud_config_v2';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigParams = {
  apiKey: "AIzaSyCck1aO3P4VjfwIluJQvbK4FjO-KOpQ7uU",
  authDomain: "firewritter-500cd.firebaseapp.com",
  projectId: "firewritter-500cd",
  storageBucket: "firewritter-500cd.firebasestorage.app",
  messagingSenderId: "90437290223",
  appId: "1:90437290223:web:fb720379bede5685e2b31a",
};

const DEFAULT_SETTINGS: CloudSettings = {
  provider: 'firebase',
  firebase: DEFAULT_FIREBASE_CONFIG,
  supabase: {
    supabaseUrl: '',
    supabaseAnonKey: '',
  },
  isConnected: true,
};

export function getCloudSettings(): CloudSettings {
  try {
    const raw = localStorage.getItem(CLOUD_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      firebase: {
        ...DEFAULT_FIREBASE_CONFIG,
        ...(parsed.firebase || {}),
      },
      provider: parsed.provider || 'firebase',
    };
  } catch (err) {
    console.error('Error reading cloud settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveCloudSettings(settings: CloudSettings): void {
  try {
    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving cloud settings:', err);
  }
}
