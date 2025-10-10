import React from 'react';
import { TrashIcon, DownloadIcon, UploadIcon, SunIcon, MoonIcon } from './icons';

interface ToolbarProps {
  language: string;
  setLanguage: (lang: string) => void;
  model: string;
  setModel: (model: string) => void;
  generatingTask: 'outline' | 'story' | null;
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
  generatingTask,
  onClearAllNodes,
  onImportNodes,
  onExportNodes,
  theme,
  setTheme
}) => {
  const isGenerating = !!generatingTask;
  
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

      <div className="flex items-center space-x-2">
        <label htmlFor="language-select" className="text-sm font-medium text-gray-600 dark:text-gray-300">写作语言:</label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2 transition-colors"
          disabled={isGenerating}
        >
          <option value="中文">中文</option>
          <option value="English">English</option>
          <option value="日本語">日本語</option>
          <option value="Français">Français</option>
          <option value="Español">Español</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <label htmlFor="model-select" className="text-sm font-medium text-gray-600 dark:text-gray-300">AI 模型:</label>
        <select
          id="model-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2 transition-colors"
          disabled={isGenerating}
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>
    </div>
  );
};

export default Toolbar;