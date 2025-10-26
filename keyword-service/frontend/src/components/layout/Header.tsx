import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search as SearchIcon } from 'lucide-react';
import { useAppStore } from '@/store';

export const Header: React.FC = () => {
  const { toggleSidebar } = useAppStore();

  return (
    <header className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <SearchIcon className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Keyword Research</h1>
                <p className="text-sm opacity-90">AI-Powered SEO Dashboard</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
