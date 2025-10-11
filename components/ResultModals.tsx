import React, { useMemo, useState, useEffect } from 'react';
import Modal from './Modal';
// FIX: Added default import for MarkdownRenderer to resolve reference error.
import MarkdownRenderer, { renderLineWithInlineFormatting } from './MarkdownRenderer';
import { StructuredOutline, Chapter } from '../types';
import { CopyIcon, DownloadIcon, UndoIcon, RedoIcon, EyeIcon, DocumentDiffIcon } from './icons';

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
    revisionPrompt: string;
    onRevisionPromptChange: (value: string) => void;
    onRevise: () => void;
    isRevising: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
    onGenerateStory: () => void;
    onCopy: (content: string) => void;
    onDownload: (content: string, filename: string) => void;
    onTocClick: (id: string) => void;
    onHeadingsParse: (headings: Heading[]) => void;
}

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
    revisionPrompt,
    onRevisionPromptChange,
    onRevise,
    isRevising,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClose,
    onGenerateStory,
    onCopy,
    onDownload,
    onTocClick,
    onHeadingsParse
}) => {
    
    const [viewMode, setViewMode] = useState<'diff' | 'read'>('read');
    
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
            <div>
                {diffResult.map((item, index) => {
                    const baseClasses = 'px-2 py-0.5 whitespace-pre-wrap';
                    let classes = baseClasses;
                    let sign = ' ';
                    if (item.type === 'added') {
                        classes += ' bg-green-500/20';
                        sign = '+';
                    } else if (item.type === 'removed') {
                        classes += ' bg-red-500/20';
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
    
    const getHighlightClass = (isChanged: boolean) => (showDiff && isChanged) ? 'bg-yellow-500/20 dark:bg-yellow-400/20 p-1 -m-1 rounded-md' : '';

    const renderActionButtons = () => (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                    <button onClick={() => onCopy(modalContent === 'outline' ? JSON.stringify(outline, null, 2) : story)} className="p-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors" title="复制"><CopyIcon className="h-5 w-5"/></button>
                    <button onClick={() => onDownload(modalContent === 'outline' ? JSON.stringify(outline, null, 2) : story, `${(outline?.title || 'content')}`)} className="p-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors" title="下载"><DownloadIcon className="h-5 w-5"/></button>
                    <button onClick={onUndo} disabled={!canUndo || isRevising} className="p-2 bg-gray-300 dark:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400 dark:hover:bg-gray-500" title="撤销"><UndoIcon className="h-5 w-5"/></button>
                    <button onClick={onRedo} disabled={!canRedo || isRevising} className="p-2 bg-gray-300 dark:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400 dark:hover:bg-gray-500" title="重做"><RedoIcon className="h-5 w-5"/></button>
                     <button onClick={() => setViewMode(v => v === 'diff' ? 'read' : 'diff')} disabled={!hasPreviousVersion} className="p-2 bg-gray-300 dark:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400 dark:hover:bg-gray-500" title={viewMode === 'diff' ? '阅读视图' : '对比视图'}>
                        {viewMode === 'diff' ? <EyeIcon className="h-5 w-5"/> : <DocumentDiffIcon className="h-5 w-5"/>}
                     </button>
                </div>
                <div className="flex-grow flex items-center">
                    <input
                        id="revision-prompt"
                        value={revisionPrompt}
                        onChange={(e) => onRevisionPromptChange(e.target.value)}
                        placeholder="迭代修改需求..."
                        className="w-full bg-gray-200 dark:bg-gray-700 text-sm p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-800"
                        disabled={isRevising}
                    />
                    <button
                        onClick={onRevise}
                        disabled={isRevising || !revisionPrompt.trim()}
                        className="px-4 h-9 bg-purple-600 text-white font-semibold rounded-r-md hover:bg-purple-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 flex-shrink-0"
                    >
                        {isRevising ? '...' : '修改'}
                    </button>
                </div>

                {modalContent === 'outline' && (
                     <button 
                        onClick={onGenerateStory}
                        disabled={isAnyTaskRunning || !outline}
                        className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 flex-shrink-0"
                    >
                        {activeProgressTask === 'story' ? '生成中...' : '开始创作'}
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <Modal isOpen={modalContent === 'outline' && !!outline} onClose={onClose} title={`故事大纲: ${outline?.title || ''}`}>
                <div className="w-full max-h-[65vh] flex flex-col">
                    <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="space-y-6">
                            {outline?.segments.map((segment, index) => {
                                const prevSegment = previousOutline?.segments.find(s => s.segment_title === segment.segment_title);
                                const isNewSegment = !prevSegment;
                                const titleChanged = !isNewSegment && segment.segment_title !== prevSegment.segment_title;
                                const wordCountChanged = !isNewSegment && segment.estimated_word_count !== prevSegment.estimated_word_count;

                                return (
                                <div key={index} className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${showDiff && isNewSegment ? 'border-green-500/50' : ''}`}>
                                    <h3 className={`text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-3 border-b border-cyan-500/30 pb-2 ${getHighlightClass(titleChanged)}`}>
                                        {segment.chapters ? `第 ${index + 1} 部分: ` : ''}{segment.segment_title}
                                        <span className={`text-sm font-normal text-gray-500 dark:text-gray-400 ml-3 ${getHighlightClass(wordCountChanged)}`}>(预计 {segment.estimated_word_count} 字)</span>
                                    </h3>
                                    <div className="space-y-4 pl-4">
                                        {segment.chapters ? (
                                            segment.chapters.map(chapter => {
                                                const prevChapter = prevSegment?.chapters?.find(c => c.chapter_number === chapter.chapter_number);
                                                const isNewChapter = !prevChapter;
                                                const titleChanged = !isNewChapter && chapter.chapter_title !== prevChapter?.chapter_title;
                                                const eventsChanged = !isNewChapter && JSON.stringify(chapter.key_events) !== JSON.stringify(prevChapter?.key_events);

                                                return (
                                                <div key={chapter.chapter_number} className={showDiff && isNewChapter ? 'p-2 -m-2 bg-green-500/10 rounded-md' : ''}>
                                                    <h4 className={`font-semibold text-gray-800 dark:text-gray-200 ${getHighlightClass(titleChanged)}`}>{`第 ${chapter.chapter_number} 章: ${chapter.chapter_title}`}</h4>
                                                    {(chapter.point_of_view || chapter.setting) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                                                        {chapter.point_of_view && `视角: ${chapter.point_of_view}`}
                                                        {chapter.point_of_view && chapter.setting && ' | '}
                                                        {chapter.setting && `场景: ${chapter.setting}`}
                                                        </p>
                                                    )}
                                                    <ul className={`list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm ${getHighlightClass(eventsChanged)}`}>
                                                        {chapter.key_events.map((event, eventIdx) => (
                                                            <li key={eventIdx}>{event}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )})
                                        ) : segment.key_events ? (
                                            <div>
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">关键情节</h4>
                                                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
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

            <Modal isOpen={modalContent === 'story'} onClose={onClose} title={`故事: ${outline?.title || ''}`}>
                <div className="w-full max-h-[70vh] flex flex-col">
                    <div className="flex flex-grow overflow-hidden">
                        {storyHeadings.length > 0 && (
                            <nav className="w-64 flex-shrink-0 pr-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                                <p className="text-lg font-semibold mb-2 text-cyan-600 dark:text-cyan-400">目录</p>
                                <ul className="space-y-1">
                                    {storyHeadings.map(h => (
                                        <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 1}rem`}}>
                                            <button 
                                                onClick={() => onTocClick(h.id)}
                                                className="text-left text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm w-full truncate"
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
                            className={`relative bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md overflow-y-auto ${storyHeadings.length > 0 ? 'pl-4 flex-grow' : 'w-full'}`}
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