import React, { useState, useMemo, useEffect } from 'react';
import type { Expense } from '../types';
import ExpenseItem from './ExpenseItem';
import TransactionItem from './TransactionItem';
import { CollectionIcon, PlusIcon } from './Icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatDate = (isoDate: string): string => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 'Invalid Date';
  const parts = isoDate.split('-');
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return 'Invalid Date';
  return `${MONTH_NAMES[monthIndex]} ${day}, ${year}`;
};

interface MonthOption {
  value: string;
  label: string;
}

interface ExpensesListProps {
  expenses: Expense[];
  deleteTransaction: (transactionId: string) => void;
  onEdit: (transactionId: string) => void;
  currencySymbol: string;
  allCategoryColors: Record<string, string>;
  allCategories: string[];
  scrollToTransactionId: string | null;
  onScrollComplete: () => void;
}

const ExpensesList: React.FC<ExpensesListProps> = ({ expenses, deleteTransaction, onEdit, currencySymbol, allCategoryColors, allCategories, scrollToTransactionId, onScrollComplete }) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  
  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (scrollToTransactionId) {
        // Use a timeout to allow the DOM to update after page navigation
        setTimeout(() => {
            const element = document.getElementById(`transaction-${scrollToTransactionId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-flash');
                setTimeout(() => {
                    element.classList.remove('highlight-flash');
                    onScrollComplete();
                }, 1500); // Duration should match animation
            } else {
                onScrollComplete(); // Reset state even if element not found
            }
        }, 100); // Small delay for DOM to render
    }
  }, [scrollToTransactionId, onScrollComplete]);

  const availableMonths: MonthOption[] = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach(expense => monthSet.add(expense.date.substring(0, 7)));
    monthSet.add(getCurrentMonth());

    return Array.from(monthSet)
      .sort()
      .reverse()
      .map(monthStr => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        return { value: monthStr, label: `${monthName} ${year}` };
      });
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const byMonth = expenses.filter(expense => expense.date.startsWith(selectedMonth));
    if (selectedCategory === 'all') {
      return byMonth;
    }
    return byMonth.filter(expense => expense.category === selectedCategory);
  }, [expenses, selectedMonth, selectedCategory]);

  // Fix: Add an explicit type annotation to `groupedByDate` to ensure TypeScript correctly infers the types for `Object.entries` and resolves the "Property 'map' does not exist on type 'unknown'" error.
  const groupedByDate: Record<string, Expense[][]> = useMemo(() => {
    // First, group expenses into transactions by transactionId
    const transactions = filteredExpenses.reduce((acc, expense) => {
      acc[expense.transactionId] = acc[expense.transactionId] || [];
      acc[expense.transactionId].push(expense);
      return acc;
    }, {} as Record<string, Expense[]>);

    // Then, group these transactions by date
    return Object.values(transactions).reduce((groups, transaction) => {
      const date = formatDate(transaction[0].date);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      // Sort transactions within a date group, most recent first (if timestamps were available)
      // For now, it maintains insertion order which is effectively reverse chronological from the full list.
      return groups;
    }, {} as Record<string, Expense[][]>);
  }, [filteredExpenses]);
  
  const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">All Expenses</h1>
        <p className="text-gray-500">A complete history of your transactions.</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="month-filter" className="sr-only">Filter by Month</label>
          <select
              id="month-filter"
              name="month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
              aria-label="Select month to display expenses"
          >
              {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>
                      {month.label}
                  </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="category-filter" className="sr-only">Filter by Category</label>
          <select
              id="category-filter"
              name="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
              aria-label="Select category to display expenses"
          >
              <option value="all">All Categories</option>
              {allCategories.map(cat => (
                  <option key={cat} value={cat}>
                      {cat}
                  </option>
              ))}
          </select>
        </div>
      </div>
      
      {filteredExpenses.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, transactionsOnDate]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b mb-3">{date}</h2>
              <ul className="space-y-3">
                {transactionsOnDate.map(transaction => {
                  const transactionId = transaction[0].transactionId;
                  const isSplit = transaction.length > 1;

                  return isSplit ? (
                    <TransactionItem
                      key={transactionId}
                      transaction={transaction}
                      onDelete={deleteTransaction}
                      onEdit={onEdit}
                      isConfirming={confirmingDeleteId === transactionId}
                      onSetConfirming={setConfirmingDeleteId}
                      currencySymbol={currencySymbol}
                      allCategoryColors={allCategoryColors}
                    />
                  ) : (
                    <ExpenseItem
                      key={transactionId}
                      expense={transaction[0]}
                      onDelete={deleteTransaction}
                      onEdit={onEdit}
                      isConfirming={confirmingDeleteId === transactionId}
                      onSetConfirming={setConfirmingDeleteId}
                      currencySymbol={currencySymbol}
                      allCategoryColors={allCategoryColors}
                    />
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-md">
          <CollectionIcon className="w-16 h-16 mx-auto text-gray-300" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">No Expenses Found</h2>
          <p className="mt-2 text-gray-500">
            No expenses were found for {selectedMonthLabel || 'the selected period'}.
          </p>
           <p className="mt-2 text-sm text-gray-500">
            Tap the <PlusIcon className="inline-block w-5 h-5 -mt-1 mx-1 p-1 bg-indigo-100 text-indigo-600 rounded-full"/> button to add a transaction.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpensesList;