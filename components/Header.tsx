
import React from 'react';
import { UserRole } from '../types';

interface HeaderProps {
  activePage: string;
  setActivePage: (page: string) => void;
  currentUserRole: UserRole;
  userName: string;
  onLogout: () => void;
  onOpenVideoManager: () => void;
}

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage, currentUserRole, userName, onLogout, onOpenVideoManager }) => {
  
  const navItemClasses = (page: string) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
      activePage === page
        ? 'bg-slate-100 text-blue-600 font-semibold'
        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
    }`;

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-slate-900">BEEBOX LAON</span>
            <a 
              href="https://www.beeboxlaon.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors hidden sm:block"
            >
              www.beeboxlaon.com
            </a>
          </div>
          <nav className="flex items-center gap-2">
            <a onClick={() => setActivePage('boxes')} className={navItemClasses('boxes')}>Boxes</a>
            <a onClick={() => setActivePage('tenants')} className={navItemClasses('tenants')}>Locataires</a>
            <a onClick={onOpenVideoManager} className={navItemClasses('videos')}>Visites guidées</a>
            {currentUserRole === UserRole.Admin && (
              <>
                <a onClick={() => setActivePage('calendar')} className={navItemClasses('calendar')}>Historique</a>
                <a onClick={() => setActivePage('finances')} className={navItemClasses('finances')}>Finances</a>
                <a onClick={() => setActivePage('agency')} className={navItemClasses('agency')}>Agences & Agents</a>
                <a onClick={() => setActivePage('data')} className={navItemClasses('data')}>Données & Admin</a>
              </>
            )}
          </nav>
           <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600 hidden md:block">
                    Bonjour, <span className="font-bold text-slate-800">{userName}</span>
                </span>
                <button
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 hover:text-slate-900 transition-colors"
                >
                    Déconnexion
                </button>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
