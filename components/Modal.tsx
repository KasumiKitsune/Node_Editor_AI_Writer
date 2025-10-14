import React, { useState, useEffect, useRef } from 'react';
import { XIcon, ChevronLeftIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  hideCloseButtonOnMobile?: boolean;
  mobileFooter?: React.ReactNode;
  onBack?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, headerActions, hideCloseButtonOnMobile = false, mobileFooter, onBack }) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const isInitialRender = useRef(true);

  useEffect(() => {
    // Prevent exit animation on initial load when isOpen is false
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (!isOpen) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => setIsAnimatingOut(false), 200); // Animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(onClose, 200); // Animation duration
  };
  
  const handleBack = () => {
    if (onBack) {
      setIsAnimatingOut(true);
      setTimeout(onBack, 200);
    }
  };

  if (!isOpen && !isAnimatingOut) return null;

  return (
    <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-200 ${isOpen && !isAnimatingOut ? '' : 'opacity-0'}`} onClick={handleClose}>
      <div 
        className={`bg-monet-light dark:bg-slate-900/80 backdrop-blur-xl text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col border border-slate-300/50 dark:border-slate-700/50 w-screen h-screen rounded-none md:rounded-[28px] md:w-full md:max-w-4xl md:max-h-[90vh] ${isOpen && !isAnimatingOut ? 'animate-scale-in' : 'animate-scale-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center min-w-0">
            {onBack && (
                <button onClick={handleBack} className="mr-3 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors btn-material" title="返回">
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
            )}
            <h2 className="text-2xl font-bold text-monet-dark dark:text-blue-400 truncate">{title}</h2>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {headerActions}
            <button onClick={handleClose} className={`w-10 h-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors btn-material ${hideCloseButtonOnMobile ? 'hidden md:flex' : 'flex'}`}>
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="flex-grow min-h-0 p-4 md:p-6 overflow-y-auto">
          {children}
        </div>
        {mobileFooter && (
            <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 md:hidden">
                {mobileFooter}
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;