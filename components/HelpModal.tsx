import React, { useState } from 'react';
import Modal from './Modal';
import MarkdownRenderer from './MarkdownRenderer';
import { MANUAL_CONTENT, GENERAL_EXAMPLE_CONTENT, EXPANSION_EXAMPLE_CONTENT, REWRITE_EXAMPLE_CONTENT, ASSISTANT_EXAMPLE_CONTENT, CONTINUATION_EXAMPLE_CONTENT, PARODY_EXAMPLE_CONTENT } from '../helpContent';
import { UploadIcon } from './icons';

export type ExampleName = 'general' | 'expand' | 'rewrite' | 'assistant' | 'continuation' | 'parody';

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
    { id: 'general', label: '文学叙事示例', content: GENERAL_EXAMPLE_CONTENT },
    { id: 'expand', label: 'AI 概念扩展', content: EXPANSION_EXAMPLE_CONTENT },
    { id: 'rewrite', label: 'AI 重塑故事', content: REWRITE_EXAMPLE_CONTENT },
    { id: 'assistant', label: 'AI 助手交互', content: ASSISTANT_EXAMPLE_CONTENT },
    { id: 'continuation', label: 'AI 文本续写', content: CONTINUATION_EXAMPLE_CONTENT },
    { id: 'parody', label: 'AI 风格仿写', content: PARODY_EXAMPLE_CONTENT },
  ];
  
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (!isOpen) return null;

  const mobileFooter = (
    <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors btn-material">
            返回
        </button>
        {activeTab !== 'manual' && (
            <button
                onClick={() => onLoadExample(activeTab as ExampleName)}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-500 transition-colors shadow-lg btn-material"
            >
                <UploadIcon className="h-5 w-5 mr-2" />
                加载示例
            </button>
        )}
    </div>
  );


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="帮助与示例" hideCloseButtonOnMobile mobileFooter={mobileFooter}>
      <div className="flex flex-col md:flex-row max-h-[75vh]">
        <div className="flex-shrink-0 md:w-52 mb-6 md:mb-0 md:mr-8">
          <ul className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible mobile-tab-scroll">
            {tabs.map(tab => (
              <li key={tab.id} className="flex-shrink-0">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-full text-sm font-medium transition-all duration-300 btn-material ${
                    activeTab === tab.id
                      ? 'bg-monet-dark text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-monet-medium dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:flex-grow bg-monet-medium/30 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
            <div className="flex-grow overflow-y-auto">
                {activeTabData && <MarkdownRenderer content={activeTabData.content} />}
                {activeTab !== 'manual' && (
                    <div className="hidden md:block mt-8 text-center">
                        <button
                            onClick={() => onLoadExample(activeTab as ExampleName)}
                            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-500 transition-colors shadow-lg hover:shadow-emerald-500/30 btn-material"
                        >
                            <UploadIcon className="h-5 w-5 mr-2" />
                            加载此示例到画布
                        </button>
                    </div>
                )}
            </div>
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
