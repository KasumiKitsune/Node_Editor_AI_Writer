import React from 'react';
import { XIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, headerActions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
      <div 
        className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col animate-scale-in border border-slate-300/50 dark:border-slate-700/50 w-screen h-screen rounded-none md:rounded-[28px] md:w-full md:max-w-4xl md:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 truncate pr-4">{title}</h2>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {headerActions}
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="flex-grow min-h-0 p-4 md:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;