import React from 'react';
import { TrashIcon, DownloadIcon, UploadIcon, SunIcon, MoonIcon, CustomSelect, CustomSelectOption } from './icons';

interface ToolbarProps {
  language: string;
  setLanguage: (lang: string) => void;
  model: string;
  setModel: (model: string) => void;
  isGenerating: boolean;
  onClearAllNodes: () => void;
  onImportNodes: () => void;
  onExportNodes: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  language,
  setLanguage,
  model,
  setModel,
  isGenerating,
  onClearAllNodes,
  onImportNodes,
  onExportNodes,
  theme,
  setTheme
}) => {

  const languageOptions: CustomSelectOption[] = [
    { value: '中文', label: '中文' },
    { value: 'English', label: 'English' },
    { value: '日本語', label: '日本語' },
    { value: 'Français', label: 'Français' },
    { value: 'Español', label: 'Español' },
  ];

  // FIX: Updated model name 'gemini-flash-latest' to 'gemini-2.5-flash' to conform to API guidelines.
  const modelOptions: CustomSelectOption[] = [
    { value: 'gemini-2.5-flash-no-thinking', label: '快速' },
    { value: 'gemini-flash-latest', label: '均衡' },
    { value: 'gemini-2.5-pro', label: '高质量' },
  ];
  
  return (
    <div className="absolute top-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg z-20 flex flex-wrap items-center gap-2 md:gap-4 border border-gray-200 dark:border-gray-700">
        <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-yellow-500 dark:hover:text-yellow-300 transition-colors flex items-center"
            title="切换主题"
        >
            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
        </button>
        <button
            onClick={onImportNodes}
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center"
            title="导入节点"
        >
            <UploadIcon className="h-5 w-5" />
        </button>
        <button
            onClick={onExportNodes}
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center"
            title="导出节点"
        >
            <DownloadIcon className="h-5 w-5" />
        </button>
         <button
            onClick={onClearAllNodes}
            className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center"
            title="清除所有节点"
        >
            <TrashIcon className="h-5 w-5" />
        </button>

      <div className="flex items-center space-x-2 w-32">
        <label htmlFor="language-select" className="text-sm font-medium text-gray-600 dark:text-gray-300 sr-only">写作语言:</label>
        <CustomSelect
          id="language-select"
          options={languageOptions}
          value={language}
          onChange={setLanguage}
          disabled={isGenerating}
        />
      </div>

      <div className="flex items-center space-x-2 w-40">
        <label htmlFor="model-select" className="text-sm font-medium text-gray-600 dark:text-gray-300 sr-only">AI 模型:</label>
        <CustomSelect
          id="model-select"
          options={modelOptions}
          value={model}
          onChange={setModel}
          disabled={isGenerating}
        />
      </div>
    </div>
  );
};

export default Toolbar;