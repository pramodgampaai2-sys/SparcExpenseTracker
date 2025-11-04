

import React from 'react';
import type { Expense } from '../types';
import { TrashIcon, PencilIcon } from './Icons';

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (transactionId: string) => void;
  onEdit: (transactionId: string) => void;
  isConfirming: boolean;
  onSetConfirming: (transactionId: string | null) => void;
  currencySymbol: string;
  allCategoryColors: Record<string, string>;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onDelete, onEdit, isConfirming, onSetConfirming, currencySymbol, allCategoryColors }) => {
  const categoryColor = allCategoryColors[expense.category] || allCategoryColors['Other'];

  const handleDeleteClick = () => {
    onDelete(expense.transactionId);
  };
  
  const handleEditClick = () => {
    onEdit(expense.transactionId);
  };

  return (
    <li className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
      <div className="flex items-center flex-1 min-w-0">
        <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor }}></div>
        <div className="ml-4 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{expense.vendor}</p>
          <div className="flex items-baseline space-x-2 mt-1">
              <p className="font-semibold text-gray-900">{currencySymbol}{expense.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{expense.category}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center flex-shrink-0 space-x-2 pl-4">
        {isConfirming ? (
          <div className="flex items-center space-x-2 animate-fade-in">
            <button 
              onClick={() => onSetConfirming(null)} 
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded transition-colors"
              aria-label={`Cancel deletion of ${expense.vendor} expense`}
            >
              Cancel
            </button>
            <button 
              onClick={handleDeleteClick} 
              className="text-sm font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md transition-colors"
              aria-label={`Confirm deletion of ${expense.vendor} expense`}
            >
              Delete
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleEditClick}
              className="text-gray-400 hover:text-indigo-500 transition-colors p-1"
              aria-label={`Edit ${expense.vendor} expense`}
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onSetConfirming(expense.transactionId)} 
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              aria-label={`Delete ${expense.vendor} expense`}
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </li>
  );
};

export default ExpenseItem;
