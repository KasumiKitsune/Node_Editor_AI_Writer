import React, { useState } from 'react';
import Modal from './Modal';
import MarkdownRenderer from './MarkdownRenderer';
import { MANUAL_CONTENT, GENERAL_EXAMPLE_CONTENT, EXPANSION_EXAMPLE_CONTENT, REWRITE_EXAMPLE_CONTENT } from '../helpContent';
import { UploadIcon } from './icons';

export type ExampleName = 'general' | 'expand' | 'rewrite';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExample: (exampleName: ExampleName) => void;
}

type Tab = 'manual' | ExampleName;

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onLoadExample }) => {
  const [activeTab, setActiveTab] = useState<Tab>('manual');

  const tabs: { id: Tab; label: string; content: string }[] = [
    { id: 'manual', label: '使用说明', content: MANUAL_CONTENT },
    { id: 'general', label: '通用示例', content: GENERAL_EXAMPLE_CONTENT },
    { id: 'expand', label: 'AI 扩展示例', content: EXPANSION_EXAMPLE_CONTENT },
    { id: 'rewrite', label: '改写作品示例', content: REWRITE_EXAMPLE_CONTENT },
  ];
  
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="帮助与示例">
      <div className="flex flex-col md:flex-row max-h-[75vh]">
        <div className="flex-shrink-0 md:w-52 mb-6 md:mb-0 md:mr-8">
          <ul className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible mobile-tab-scroll">
            {tabs.map(tab => (
              <li key={tab.id} className="flex-shrink-0">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:flex-grow bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
            <div className="flex-grow overflow-y-auto">
                {activeTabData && <MarkdownRenderer content={activeTabData.content} />}
                {activeTab !== 'manual' && (
                    <div className="hidden md:block mt-8 text-center">
                        <button
                            onClick={() => onLoadExample(activeTab as ExampleName)}
                            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-500 transition-colors shadow-lg hover:shadow-emerald-500/30"
                        >
                            <UploadIcon className="h-5 w-5 mr-2" />
                            加载此示例到画布
                        </button>
                    </div>
                )}
            </div>

            {activeTab !== 'manual' && (
                <div className="block md:hidden flex-shrink-0 mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-center">
                        <button
                            onClick={() => onLoadExample(activeTab as ExampleName)}
                            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-500 transition-colors shadow-lg hover:shadow-emerald-500/30"
                        >
                            <UploadIcon className="h-5 w-5 mr-2" />
                            加载此示例到画布
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
       <style>{`
        .mobile-tab-scroll::-webkit-scrollbar {
          display: none;
        }
        .mobile-tab-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Modal>
  );
};

export default HelpModal;