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
        className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
        <div className="flex justify-end p-4 space-x-3 border-t border-gray-200 dark:border-gray-700">
            <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
                取消
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors"
            >
                确认
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;