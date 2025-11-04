
export interface Expense {
  id: string;
  transactionId: string; // Groups splits together.
  amount: number;
  vendor: string;
  category: string;
  date: string; // ISO string format
  notes?: string; // Notes are shared across all splits of a transaction
}

export type Category = string;

export interface CustomCategory {
  name: string;
  color: string;
}

// A full category definition used for managing all categories
export interface CategoryDefinition extends CustomCategory {
  isDefault: boolean;
}

export interface ParsedExpense {
    amount: number;
    vendor:string;
    description?: string;
    category?: Category;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}