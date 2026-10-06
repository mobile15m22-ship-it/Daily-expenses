/**
 * Supabase Client Adapter
 * Connects directly to Supabase PostgreSQL database for saving and retrieving expenses.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfigParams } from './cloudConfig';
import { Transaction } from '../types';

let cachedClient: SupabaseClient | null = null;

export function initSupabase(config: SupabaseConfigParams): SupabaseClient | null {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  try {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
    cachedClient = client;
    return client;
  } catch (err) {
    console.error('Supabase initialization error:', err);
    return null;
  }
}

export async function testSupabaseConnection(config: SupabaseConfigParams): Promise<{ success: boolean; message: string }> {
  try {
    const client = initSupabase(config);
    if (!client) {
      return { success: false, message: 'সুপাবেস URL অথবা anon public key প্রদান করা হয়নি।' };
    }

    // Try a ping check
    const { error } = await client.from('transactions').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, we inform them
      if (error.message.includes('relation "transactions" does not exist') || error.code === '42P01') {
        return { 
          success: true, 
          message: 'সুপাবেস কানেক্ট হয়েছে! তবে Supabase SQL Editor এ "transactions" টেবিলটি তৈরি করতে হবে।' 
        };
      }
      return { success: false, message: 'সুপাবেস ত্রুটি: ' + error.message };
    }

    return { success: true, message: 'Supabase ডাটাবেজের সাথে সফলভাবে কানেক্ট হয়েছে!' };
  } catch (err: any) {
    return { success: false, message: 'কানেকশন ব্যর্থ হয়েছে: ' + (err.message || 'ভুল কনফিগারেশন') };
  }
}

export async function syncTransactionToSupabase(config: SupabaseConfigParams, tx: Transaction): Promise<boolean> {
  try {
    const client = initSupabase(config);
    if (!client) return false;

    const { error } = await client.from('transactions').upsert({
      id: tx.id,
      user_id: tx.userId,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      payment_method: tx.paymentMethod,
      date: tx.date,
      note: tx.note,
      created_at: tx.createdAt,
    });

    if (error) {
      console.error('Supabase upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error syncing transaction to Supabase:', err);
    return false;
  }
}

export async function deleteTransactionFromSupabase(config: SupabaseConfigParams, id: string): Promise<boolean> {
  try {
    const client = initSupabase(config);
    if (!client) return false;

    const { error } = await client.from('transactions').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Error deleting from Supabase:', err);
    return false;
  }
}

export async function fetchTransactionsFromSupabase(config: SupabaseConfigParams, userId: string): Promise<Transaction[]> {
  try {
    const client = initSupabase(config);
    if (!client) return [];

    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      type: d.type,
      amount: d.amount,
      category: d.category,
      paymentMethod: d.payment_method,
      date: d.date,
      note: d.note || '',
      createdAt: d.created_at || Date.now(),
    }));
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return [];
  }
}
