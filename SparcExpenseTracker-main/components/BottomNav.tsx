import React from 'react';
import { Page } from '../constants';
import { HomeIcon, CollectionIcon } from './Icons';

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center text-sm transition-colors duration-200 ${
      isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
    }`}
  >
    {icon}
    <span className="mt-1">{label}</span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activePage, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-sm border-t border-gray-200 flex justify-around items-center max-w-lg mx-auto rounded-t-2xl shadow-lg">
      <NavItem
        label="Dashboard"
        icon={<HomeIcon className="w-6 h-6" />}
        isActive={activePage === Page.Dashboard}
        onClick={() => onNavigate(Page.Dashboard)}
      />
      <div className="w-16 h-16">{/* Spacer for central button */}</div>
      <NavItem
        label="Expenses"
        icon={<CollectionIcon className="w-6 h-6" />}
        isActive={activePage === Page.Expenses}
        onClick={() => onNavigate(Page.Expenses)}
      />
    </nav>
  );
};

export default BottomNav;