export type TransactionType = 'expense' | 'income';

export type ExpenseCategory = 
  | 'খাবার ও রেস্তোরাঁ' 
  | 'যাতায়াত ও ভাড়া' 
  | 'নিত্যপ্রয়োজনীয় বাজার' 
  | 'বাসা ভাড়া ও ইউটিলিটি' 
  | 'কেনাকাটা ও পোশাক' 
  | 'চিকিৎসা ও ওষুধ' 
  | 'শিক্ষা ও কোর্স' 
  | 'বিনোদন ও আড্ডা' 
  | 'পারিবারিক খরচ' 
  | 'অন্যান্য খরচ';

export type IncomeCategory =
  | 'বেতন ও স্যালারি'
  | 'ব্যবসা ও লাভ'
  | 'ফ্রিল্যান্সিং'
  | 'টিউশনি'
  | 'উপহার বা বোনাস'
  | 'অন্যান্য আয়';

export type PaymentMethod = 'ক্যাশ (Cash)' | 'বিকাশ (bKash)' | 'নগদ (Nagad)' | 'রকেট (Rocket)' | 'ব্যাংক ট্রান্সফার' | 'কার্ড';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: ExpenseCategory | IncomeCategory | string;
  paymentMethod: PaymentMethod;
  date: string; // ISO date string YYYY-MM-DD
  note: string;
  createdAt: number;
  updatedAt?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string; // e.g. '৳', '$'
  monthlyBudget?: number;
  createdAt: number;
}

export interface StoredUserAccount extends User {
  passwordHash: string;
}

export interface BudgetConfig {
  monthlyLimit: number;
  alertThreshold: number; // e.g. 80 for 80%
}

export interface FilterState {
  searchQuery: string;
  type: 'all' | 'expense' | 'income';
  category: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
}
