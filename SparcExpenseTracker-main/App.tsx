import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
// Fix: Import the `Category` type to resolve a `Cannot find name 'Category'` error.
import type { Expense, Currency, CustomCategory, CategoryDefinition, Category } from './types';
import { Page } from './constants';
import Dashboard from './components/Dashboard';
import AddExpense from './components/AddExpense';
import ExpensesList from './components/ExpensesList';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';
import { PlusIcon } from './components/Icons';
import ErrorBoundary from './components/ErrorBoundary';
import { CATEGORIES, CATEGORY_COLORS } from './constants';

const initializeCategories = (): CategoryDefinition[] => {
  return CATEGORIES.map(name => ({
    name,
    color: CATEGORY_COLORS[name as Category] || '#9CA3AF',
    isDefault: true,
  }));
};

const sortExpenses = (expenses: Expense[]): Expense[] => {
  return expenses.sort((a, b) => {
    const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    return parseInt(b.transactionId, 10) - parseInt(a.transactionId, 10);
  });
};

const App: React.FC = () => {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', []);
  const [categories, setCategories] = useLocalStorage<CategoryDefinition[]>('categories', []);
  const [activePage, setActivePage] = useState<Page>(Page.Add);
  const [editingTransaction, setEditingTransaction] = useState<Expense[] | null>(null);
  const [isAddFormDirty, setIsAddFormDirty] = useState(false);
  const [currency, setCurrency] = useLocalStorage<Currency>('currency', { code: 'INR', name: 'Indian Rupee', symbol: '₹' });
  const [scrollToTransactionId, setScrollToTransactionId] = useState<string | null>(null);

  // One-time initialization and migration
  useEffect(() => {
    let needsCategoriesUpdate = false;
    let finalCategories = [...categories];

    if (finalCategories.length === 0) {
      needsCategoriesUpdate = true;
      finalCategories = initializeCategories();
    }
    
    const storedCustomCategoriesRaw = localStorage.getItem('customCategories');
    if (storedCustomCategoriesRaw) {
      try {
        const customCats: CustomCategory[] = JSON.parse(storedCustomCategoriesRaw);
        if (Array.isArray(customCats) && customCats.length > 0) {
          const existingNames = new Set(finalCategories.map(c => c.name.toLowerCase()));
          const newCatsToAdd = customCats
            .filter(cc => !existingNames.has(cc.name.toLowerCase()))
            .map(cc => ({ ...cc, isDefault: false }));
          
          if (newCatsToAdd.length > 0) {
            finalCategories = [...finalCategories, ...newCatsToAdd];
            needsCategoriesUpdate = true;
          }
        }
      } catch (e) { console.error("Error migrating custom categories:", e); }
      localStorage.removeItem('customCategories');
    }

    if (needsCategoriesUpdate) {
      setCategories(finalCategories);
    }

    // Migrate expenses to include transactionId and sort them
    const expensesNeedProcessing = expenses.some(e => !e.transactionId);
    if (expensesNeedProcessing) {
      const migratedExpenses = expenses.map(e => e.transactionId ? e : { ...e, transactionId: e.id });
      setExpenses(sortExpenses(migratedExpenses));
    }
  }, []);


  const allCategoryNames = useMemo(() => categories.map(c => c.name).sort(), [categories]);

  const allCategoryColors = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.name] = cat.color;
      return acc;
    }, {} as Record<string, string>);
  }, [categories]);


  const addTransaction = useCallback((transaction: { vendor: string; date: string; notes?: string; splits: { amount: number; category: string }[] }) => {
    const newTransactionId = Date.now().toString();
    const newExpenses: Expense[] = transaction.splits.map(split => ({
      id: `${newTransactionId}-${Math.random().toString(36).substr(2, 9)}`,
      transactionId: newTransactionId,
      vendor: transaction.vendor,
      date: transaction.date,
      notes: transaction.notes,
      amount: split.amount,
      category: split.category
    }));

    setExpenses(prevExpenses => sortExpenses([...newExpenses, ...prevExpenses]));
    setIsAddFormDirty(false);
    setScrollToTransactionId(newTransactionId);
    setActivePage(Page.Expenses); 
  }, [setExpenses]);

  const deleteTransaction = useCallback((transactionId: string) => {
    setExpenses(prevExpenses => prevExpenses.filter(expense => expense.transactionId !== transactionId));
  }, [setExpenses]);

  const handleStartEdit = useCallback((transactionId: string) => {
    const transactionToEdit = expenses.filter(e => e.transactionId === transactionId);
    if (transactionToEdit.length > 0) {
      setIsAddFormDirty(false);
      setEditingTransaction(transactionToEdit);
      setActivePage(Page.Add);
    }
  }, [expenses]);

  const updateTransaction = useCallback((updatedTransaction: { transactionId: string, vendor: string; date: string; notes?: string; splits: { amount: number; category: string }[] }) => {
    const { transactionId } = updatedTransaction;

    // Create new expense objects for the updated transaction
    const updatedExpenses: Expense[] = updatedTransaction.splits.map(split => ({
      id: `${transactionId}-${Math.random().toString(36).substr(2, 9)}`, // new unique IDs for splits
      transactionId: transactionId,
      vendor: updatedTransaction.vendor,
      date: updatedTransaction.date,
      notes: updatedTransaction.notes,
      amount: split.amount,
      category: split.category
    }));

    // Atomically remove all old expenses for this transactionId and add the new ones, then sort
    setExpenses(prev => sortExpenses([
      ...prev.filter(e => e.transactionId !== transactionId),
      ...updatedExpenses
    ]));

    setEditingTransaction(null);
    setIsAddFormDirty(false);
    setScrollToTransactionId(transactionId);
    setActivePage(Page.Expenses);
  }, [setExpenses]);
  
  const handleScrollComplete = useCallback(() => {
    setScrollToTransactionId(null);
  }, []);
  
  const handleNavigate = (targetPage: Page) => {
    if (activePage === Page.Add && isAddFormDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setIsAddFormDirty(false);
        setEditingTransaction(null);
        setActivePage(targetPage);
      }
    } else {
      setEditingTransaction(null); // Always clear edit mode on navigation
      setActivePage(targetPage);
    }
  };

  const handleFabClick = () => {
    if (activePage === Page.Add) {
      handleNavigate(Page.Dashboard);
    } else {
      setEditingTransaction(null);
      setActivePage(Page.Add);
    }
  };
  
  return (
    <div className="min-h-screen font-sans text-gray-800 bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto max-w-lg p-4 pb-24">
        <ErrorBoundary>
          {activePage === Page.Dashboard && <Dashboard expenses={expenses} currencySymbol={currency.symbol} onNavigate={handleNavigate} allCategoryColors={allCategoryColors} allCategoryNames={allCategoryNames} />}
          {activePage === Page.Expenses && <ExpensesList expenses={expenses} deleteTransaction={deleteTransaction} onEdit={handleStartEdit} currencySymbol={currency.symbol} allCategoryColors={allCategoryColors} scrollToTransactionId={scrollToTransactionId} onScrollComplete={handleScrollComplete} />}
          {activePage === Page.Add && <AddExpense onAddTransaction={addTransaction} transactionToEdit={editingTransaction} onUpdateTransaction={updateTransaction} onFormDirtyChange={setIsAddFormDirty} currencySymbol={currency.symbol} allCategories={allCategoryNames} />}
          {activePage === Page.Settings && <Settings selectedCurrency={currency} onCurrencyChange={setCurrency} expenses={expenses} onExpensesChange={setExpenses} categories={categories} onCategoriesChange={setCategories} />}
        </ErrorBoundary>
      </main>
      {activePage !== Page.Settings && (
        <div className="fixed bottom-8 right-1/2 translate-x-1/2 z-20">
          <button
              onClick={handleFabClick}
              className={`transition-all duration-300 ease-in-out w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg
                ${activePage === Page.Add ? 'bg-indigo-700 transform rotate-45' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              aria-label={activePage === Page.Add ? 'Close' : 'Add Expense'}
            >
              <PlusIcon className="w-8 h-8" />
            </button>
        </div>
      )}
      <BottomNav activePage={activePage} onNavigate={handleNavigate} />
    </div>
  );
};

export default App;