
import React, { useState, useMemo, useRef } from 'react';
import type { Currency, Expense, CustomCategory, CategoryDefinition } from '../types';
import { CURRENCIES } from '../currencies';
import { SearchIcon, CheckIcon, DownloadIcon, UploadIcon, ChevronLeftIcon, BanknotesIcon, TagIcon, ChevronRightIcon } from './Icons';
import CategoryManager from './CategoryManager';
import { CATEGORIES, CATEGORY_COLORS } from '../constants';

interface SettingsProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  expenses: Expense[];
  onExpensesChange: (expenses: Expense[]) => void;
  categories: CategoryDefinition[];
  onCategoriesChange: (categories: CategoryDefinition[]) => void;
}

const SettingsTile: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ title, description, icon, onClick }) => (
  <button
    onClick={onClick}
    className="w-full bg-white p-4 rounded-xl shadow-md text-left flex items-center space-x-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-grow">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
  </button>
);


const Settings: React.FC<SettingsProps> = (props) => {
  const { 
    selectedCurrency, 
    onCurrencyChange, 
    expenses, 
    onExpensesChange,
    categories,
    onCategoriesChange
  } = props;

  const [view, setView] = useState<'main' | 'currency' | 'categories'>('main');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCurrencies = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    if (!lowercasedTerm) {
      return CURRENCIES;
    }
    return CURRENCIES.filter(
      (currency) =>
        currency.name.toLowerCase().includes(lowercasedTerm) ||
        currency.code.toLowerCase().includes(lowercasedTerm)
    );
  }, [searchTerm]);

  const handleBackup = () => {
    try {
      const dataToBackup = {
        version: 3, // Version incremented for split expense support
        expenses,
        currency: selectedCurrency,
        categories,
      };
      const jsonString = JSON.stringify(dataToBackup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.download = `sparc-expenses-backup-${date}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to create backup:", error);
      alert("An error occurred while creating the backup file.");
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not readable text.");
        
        const parsedData = JSON.parse(text);
        if (!parsedData || !Array.isArray(parsedData.expenses) || !parsedData.currency?.code) {
           throw new Error("Invalid backup file format.");
        }

        if (window.confirm("Are you sure you want to restore? This will overwrite all your current data.")) {
          let expensesToRestore = parsedData.expenses as Expense[];
          
          // Migration for older backup versions
          if (!parsedData.version || parsedData.version < 3) {
             expensesToRestore = expensesToRestore.map(exp => ({
                ...exp,
                transactionId: exp.transactionId || exp.id // Add transactionId if missing
             }));
          }
          
          onExpensesChange(expensesToRestore);
          onCurrencyChange(parsedData.currency);
          
          if (parsedData.categories) {
            onCategoriesChange(parsedData.categories);
          } else if (parsedData.customCategories) { // Backward compatibility for v1 backups
            const defaults = CATEGORIES.map(name => ({ name, color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS], isDefault: true }));
            const defaultNames = new Set(defaults.map(d => d.name));
            const newCustom = (parsedData.customCategories as CustomCategory[])
                .filter(c => !defaultNames.has(c.name))
                .map(c => ({...c, isDefault: false}));
            onCategoriesChange([...defaults, ...newCustom]);
          }

          alert("Data restored successfully!");
        }
      } catch (error) {
        console.error("Failed to restore data:", error);
        alert(`Failed to restore data. Please make sure you select a valid backup file.\nError: ${(error as Error).message}`);
      } finally {
         if(event.target) event.target.value = '';
      }
    };
    reader.onerror = () => {
        alert("Failed to read the file.");
         if(event.target) event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleBack = () => setView('main');

  if (view === 'currency') {
    return (
      <div className="space-y-4 animate-fade-in">
        <header className="flex items-center">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            aria-label="Back to settings"
          >
            <ChevronLeftIcon className="w-7 h-7" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">Currency</h1>
        </header>
        <div className="bg-white p-4 rounded-xl shadow-md">
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2"
              placeholder="Search currency"
              aria-label="Search currency"
            />
          </div>
          <div className="h-96 overflow-y-auto border rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredCurrencies.length > 0 ? (
                filteredCurrencies.map((currency) => (
                  <li key={currency.code}>
                    <button
                      onClick={() => onCurrencyChange(currency)}
                      className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-50 transition-colors"
                      aria-pressed={selectedCurrency.code === currency.code}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{currency.name}</p>
                        <p className="text-sm text-gray-500">{currency.code}</p>
                      </div>
                      <div className="flex items-center">
                         <span className="text-lg font-semibold text-indigo-600 mr-4">{currency.symbol}</span>
                         {selectedCurrency.code === currency.code && (
                           <CheckIcon className="w-6 h-6 text-indigo-600" />
                         )}
                      </div>
                    </button>
                  </li>
                ))
              ) : (
                  <li className="p-4 text-center text-gray-500">No currencies found.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'categories') {
    return (
      <div className="space-y-4 animate-fade-in">
        <header className="flex items-center">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            aria-label="Back to settings"
          >
            <ChevronLeftIcon className="w-7 h-7" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 ml-2">Manage Categories</h1>
        </header>
        <CategoryManager {...props} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Customize your app experience.</p>
      </header>

      <div className="space-y-4">
        <SettingsTile
          title="Currency"
          description={`Set your default currency (${selectedCurrency.code})`}
          icon={<BanknotesIcon className="w-6 h-6" />}
          onClick={() => setView('currency')}
        />
        <SettingsTile
          title="Manage Categories"
          description="Add, edit, or delete expense categories"
          icon={<TagIcon className="w-6 h-6" />}
          onClick={() => setView('categories')}
        />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Data Management</h2>
        <p className="text-sm text-gray-500 mb-4">Save your data to a file or restore it from a backup.</p>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleBackup}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
            >
              <DownloadIcon className="w-5 h-5 mr-2" />
              Backup Data
            </button>
            <button
              onClick={handleRestoreClick}
              className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <UploadIcon className="w-5 h-5 mr-2" />
              Restore Data
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="application/json,.json"
              className="hidden"
              aria-hidden="true"
            />
        </div>
      </div>
    </div>
  );
};

export default Settings;