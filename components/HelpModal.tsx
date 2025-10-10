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

  const renderContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (!activeTabData) return null;

    return (
        <>
            <MarkdownRenderer content={activeTabData.content} />
            {activeTab !== 'manual' && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => onLoadExample(activeTab as ExampleName)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors"
                    >
                        <UploadIcon className="h-5 w-5 mr-2" />
                        加载此示例到画布
                    </button>
                </div>
            )}
        </>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="帮助与示例">
      <div className="flex flex-col md:flex-row max-h-[75vh]">
        <div className="flex-shrink-0 md:w-48 mb-4 md:mb-0 md:mr-6">
          <ul className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 overflow-x-auto md:overflow-x-visible">
            {tabs.map(tab => (
              <li key={tab.id} className="flex-shrink-0">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-grow bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-y-auto border border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="flex-grow">
            {renderContent()}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;
