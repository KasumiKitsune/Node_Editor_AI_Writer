

import React, { useState } from 'react';
import { StructuredOutline } from '../types';
import { ChevronDownIcon, ChevronUpIcon, LibraryIcon, QuestionMarkCircleIcon, PencilIcon, XIcon, PlusIcon, DocumentAddIcon } from './icons';

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
    onCancel: () => void;
}

const CoreControls: React.FC<Pick<GenerationControlsProps, 'onOpenHelp' | 'onOpenAssets' | 'targetWordCount' | 'onWordCountChange' | 'onAdjustWordCount' | 'isAnyTaskRunning'>> = ({
    onOpenHelp,
    onOpenAssets,
    targetWordCount,
    onWordCountChange,
    onAdjustWordCount,
    isAnyTaskRunning
}) => {
    const buttonClasses = "w-12 h-12 flex items-center justify-center bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors";
    return (
        <>
            <button
                onClick={onOpenHelp}
                className={`${buttonClasses} hover:text-blue-500 dark:hover:text-blue-300`}
                title="帮助与示例"
            >
                <QuestionMarkCircleIcon className="h-6 w-6" />
            </button>
            <button
                onClick={onOpenAssets}
                className={`${buttonClasses} hover:text-blue-500 dark:hover:text-blue-300`}
                title="资产库"
            >
                <LibraryIcon className="h-6 w-6" />
            </button>

            <div className="flex items-center space-x-2">
                <div className="flex items-center h-12 bg-slate-200/80 dark:bg-slate-800/80 border border-transparent rounded-full focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <label htmlFor="word-count-input" className="text-sm font-medium text-slate-600 dark:text-slate-300 pl-4">目标字数</label>
                    <input
                        id="word-count-input"
                        type="number"
                        value={targetWordCount}
                        onChange={onWordCountChange}
                        placeholder="~2000"
                        className="bg-transparent text-slate-900 dark:text-white text-sm font-semibold focus:ring-0 focus:border-transparent focus:outline-none block w-24 p-2 border-0 text-center"
                        disabled={isAnyTaskRunning}
                        step="500"
                    />
                    <div className="flex flex-col self-stretch pr-1 py-1 space-y-0.5">
                        <button onClick={() => onAdjustWordCount(500)} disabled={isAnyTaskRunning} className="px-1 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronUpIcon className="w-4 h-4" /></button>
                        <button onClick={() => onAdjustWordCount(-500)} disabled={isAnyTaskRunning} className="px-1 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full flex-1 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronDownIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </>
    );
};

const GenerateButtons: React.FC<Pick<GenerationControlsProps, 'isAnyTaskRunning' | 'outline' | 'targetWordCount' | 'onGenerateOutline' | 'onGenerateStory'>> = ({
    isAnyTaskRunning,
    outline,
    targetWordCount,
    onGenerateOutline,
    onGenerateStory
}) => {
    const targetWordCountInt = parseInt(targetWordCount, 10);
    const canGenerateStoryDirectly = !isNaN(targetWordCountInt) && targetWordCountInt > 0 && targetWordCountInt <= 2000;
    
    return (
        <>
            <button
                onClick={onGenerateOutline}
                disabled={isAnyTaskRunning}
                className="px-6 h-12 bg-blue-200 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 font-bold rounded-full hover:bg-blue-300 dark:hover:bg-blue-800 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
                生成大纲
            </button>

            <button
                onClick={onGenerateStory}
                disabled={isAnyTaskRunning || (!outline && !canGenerateStoryDirectly)}
                className="px-6 h-12 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-500 transition-colors disabled:bg-slate-500 dark:disabled:bg-slate-700 disabled:text-slate-100 dark:disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                title={!outline && canGenerateStoryDirectly ? "直接生成短篇故事" : "根据大纲生成故事"}
            >
                生成故事
            </button>
        </>
    );
};

const GenerationControls: React.FC<GenerationControlsProps> = (props) => {
    const [isMobileActionsExpanded, setMobileActionsExpanded] = useState(false);
    const { outline, targetWordCount, onGenerateOutline, onGenerateStory, isAnyTaskRunning, onCancel } = props;

    const targetWordCountInt = parseInt(targetWordCount, 10);
    const canGenerateStoryDirectly = !isNaN(targetWordCountInt) && targetWordCountInt > 0 && targetWordCountInt <= 2000;

    return (
        <>
            {/* Desktop View: One combined pill */}
            <div className="hidden md:flex absolute bottom-5 right-5 bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-3 rounded-full shadow-lg z-20 items-center gap-3 border border-slate-300/50 dark:border-slate-800/50">
                <CoreControls {...props} />
                <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
                <div className="flex items-center gap-3">
                    <GenerateButtons {...props} />
                </div>
                 {props.isAnyTaskRunning && (
                    <>
                        <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>
                        <button
                            onClick={onCancel}
                            className="px-6 h-12 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 transition-colors shadow-lg shadow-red-500/30 hover:shadow-red-500/40 flex items-center gap-2 animate-scale-in"
                        >
                            <XIcon className="h-5 w-5" />
                            <span>取消</span>
                        </button>
                    </>
                )}
            </div>

            {/* Mobile View: Stacked elements */}
            <div className="md:hidden absolute bottom-5 right-5 z-20 flex flex-col items-end gap-3">
                 {isMobileActionsExpanded && <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setMobileActionsExpanded(false)} />}
                 
                 <div className="flex flex-row items-end gap-3">
                     <div className="relative z-30 flex flex-col items-end pointer-events-auto">
                        {isMobileActionsExpanded && (
                            <div className="flex flex-col items-end gap-4 mb-4 animate-scale-in" style={{ animationDuration: '150ms' }}>
                                <div className="flex items-center gap-3">
                                    <span className="bg-slate-900/80 dark:bg-slate-200/80 text-white dark:text-black text-sm px-3 py-1.5 rounded-full shadow-md">生成故事</span>
                                    <button
                                        onClick={() => { onGenerateStory(); setMobileActionsExpanded(false); }}
                                        disabled={isAnyTaskRunning || (!outline && !canGenerateStoryDirectly)}
                                        className="w-14 h-14 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
                                        title={!outline && canGenerateStoryDirectly ? "直接生成短篇故事" : "根据大纲生成故事"}
                                    >
                                        <PencilIcon className="h-6 w-6"/>
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="bg-slate-900/80 dark:bg-slate-200/80 text-white dark:text-black text-sm px-3 py-1.5 rounded-full shadow-md">生成大纲</span>
                                    <button
                                        onClick={() => { onGenerateOutline(); setMobileActionsExpanded(false); }}
                                        disabled={isAnyTaskRunning}
                                        className="w-14 h-14 bg-blue-200 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 font-bold rounded-2xl hover:bg-blue-300 dark:hover:bg-blue-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        <DocumentAddIcon className="h-6 w-6"/>
                                    </button>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setMobileActionsExpanded(prev => !prev)}
                            className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition-all duration-300 transform hover:scale-105 pointer-events-auto"
                            aria-expanded={isMobileActionsExpanded}
                            aria-label="Toggle generation options"
                        >
                             {isMobileActionsExpanded ? (
                                <XIcon className="h-8 w-8 transition-transform duration-300" />
                            ) : (
                                <PencilIcon className="h-7 w-7 transition-transform duration-300" />
                            )}
                        </button>
                     </div>
                </div>

                 <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-3 rounded-full shadow-lg flex items-center gap-3 border border-slate-300/50 dark:border-slate-800/50 pointer-events-auto">
                    <CoreControls {...props} />
                 </div>
            </div>
        </>
    );
};

export default GenerationControls;