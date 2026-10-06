/**
 * Cloud Database Architecture Guide & Connection Configurations
 * Explains how this application integrates with 100% Free Cloud Databases (Firebase Firestore & Supabase)
 * from a smartphone without needing a computer.
 */

export interface FreeDatabaseProvider {
  name: string;
  badge: string;
  freeTierLimits: string;
  description: string;
  mobileSetupSteps: string[];
  sampleConfigCode: string;
}

export const FREE_DATABASE_PROVIDERS: FreeDatabaseProvider[] = [
  {
    name: 'Firebase Firestore (Google)',
    badge: 'সবচেয়ে জনপ্রিয় ও নির্ভরযোগ্য',
    freeTierLimits: '৫০,০০০ রিড/দিন, ২০,০০০ রাইট/দিন, ১ জিবি স্টোরেজ (সম্পূর্ণ আজীবন ফ্রি)',
    description: 'গুগলের ক্লাউড ডাটাবেজ। এটি মোবাইল ফ্রেন্ডলি, রিয়েলটাইম সিঙ্ক সুবিধা দেয় এবং কোনো ক্রেডিট কার্ড লাগে না।',
    mobileSetupSteps: [
      '১. ফোনের Chrome বা Safari ব্রাউজারে console.firebase.google.com এ যান।',
      '২. আপনার গুগল জিমেইল দিয়ে লগইন করে "Add project" বাটনে ট্যাপ করে একটি প্রোজেক্ট খুলুন।',
      '৩. "Build" সেকশন থেকে "Firestore Database" এ ক্লিক করে "Create Database" সিলেক্ট করুন (Test mode সিলেক্ট করুন)।',
      '৪. "Project settings" এ গিয়ে Web আইকনে (</>) চাপ দিয়ে Firebase Config অবজেক্টটি কপি করে নিন।',
      '৫. এই অ্যাপের `src/services/db.ts` ফাইলে Firebase SDK যোগ করে দিলেই ডাটা সরাসরি ক্লাউডে সেভ হবে!'
    ],
    sampleConfigCode: `// Firebase Web SDK Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const cloudDb = getFirestore(app);`
  },
  {
    name: 'Supabase (Free PostgreSQL)',
    badge: 'SQL ও রিলেশনাল ডাটাবেজ',
    freeTierLimits: '৫০০ এমবি ডাটাবেজ, ৫০,০০০ মাসিক ইউজার, আনলিমিটেড API রিকোয়েস্ট',
    description: 'ওপেন সোর্স ফায়ারবেস বিকল্প। শক্তিশালী রিলেশনাল ডাটাবেজ এবং অটোমেটিক REST API প্রদান করে।',
    mobileSetupSteps: [
      '১. ফোনে supabase.com এ গিয়ে ফ্রি অ্যাকাউন্ট তৈরি করুন।',
      '২. "New Project" এ চাপ দিয়ে ডাটাবেজের নাম ও একটি পাসওয়ার্ড দিন।',
      '৩. Project Settings > API সেকশনে গিয়ে Project URL এবং anon public key কপি করুন।',
      '৪. @supabase/supabase-js লাইব্রেরি ব্যবহার করে ফোন থেকেই ডাটা ফেচ ও স্টোর করা যায়।'
    ],
    sampleConfigCode: `// Supabase Client Setup
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyz.supabase.co';
const supabaseKey = 'public-anon-key';
export const supabase = createClient(supabaseUrl, supabaseKey);`
  }
];
