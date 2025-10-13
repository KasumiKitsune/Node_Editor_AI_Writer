import React, { useMemo, useState, useEffect, useRef } from 'react';
import Modal from './Modal';
// FIX: Added default import for MarkdownRenderer to resolve reference error.
import MarkdownRenderer, { renderLineWithInlineFormatting } from './MarkdownRenderer';
import { StructuredOutline, Chapter } from '../types';
import { CopyIcon, DownloadIcon, UndoIcon, RedoIcon, EyeIcon, CompareIcon, ChevronDownIcon, SendIcon } from './icons';

interface Heading {
  id: string;
  text: string;
  level: number;
}

// Simple LCS-based diff implementation for line-by-line comparison
type DiffResult = { line: string; type: 'added' | 'removed' | 'common' };
const diffLines = (oldStr: string, newStr: string): DiffResult[] => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const dp = Array(oldLines.length + 1).fill(0).map(() => Array(newLines.length + 1).fill(0));

    for (let i = 1; i <= oldLines.length; i++) {
        for (let j = 1; j <= newLines.length; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const result: DiffResult[] = [];
    let i = oldLines.length, j = newLines.length;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            result.unshift({ line: oldLines[i - 1], type: 'common' });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ line: newLines[j - 1], type: 'added' });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            result.unshift({ line: oldLines[i - 1], type: 'removed' });
            i--;
        } else {
            break;
        }
    }
    return result;
};


interface ResultModalsProps {
    modalContent: 'outline' | 'story' | null;
    outline: StructuredOutline | null;
    previousOutline: StructuredOutline | null;
    story: string;
    previousStory: string | null;
    storyHeadings: Heading[];
    storyContentRef: React.RefObject<HTMLDivElement>;
    isAnyTaskRunning: boolean;
    activeProgressTask: string | null;
    progress: number;
    revisionPrompt: string;
    onRevisionPromptChange: (value: string) => void;
    onRevise: () => void;
    isRevising: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
    onBack?: () => void;
    onGenerateStory: () => void;
    onCopy: (content: string) => void;
    onDownload: (type: 'outline' | 'story', format: 'txt' | 'json' | 'md' | 'docx') => void;
    onTocClick: (id: string) => void;
    onHeadingsParse: (headings: Heading[]) => void;
}

interface DownloadDropdownProps {
    assetType: 'outline' | 'story';
    onSelectFormat: (format: any) => void;
}

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({ assetType, onSelectFormat }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = assetType === 'outline'
        ? [{ label: '纯文本 (.txt)', format: 'txt' }, { label: '源数据 (.json)', format: 'json' }]
        : [{ label: '纯文本 (.txt)', format: 'txt' }, { label: 'Markdown (.md)', format: 'md' }, { label: 'Word (.docx)', format: 'docx' }];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                title="下载"
            >
                <DownloadIcon className="h-5 w-5" />
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full right-0 mt-2 w-48 bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 animate-scale-in" style={{ animationDuration: '150ms' }}>
                    <ul className="p-2 space-y-1">
                        {options.map(option => (
                            <li
                                key={option.format}
                                onClick={() => { onSelectFormat(option.format); setIsOpen(false); }}
                                className="px-3 py-2 text-sm rounded-xl cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {option.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const PieChartProgress: React.FC<{ progress: number }> = ({ progress }) => {
    const size = 24;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            <circle
                className="stroke-current opacity-30"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
            />
            <circle
                className="stroke-current"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                style={{ transition: 'stroke-dashoffset 0.3s ease-in-out' }}
            />
        </svg>
    );
};

const ResultModals: React.FC<ResultModalsProps> = ({
    modalContent,
    outline,
    previousOutline,
    story,
    previousStory,
    storyHeadings,
    storyContentRef,
    isAnyTaskRunning,
    activeProgressTask,
    progress,
    revisionPrompt,
    onRevisionPromptChange,
    onRevise,
    isRevising,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClose,
    onBack,
    onGenerateStory,
    onCopy,
    onDownload,
    onTocClick,
    onHeadingsParse
}) => {
    
    const [viewMode, setViewMode] = useState<'diff' | 'read'>('read');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto'; // Reset height to recalculate
            const scrollHeight = ta.scrollHeight;
            ta.style.height = `${scrollHeight}px`;
        }
    }, [revisionPrompt]); // Rerun when text changes
    
    useEffect(() => {
        if ((modalContent === 'outline' && previousOutline) || (modalContent === 'story' && previousStory)) {
            setViewMode('diff');
        } else {
            setViewMode('read');
        }
    }, [modalContent, previousOutline, previousStory]);

    const showDiff = viewMode === 'diff';
    const hasPreviousVersion = !!previousOutline || !!previousStory;

    const StoryDiffView: React.FC<{ oldText: string, newText: string }> = ({ oldText, newText }) => {
        const diffResult = useMemo(() => diffLines(oldText, newText), [oldText, newText]);

        return (
            <div className="font-mono text-sm">
                {diffResult.map((item, index) => {
                    const baseClasses = 'px-4 py-0.5 whitespace-pre-wrap relative';
                    let classes = baseClasses;
                    let sign = ' ';
                    if (item.type === 'added') {
                        classes += ' bg-green-200/40 dark:bg-green-900/40';
                        sign = '+';
                    } else if (item.type === 'removed') {
                        classes += ' bg-red-200/40 dark:bg-red-900/40 line-through';
                        sign = '-';
                    }
                    return (
                        <div key={index} className={classes}>
                           <span className="select-none absolute left-0 w-8 text-center opacity-50">{sign}</span>
                           <span className="ml-4">{renderLineWithInlineFormatting(item.line)}</span>
                        </div>
                    );
                })}
            </div>
        );
    };
    
    const getHighlightClass = (isChanged: boolean) => (showDiff && isChanged) ? 'bg-amber-200/50 dark:bg-amber-400/20 p-1 -m-1 rounded-md' : '';

    const modalHeaderActions = (
        <div className="flex items-center space-x-2">
            <button onClick={() => onCopy(modalContent === 'outline' ? JSON.stringify(outline, null, 2) : story)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors" title="复制"><CopyIcon className="h-5 w-5"/></button>
            <DownloadDropdown assetType={modalContent!} onSelectFormat={(format) => onDownload(modalContent!, format as any)} />
        </div>
    );

    const renderActionButtons = () => (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-1">
                        <button onClick={onUndo} disabled={!canUndo || isRevising} className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" title="撤销"><UndoIcon className="h-5 w-5"/></button>
                        <button onClick={onRedo} disabled={!canRedo || isRevising} className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" title="重做"><RedoIcon className="h-5 w-5"/></button>
                        <button onClick={() => setViewMode(v => v === 'diff' ? 'read' : 'diff')} disabled={!hasPreviousVersion} className="p-3 bg-slate-200 dark:bg-slate-800 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" title={viewMode === 'diff' ? '阅读视图' : '对比视图'}>
                            {viewMode === 'diff' ? <EyeIcon className="h-5 w-5"/> : <CompareIcon className="h-5 w-5"/>}
                        </button>
                    </div>

                    {modalContent === 'outline' && (
                        <button 
                            onClick={onGenerateStory}
                            disabled={isAnyTaskRunning || !outline}
                            className="px-6 h-12 bg-emerald-600 text-white font-bold rounded-full hover:bg-emerald-500 transition-colors disabled:bg-slate-500 dark:disabled:bg-slate-700 disabled:text-slate-100 dark:disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                        >
                            {activeProgressTask === 'story' ? '生成中...' : '开始创作'}
                        </button>
                    )}
                </div>
                
                <div className="relative w-full bg-slate-200 dark:bg-slate-800 rounded-[28px] transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/80">
                    <textarea
                        ref={textareaRef}
                        id="revision-prompt"
                        value={revisionPrompt}
                        onChange={(e) => onRevisionPromptChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRevise(); } }}
                        placeholder="迭代修改需求 (Ctrl+Enter 发送)"
                        className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-base border-none focus:outline-none focus:ring-0 disabled:bg-transparent placeholder-slate-500 dark:placeholder-slate-400 resize-none overflow-y-hidden p-4 pr-28 box-border"
                        disabled={isRevising}
                        rows={1}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <button
                            onClick={onRevise}
                            disabled={isRevising || !revisionPrompt.trim()}
                            className={`h-11 bg-purple-600 text-white font-semibold rounded-full hover:bg-purple-500 transition-all duration-200 disabled:bg-slate-500 dark:disabled:bg-slate-600 flex items-center justify-center flex-shrink-0 transform disabled:scale-100 ${
                                isRevising ? 'w-11' : 'px-6 hover:scale-105'
                            }`}
                            aria-label="发送修改"
                        >
                            {isRevising ? (
                                <PieChartProgress progress={progress} />
                            ) : (
                                <span>发送</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Modal isOpen={modalContent === 'outline' && !!outline} onClose={onClose} onBack={onBack} title={`故事大纲: ${outline?.title || ''}`} headerActions={modalHeaderActions}>
                <div className="w-full h-full flex flex-col">
                    <div className="flex-grow min-h-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-6">
                            {outline?.segments.map((segment, index) => {
                                const prevSegment = previousOutline?.segments.find(s => s.segment_title === segment.segment_title);
                                const isNewSegment = !prevSegment;
                                const titleChanged = !isNewSegment && segment.segment_title !== prevSegment.segment_title;
                                const wordCountChanged = !isNewSegment && segment.estimated_word_count !== prevSegment.estimated_word_count;

                                return (
                                <div key={index} className={`p-4 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 ${showDiff && isNewSegment ? 'border-green-500/50' : ''}`}>
                                    <h3 className={`text-xl font-bold text-blue-600 dark:text-blue-400 mb-3 border-b border-blue-500/20 pb-2 ${getHighlightClass(titleChanged)}`}>
                                        {segment.chapters ? `第 ${index + 1} 部分: ` : ''}{segment.segment_title}
                                        <span className={`text-sm font-normal text-slate-500 dark:text-slate-400 ml-3 ${getHighlightClass(wordCountChanged)}`}>(预计 {segment.estimated_word_count} 字)</span>
                                    </h3>
                                    <div className="space-y-4 pl-4">
                                        {segment.chapters ? (
                                            segment.chapters.map(chapter => {
                                                const prevChapter = prevSegment?.chapters?.find(c => c.chapter_number === chapter.chapter_number);
                                                const isNewChapter = !prevChapter;
                                                const titleChanged = !isNewChapter && chapter.chapter_title !== prevChapter?.chapter_title;
                                                const eventsChanged = !isNewChapter && JSON.stringify(chapter.key_events) !== JSON.stringify(prevChapter?.key_events);

                                                return (
                                                <div key={chapter.chapter_number} className={showDiff && isNewChapter ? 'p-2 -m-2 bg-green-200/20 dark:bg-green-900/20 rounded-md' : ''}>
                                                    <h4 className={`font-semibold text-slate-800 dark:text-slate-200 ${getHighlightClass(titleChanged)}`}>{`第 ${chapter.chapter_number} 章: ${chapter.chapter_title}`}</h4>
                                                    {(chapter.point_of_view || chapter.setting) && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-1">
                                                        {chapter.point_of_view && `视角: ${chapter.point_of_view}`}
                                                        {chapter.point_of_view && chapter.setting && ' | '}
                                                        {chapter.setting && `场景: ${chapter.setting}`}
                                                        </p>
                                                    )}
                                                    <ul className={`list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 text-sm ${getHighlightClass(eventsChanged)}`}>
                                                        {chapter.key_events.map((event, eventIdx) => (
                                                            <li key={eventIdx}>{event}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )})
                                        ) : segment.key_events ? (
                                            <div>
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200">关键情节</h4>
                                                <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 text-sm">
                                                    {segment.key_events.map((event, eventIdx) => (
                                                        <li key={eventIdx}>{event}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                    {renderActionButtons()}
                </div>
            </Modal>

            <Modal isOpen={modalContent === 'story'} onClose={onClose} onBack={onBack} title={`故事: ${outline?.title || ''}`} headerActions={modalHeaderActions}>
                <div className="w-full h-full flex flex-col">
                    <div className="flex flex-grow overflow-hidden gap-6 min-h-0">
                        {storyHeadings.length > 0 && (
                            <nav className="w-64 flex-shrink-0 pr-4 overflow-y-auto hidden md:block">
                                <p className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">目录</p>
                                <ul className="space-y-1">
                                    {storyHeadings.map(h => (
                                        <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 1}rem`}}>
                                            <button 
                                                onClick={() => onTocClick(h.id)}
                                                className="text-left text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md p-2 transition-colors text-sm w-full truncate"
                                                title={h.text}
                                            >
                                                {h.text}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        )}
                        <div 
                            ref={storyContentRef} 
                            className={`relative bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 rounded-3xl overflow-y-auto p-4 md:p-6 flex-grow`}
                            style={{ scrollBehavior: 'smooth' }}
                        >
                           {showDiff && previousStory ? (
                                <StoryDiffView oldText={previousStory} newText={story} />
                           ) : (
                                <MarkdownRenderer content={story} onHeadingsParse={onHeadingsParse} />
                           )}
                        </div>
                    </div>
                    {renderActionButtons()}
                </div>
            </Modal>
        </>
    );
};

export default ResultModals;