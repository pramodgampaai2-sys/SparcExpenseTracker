
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Expense, Category } from '../types';
import { parseExpenseFromText } from '../services/geminiService';
import { SparklesIcon, CheckIcon, PlusIcon, TrashIcon } from './Icons';

interface AddExpenseProps {
  onAddTransaction: (transaction: { vendor: string; date: string; notes?: string; splits: { amount: number; category: string }[] }) => void;
  transactionToEdit?: Expense[] | null;
  onUpdateTransaction?: (transaction: { transactionId: string, vendor: string; date: string; notes?: string; splits: { amount: number; category: string }[] }) => void;
  onFormDirtyChange: (isDirty: boolean) => void;
  currencySymbol: string;
  allCategories: string[];
}

const AddExpense: React.FC<AddExpenseProps> = ({ onAddTransaction, transactionToEdit, onUpdateTransaction, onFormDirtyChange, currencySymbol, allCategories }) => {
  const [smsText, setSmsText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalAmount, setTotalAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<{ amount: string; category: Category }[]>([{ amount: '', category: 'Other' }]);
  
  const isEditMode = !!transactionToEdit;
  
  useEffect(() => {
    if (transactionToEdit) {
      const total = transactionToEdit.reduce((sum, exp) => sum + exp.amount, 0);
      const isSplitTransaction = transactionToEdit.length > 1;
      
      setTotalAmount(total.toString());
      setVendor(transactionToEdit[0].vendor);
      setDate(transactionToEdit[0].date);
      setNotes(transactionToEdit[0].notes || '');
      setIsSplit(isSplitTransaction);

      if (isSplitTransaction) {
        setSplits(transactionToEdit.map(exp => ({ amount: exp.amount.toString(), category: exp.category })));
      } else {
        setSplits([{ amount: transactionToEdit[0].amount.toString(), category: transactionToEdit[0].category }]);
      }
    } else {
      resetForm();
    }
  }, [transactionToEdit]);
  
  // Dirty form check
  useEffect(() => {
    const isDirty = totalAmount !== '' || vendor !== '' || notes !== '';
    onFormDirtyChange(isDirty);
  }, [totalAmount, vendor, notes, splits, onFormDirtyChange]);

  const handleParseSms = useCallback(async () => {
    if (!smsText.trim()) {
      setError('Please paste your SMS content first.');
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      const result = await parseExpenseFromText(smsText, allCategories);
      if (result) {
        setTotalAmount(result.amount.toString());
        setVendor(result.vendor);
        setSplits([{ amount: result.amount.toString(), category: result.category || 'Other' }]);
        setIsSplit(false);
      } else {
        setError("Couldn't identify an expense from the text. Please enter manually.");
      }
    } catch (e) {
      setError("An error occurred while parsing. Please try again.");
    } finally {
      setIsParsing(false);
    }
  }, [smsText, allCategories]);
  
  const updateSplit = (index: number, field: 'amount' | 'category', value: string) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };
  
  const addSplit = () => {
    setSplits([...splits, { amount: '', category: 'Other' }]);
  };

  const removeSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index));
    }
  };
  
  const handleToggleSplit = () => {
    const newIsSplit = !isSplit;
    setIsSplit(newIsSplit);

    // When toggling from a split view back to a single category,
    // consolidate the splits into one to prevent data inconsistencies.
    if (!newIsSplit) {
      const firstCategory = splits.length > 0 ? splits[0].category : 'Other';
      setSplits([{ amount: totalAmount, category: firstCategory }]);
    }
  };

  const { remainingAmount, isValid } = useMemo(() => {
    const parsedTotal = parseFloat(totalAmount) || 0;
    const allocated = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const remaining = parsedTotal - allocated;
    
    const allSplitsValid = splits.every(s => parseFloat(s.amount) > 0 && s.category);
    
    // Use a small epsilon for floating point comparison
    const isAmountCorrect = Math.abs(remaining) < 0.01;

    return {
      remainingAmount: remaining,
      isValid: parsedTotal > 0 && vendor.trim() !== '' && allSplitsValid && isAmountCorrect,
    };
  }, [totalAmount, vendor, splits]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const finalSplits = splits.map(s => ({ amount: parseFloat(s.amount), category: s.category }));

    if (isEditMode && onUpdateTransaction && transactionToEdit) {
      onUpdateTransaction({
        transactionId: transactionToEdit[0].transactionId,
        vendor: vendor.trim(),
        date,
        notes: notes.trim(),
        splits: finalSplits,
      });
    } else {
      onAddTransaction({
        vendor: vendor.trim(),
        date,
        notes: notes.trim(),
        splits: finalSplits,
      });
      resetForm();
    }
  };

  const resetForm = () => {
    setTotalAmount('');
    setVendor('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setIsSplit(false);
    setSplits([{ amount: '', category: 'Other' }]);
    setSmsText('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">{isEditMode ? 'Edit Expense' : 'Add Expense'}</h1>
        <p className="text-gray-500">{isEditMode ? 'Update the transaction details.' : 'Log a new transaction manually or with AI.'}</p>
      </header>

      {!isEditMode && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Parse from SMS</h2>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            rows={3}
            placeholder={`Paste SMS content here, e.g., 'You spent ${currencySymbol}1000 at Starbucks...'`}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            disabled={isParsing}
          />
          <button
            onClick={handleParseSms}
            disabled={isParsing}
            className="mt-3 w-full flex items-center justify-center bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-all duration-200"
          >
            {isParsing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><SparklesIcon className="w-5 h-5 mr-2"/>Parse with AI</>}
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-md space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-2">Transaction Details</h2>
        <div>
          <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">Vendor</label>
          <input type="text" id="vendor" value={vendor} onChange={e => setVendor(e.target.value)} className="mt-1 block w-full input-field" placeholder="e.g., Coffee Shop" required />
        </div>
        <div>
          <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">Total Amount</label>
          <input type="number" id="totalAmount" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="mt-1 block w-full input-field" placeholder="0.00" required step="0.01" />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full input-field date-input-with-icon" required />
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <input type="text" id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full input-field" placeholder="e.g., Groceries for the week" />
        </div>
        
        <div className="pt-2">
            <div className="flex justify-between items-center border-b pb-3 mb-2">
                 <h2 className="text-lg font-semibold text-gray-800">Category Splits</h2>
                 <button type="button" onClick={handleToggleSplit} className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-colors">
                    {isSplit ? 'Single Category' : 'Split'}
                 </button>
            </div>
            {isSplit ? (
              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input type="number" value={split.amount} onChange={e => updateSplit(index, 'amount', e.target.value)} className="w-1/3 input-field" placeholder="Amount" required step="0.01" aria-label={`Amount for split ${index + 1}`} />
                    <select value={split.category} onChange={e => updateSplit(index, 'category', e.target.value as Category)} className="flex-grow input-field" aria-label={`Category for split ${index + 1}`}>
                      {allCategories.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                    <button type="button" onClick={() => removeSplit(index)} disabled={splits.length <= 1} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Remove split ${index + 1}`}>
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addSplit} className="w-full flex items-center justify-center mt-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors">
                  <PlusIcon className="w-5 h-5 mr-2" /> Add Split
                </button>
                <div className={`mt-2 text-sm text-center p-2 rounded-md ${remainingAmount === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    <p>Remaining: {currencySymbol}{remainingAmount.toFixed(2)}</p>
                </div>
              </div>
            ) : (
                <div>
                  <label htmlFor="category" className="sr-only">Category</label>
                  <select id="category" value={splits[0]?.category || 'Other'} onChange={e => {
                      const newCategory = e.target.value as Category;
                      setSplits([{ amount: totalAmount, category: newCategory }])
                    }} 
                    onFocus={() => setSplits([{ amount: totalAmount, category: splits[0]?.category || 'Other' }])}
                    className="block w-full input-field">
                    {allCategories.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
            )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Reset</button>
            <button type="submit" disabled={!isValid} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 flex items-center transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed">
              <CheckIcon className="w-5 h-5 mr-1" />
              {isEditMode ? 'Update Expense' : 'Save Expense'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;
