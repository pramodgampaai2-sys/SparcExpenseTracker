
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Expense, CategoryDefinition } from '../types';
import { PencilIcon, TrashIcon, PlusIcon, CheckIcon, XIcon } from './Icons';

interface CategoryManagerProps {
  expenses: Expense[];
  onExpensesChange: (expenses: Expense[]) => void;
  categories: CategoryDefinition[];
  onCategoriesChange: (categories: CategoryDefinition[]) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ expenses, onExpensesChange, categories, onCategoriesChange }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: '', color: '#9CA3AF' });
  const [error, setError] = useState<string | null>(null);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  
  const allCategoryNames = useMemo(() => 
    categories.map(c => c.name), 
    [categories]
  );

  useEffect(() => {
    if (isAdding && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isAdding]);
  
  const handleAddNewClick = () => {
    // Generate a random, pleasant color for the new category
    const randomColor = '#' + ('000000' + Math.floor(Math.random()*16777215).toString(16)).slice(-6);
    setFormState({ name: '', color: randomColor });
    setEditingCatName(null);
    setIsAdding(true);
    setError(null);
  };
  
  const handleEditClick = (category: CategoryDefinition) => {
    setFormState({ name: category.name, color: category.color });
    setEditingCatName(category.name);
    setIsAdding(false);
    setError(null);
  };
  
  const handleCancel = () => {
    setIsAdding(false);
    setEditingCatName(null);
    setError(null);
  };

  const validateName = (name: string, originalName?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return "Category name cannot be empty.";
    }
    const isDuplicate = allCategoryNames.some(
      catName => catName.toLowerCase() === trimmedName.toLowerCase() && catName.toLowerCase() !== originalName?.toLowerCase()
    );
    if (isDuplicate) {
      return "This category name already exists.";
    }
    return null;
  };

  const handleSave = () => {
    const validationError = validateName(formState.name, editingCatName ?? undefined);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedName = formState.name.trim();

    if (isAdding) {
      onCategoriesChange([...categories, { name: trimmedName, color: formState.color, isDefault: false }]);
    } else if (editingCatName) {
      // Update expenses if name changed
      if (editingCatName.toLowerCase() !== trimmedName.toLowerCase()) {
        onExpensesChange(
          expenses.map(exp => exp.category === editingCatName ? { ...exp, category: trimmedName } : exp)
        );
      }
      // Update category list
      onCategoriesChange(
        categories.map(cat => cat.name === editingCatName ? { ...cat, name: trimmedName, color: formState.color } : cat)
      );
    }
    handleCancel();
  };
  
  const handleDelete = (name: string) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" category? All associated expenses will be moved to "Other".`)) {
        onExpensesChange(
            expenses.map(exp => exp.category === name ? { ...exp, category: 'Other' } : exp)
        );
        onCategoriesChange(categories.filter(cat => cat.name !== name));
    }
  };

  const renderCategoryItem = (category: CategoryDefinition) => {
    const { name, color, isDefault } = category;
    const isEditingThis = editingCatName === name;
    
    if (isEditingThis) {
      return (
        <li key={`${name}-editing`} className="p-3 bg-indigo-50 rounded-lg animate-fade-in">
          <div className="flex items-center space-x-3">
            <input type="color" value={formState.color} onChange={e => setFormState({...formState, color: e.target.value})} className="h-8 w-10 p-0.5 border-none rounded" aria-label="Choose category color" />
            <input 
              type="text" 
              value={formState.name} 
              onChange={e => setFormState({...formState, name: e.target.value})} 
              className="flex-grow px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100" 
              disabled={name === 'Other'}
              aria-label="Category name"
            />
            <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800" aria-label="Save changes"><CheckIcon className="w-6 h-6" /></button>
            <button onClick={handleCancel} className="p-1 text-red-500 hover:text-red-700" aria-label="Cancel editing"><XIcon className="w-6 h-6" /></button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2 ml-12">{error}</p>}
          {name === 'Other' && <p className="text-xs text-gray-500 mt-2 ml-12">The 'Other' category cannot be renamed.</p>}
        </li>
      );
    }

    return (
      <li key={name} className="flex items-center justify-between p-3">
        <div className="flex items-center">
          <div className="w-5 h-5 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: color }}></div>
          <span>{name}</span>
        </div>
        <div className="space-x-3 flex-shrink-0">
          <button onClick={() => handleEditClick(category)} className="text-gray-400 hover:text-indigo-500" aria-label={`Edit ${name} category`}><PencilIcon className="w-5 h-5" /></button>
          {!isDefault && name !== 'Other' && (
            <button onClick={() => handleDelete(name)} className="text-gray-400 hover:text-red-500" aria-label={`Delete ${name} category`}><TrashIcon className="w-5 h-5" /></button>
          )}
        </div>
      </li>
    );
  };
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Manage Categories</h2>
      <div className="h-64 overflow-y-auto border rounded-md">
        <ul className="divide-y divide-gray-200">
          {categories
            .slice()
            .sort((a,b) => {
              if (a.isDefault && !b.isDefault) return -1;
              if (!a.isDefault && b.isDefault) return 1;
              return a.name.localeCompare(b.name);
            })
            .map(cat => renderCategoryItem(cat))
          }
          {isAdding && (
             <li className="p-3 bg-indigo-50 rounded-lg animate-fade-in">
                <div className="flex items-center space-x-3">
                    <input type="color" value={formState.color} onChange={e => setFormState({...formState, color: e.target.value})} className="h-8 w-10 p-0.5 border-none rounded" aria-label="Choose new category color" />
                    <input ref={newCategoryInputRef} type="text" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} className="flex-grow px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="New category name" aria-label="New category name" />
                    <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800" aria-label="Save new category"><CheckIcon className="w-6 h-6" /></button>
                    <button onClick={handleCancel} className="p-1 text-red-500 hover:text-red-700" aria-label="Cancel adding category"><XIcon className="w-6 h-6" /></button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2 ml-12">{error}</p>}
             </li>
          )}
        </ul>
      </div>
       {!isAdding && !editingCatName && (
        <button
            onClick={handleAddNewClick}
            className="w-full flex items-center justify-center mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
        >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add New Category
        </button>
       )}
    </div>
  );
};

export default CategoryManager;
