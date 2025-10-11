import React from 'react';
import { StructuredOutline } from '../types';
import { ChevronDownIcon, ChevronUpIcon, LibraryIcon, QuestionMarkCircleIcon } from './icons';

interface GenerationControlsProps {
    isAnyTaskRunning: boolean;
    outline: StructuredOutline | null;
    targetWordCount: string;
    onWordCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAdjustWordCount: (amount: number) => void;
    onGenerateOutline: () => void;
    onGenerateStory: () => void;
    onOpenHelp: () => void;
    onOpenAssets: () => void;
}

const GenerationControls: React.FC<GenerationControlsProps> = ({
    isAnyTaskRunning,
    outline,
    targetWordCount,
    onWordCountChange,
    onAdjustWordCount,
    onGenerateOutline,
    onGenerateStory,
    onOpenHelp,
    onOpenAssets
}) => {
    const targetWordCountInt = parseInt(targetWordCount, 10);
    const canGenerateStoryDirectly = !isNaN(targetWordCountInt) && targetWordCountInt > 0 && targetWordCountInt <= 2000;

    return (
        <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg z-20 flex flex-wrap items-center gap-2 md:gap-4 border border-gray-200 dark:border-gray-700">
            <button
                onClick={onOpenHelp}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-colors flex items-center font-semibold"
                title="帮助与示例"
            >
                <QuestionMarkCircleIcon className="h-5 w-5" />
            </button>
            <button
                onClick={onOpenAssets}
                className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 transition-colors flex items-center font-semibold"
                title="资产库"
            >
                <LibraryIcon className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-2">
                <label htmlFor="word-count-input" className="text-sm font-medium text-gray-600 dark:text-gray-300">目标字数:</label>
                <div className="flex items-center bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:ring-2 focus-within:ring-cyan-500 transition-all">
                    <input
                        id="word-count-input"
                        type="number"
                        value={targetWordCount}
                        onChange={onWordCountChange}
                        placeholder="约 2000"
                        className="bg-transparent text-gray-900 dark:text-white text-sm focus:ring-0 focus:border-transparent block w-24 p-2 border-0"
                        disabled={isAnyTaskRunning}
                        step="500"
                    />
                    <div className="flex flex-col border-l border-gray-300 dark:border-gray-600 self-stretch">
                        <button onClick={() => onAdjustWordCount(500)} disabled={isAnyTaskRunning} className="px-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-tr-md flex-1 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronUpIcon className="w-4 h-4" /></button>
                        <button onClick={() => onAdjustWordCount(-500)} disabled={isAnyTaskRunning} className="px-1 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-br-md border-t border-gray-300 dark:border-gray-600 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronDownIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            <button
                onClick={onGenerateOutline}
                disabled={isAnyTaskRunning}
                className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
            >
                生成大纲
            </button>

            <button
                onClick={onGenerateStory}
                disabled={isAnyTaskRunning || (!outline && !canGenerateStoryDirectly)}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
                title={!outline && canGenerateStoryDirectly ? "直接生成短篇故事" : "根据大纲生成故事"}
            >
                生成故事
            </button>
        </div>
    );
};

export default GenerationControls;
