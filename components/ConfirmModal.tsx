import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onCancel, onConfirm, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] transition-opacity duration-300" onClick={onCancel}>
      <div 
        className="bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-900 dark:text-slate-100 rounded-[28px] shadow-2xl w-[90%] max-w-md flex flex-col animate-scale-in border border-slate-300/50 dark:border-slate-700/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center p-6 border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-monet-dark dark:text-blue-400">{title}</h2>
        </div>
        <div className="p-6 text-base">
          {children}
        </div>
        <div className="flex justify-end p-4 space-x-3 border-slate-200 dark:border-slate-800">
            <button
                onClick={onCancel}
                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors btn-material"
            >
                取消
            </button>
            <button
                onClick={onConfirm}
                className="px-6 py-2.5 bg-monet-dark text-white font-semibold rounded-full hover:bg-monet-dark-hover transition-colors btn-material"
            >
                确认
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;