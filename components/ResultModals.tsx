import React from 'react';
import Modal from './Modal';
import MarkdownRenderer from './MarkdownRenderer';
import { StructuredOutline } from '../types';
import { CopyIcon, DownloadIcon } from './icons';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface ResultModalsProps {
    modalContent: 'outline' | 'story' | null;
    outline: StructuredOutline | null;
    story: string;
    storyHeadings: Heading[];
    storyContentRef: React.RefObject<HTMLDivElement>;
    isAnyTaskRunning: boolean;
    activeProgressTask: string | null;
    revisionPrompt: string;
    onRevisionPromptChange: (value: string) => void;
    onRevise: () => void;
    isRevising: boolean;
    
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
    story,
    storyHeadings,
    storyContentRef,
    isAnyTaskRunning,
    activeProgressTask,
    revisionPrompt,
    onRevisionPromptChange,
    onRevise,
    isRevising,
    onClose,
    onGenerateStory,
    onCopy,
    onDownload,
    onTocClick,
    onHeadingsParse
}) => {
    
    const RevisionControls = (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label htmlFor="revision-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">迭代修改需求:</label>
            <div className="flex items-center space-x-2">
                <textarea
                    id="revision-prompt"
                    value={revisionPrompt}
                    onChange={(e) => onRevisionPromptChange(e.target.value)}
                    placeholder="例如: “让主角的动机更清晰一些” 或 “在第二章增加一个悬念”"
                    className="w-full bg-gray-200 dark:bg-gray-700 text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-800"
                    rows={2}
                    disabled={isRevising}
                />
                <button
                    onClick={onRevise}
                    disabled={isRevising || !revisionPrompt.trim()}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 flex-shrink-0"
                >
                    {isRevising ? '修改中...' : 'AI 修改'}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <Modal isOpen={modalContent === 'outline' && !!outline} onClose={onClose} title={`故事大纲: ${outline?.title || ''}`}>
                <div className="w-full max-h-[65vh] flex flex-col">
                    <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                        <div className="space-y-6">
                            {outline?.segments.map((segment, index) => (
                                <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <h3 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-3 border-b border-cyan-500/30 pb-2">
                                        {segment.chapters ? `第 ${index + 1} 部分: ` : ''}{segment.segment_title}
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-3">(预计 {segment.estimated_word_count} 字)</span>
                                    </h3>
                                    <div className="space-y-4 pl-4">
                                        {segment.chapters ? (
                                            segment.chapters.map(chapter => (
                                                <div key={chapter.chapter_number}>
                                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{`第 ${chapter.chapter_number} 章: ${chapter.chapter_title}`}</h4>
                                                    {(chapter.point_of_view || chapter.setting) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                                                        {chapter.point_of_view && `视角: ${chapter.point_of_view}`}
                                                        {chapter.point_of_view && chapter.setting && ' | '}
                                                        {chapter.setting && `场景: ${chapter.setting}`}
                                                        </p>
                                                    )}
                                                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 text-sm">
                                                        {chapter.key_events.map((event, eventIdx) => (
                                                            <li key={eventIdx}>{event}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))
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
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <div>
                            <button
                                onClick={() => onCopy(JSON.stringify(outline, null, 2))}
                                className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors mr-2"
                                title="复制大纲 (JSON)"
                            >
                                <CopyIcon className="h-5 w-5"/>
                            </button>
                            <button
                                onClick={() => onDownload(JSON.stringify(outline, null, 2), `${outline?.title || 'story-outline'}`)}
                                className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                title="下载大纲 (JSON)"
                            >
                                <DownloadIcon className="h-5 w-5"/>
                            </button>
                        </div>
                        <button 
                            onClick={onGenerateStory}
                            disabled={isAnyTaskRunning || !outline}
                            className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600"
                        >
                            {activeProgressTask === 'story' ? '生成中...' : '开始创作'}
                        </button>
                    </div>
                    {RevisionControls}
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
                            className={`bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md overflow-y-auto ${storyHeadings.length > 0 ? 'pl-4 flex-grow' : 'w-full'}`}
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            <MarkdownRenderer content={story} onHeadingsParse={onHeadingsParse} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end items-center space-x-2 flex-shrink-0">
                        <button
                            onClick={() => onCopy(story)}
                            className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                            title="复制"
                        >
                            <CopyIcon className="h-5 w-5"/>
                        </button>
                        <button
                            onClick={() => onDownload(story, `故事-${outline?.title || 'story'}`)}
                            className="p-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                            title="下载"
                        >
                            <DownloadIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    {RevisionControls}
                </div>
            </Modal>
        </>
    );
};

export default ResultModals;
