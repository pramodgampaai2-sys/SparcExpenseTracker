import React from 'react';
import type { Expense } from '../types';
import { TrashIcon, PencilIcon, DocumentDuplicateIcon } from './Icons';

interface TransactionItemProps {
  transaction: Expense[];
  onDelete: (transactionId: string) => void;
  onEdit: (transactionId: string) => void;
  isConfirming: boolean;
  onSetConfirming: (transactionId: string | null) => void;
  currencySymbol: string;
  allCategoryColors: Record<string, string>;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onDelete, onEdit, isConfirming, onSetConfirming, currencySymbol, allCategoryColors }) => {
  const { transactionId, vendor, notes } = transaction[0];
  const totalAmount = transaction.reduce((sum, exp) => sum + exp.amount, 0);

  const handleDeleteClick = () => {
    onDelete(transactionId);
  };
  
  const handleEditClick = () => {
    onEdit(transactionId);
  };

  return (
    <li id={`transaction-${transactionId}`} className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full flex-shrink-0 bg-indigo-50 flex items-center justify-center text-indigo-500">
                <DocumentDuplicateIcon className="w-6 h-6" />
            </div>
            <div className="ml-4 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{vendor}</p>
            <p className="font-semibold text-gray-900">{currencySymbol}{totalAmount.toFixed(2)}</p>
            </div>
        </div>
        <div className="flex items-center flex-shrink-0 space-x-2 pl-4">
            {isConfirming ? (
            <div className="flex items-center space-x-2 animate-fade-in">
                <button 
                onClick={() => onSetConfirming(null)} 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded transition-colors"
                aria-label={`Cancel deletion of ${vendor} transaction`}
                >
                Cancel
                </button>
                <button 
                onClick={handleDeleteClick} 
                className="text-sm font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md transition-colors"
                aria-label={`Confirm deletion of ${vendor} transaction`}
                >
                Delete
                </button>
            </div>
            ) : (
            <>
                <button
                onClick={handleEditClick}
                className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                aria-label={`Edit ${vendor} transaction`}
                >
                <PencilIcon className="w-5 h-5" />
                </button>
                <button 
                onClick={() => onSetConfirming(transactionId)} 
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label={`Delete ${vendor} transaction`}
                >
                <TrashIcon className="w-5 h-5" />
                </button>
            </>
            )}
        </div>
      </div>
      {(notes || transaction.length > 0) && (
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
            {notes && <p className="text-sm text-gray-600 mb-2 italic">Note: {notes}</p>}
            <ul className="space-y-1">
                {transaction.map(expense => (
                <li key={expense.id} className="flex items-center text-sm">
                    <div className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: allCategoryColors[expense.category] || '#9CA3AF' }}></div>
                    <span className="text-gray-700 flex-grow">{expense.category}</span>
                    <span className="font-medium text-gray-800">{currencySymbol}{expense.amount.toFixed(2)}</span>
                </li>
                ))}
            </ul>
        </div>
      )}
    </li>
  );
};

export default TransactionItem;