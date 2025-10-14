import React from 'react';
import { LibraryIcon, LayoutIcon, ArchiveIcon } from './icons';

export type MobileView = 'library' | 'workspace' | 'assets';

interface BottomNavBarProps {
    activeView: MobileView;
    setActiveView: (view: MobileView) => void;
    trayCount: number;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeView, setActiveView, trayCount }) => {
    const navItems: { id: MobileView; label: string; icon: React.FC<any>; count?: number }[] = [
        { id: 'library', label: '节点库', icon: LibraryIcon, count: trayCount },
        { id: 'workspace', label: '工作区', icon: LayoutIcon },
        { id: 'assets', label: '资产库', icon: ArchiveIcon },
    ];

    return (
        <nav className="flex-shrink-0 bg-slate-200/70 dark:bg-slate-900/70 backdrop-blur-xl border-t border-slate-300/50 dark:border-slate-800/50 flex justify-around items-stretch h-20">
            {navItems.map(item => {
                const isActive = activeView === item.id;
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium relative transition-colors duration-300 btn-material ${
                            isActive
                                ? 'text-monet-dark dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {item.count !== undefined && item.count > 0 && (
                            <span className="absolute top-2 right-[20%] bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-900">
                                {item.count}
                            </span>
                        )}
                        <Icon className="h-6 w-6" />
                        <span>{item.label}</span>
                        {isActive && (
                             <div className="absolute bottom-1.5 h-1 w-8 bg-monet-dark dark:bg-blue-400 rounded-full" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNavBar;
