import React from 'react';
import { TrashIcon, DownloadIcon, UploadIcon, SunIcon, MoonIcon, CustomSelect, CustomSelectOption, LightningBoltIcon, LightbulbIcon, BrainIcon, LayoutIcon, CircularLayoutIcon } from './icons';
import { LayoutMode } from '../services/layout';

interface ToolbarProps {
  model: string;
  setModel: (model: string) => void;
  isGenerating: boolean;
  onClearAllNodes: () => void;
  onImportNodes: () => void;
  onExportNodes: () => void;
  onLayoutNodes: () => void;
  layoutMode: LayoutMode;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const CoreButtons: React.FC<Pick<ToolbarProps, 'setTheme' | 'theme' | 'onImportNodes' | 'onExportNodes' | 'onClearAllNodes' | 'onLayoutNodes' | 'layoutMode'>> = ({
    setTheme,
    theme,
    onImportNodes,
    onExportNodes,
    onClearAllNodes,
    onLayoutNodes,
    layoutMode,
}) => {
    const buttonClasses = "w-12 h-12 flex items-center justify-center bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-150 btn-material";
    
    // The icon should represent the layout mode that WILL BE applied on the next click.
    // The `layoutMode` state toggles AFTER the layout is performed.
    // So, if the current layout is hierarchical, the state for the NEXT action will be 'circular'.
    // Therefore, we show the icon for the mode OPPOSITE to the one currently in state to reflect the visible state.
    const LayoutButtonIcon = layoutMode === 'hierarchical' ? CircularLayoutIcon : LayoutIcon;
    const layoutButtonTitle = layoutMode === 'hierarchical' ? '当前为环形布局' : '当前为分层布局';

    return (
        <>
            <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`${buttonClasses} hover:text-amber-500 dark:hover:text-amber-300`}
                title="切换主题"
            >
                {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
            </button>
             <button
                onClick={onLayoutNodes}
                className={`${buttonClasses} hover:text-blue-500 dark:hover:text-blue-300`}
                title={layoutButtonTitle}
            >
                <LayoutButtonIcon className="h-6 w-6" />
            </button>
            <button
                onClick={onImportNodes}
                className={`${buttonClasses} hover:text-slate-900 dark:hover:text-white`}
                title="导入节点"
            >
                <UploadIcon className="h-6 w-6" />
            </button>
            <button
                onClick={onExportNodes}
                className={`${buttonClasses} hover:text-slate-900 dark:hover:text-white`}
                title="导出节点"
            >
                <DownloadIcon className="h-6 w-6" />
            </button>
            <button
                onClick={onClearAllNodes}
                className={`${buttonClasses} hover:bg-red-500/50 hover:text-red-700 dark:hover:bg-red-500/30 dark:hover:text-red-300`}
                title="清除所有节点"
            >
                <TrashIcon className="h-6 w-6" />
            </button>
        </>
    );
};


const Toolbar: React.FC<ToolbarProps> = (props) => {
  const { model, setModel, isGenerating } = props;

  const modelOptions: CustomSelectOption[] = [
    { value: 'gemini-2.5-flash-no-thinking', label: '最快', icon: <LightningBoltIcon className="h-5 w-5 mr-2 text-yellow-500" /> },
    { value: 'gemini-2.5-flash', label: '均衡', icon: <LightbulbIcon className="h-5 w-5 mr-2 text-blue-500" /> },
    { value: 'gemini-2.5-pro', label: '深度', icon: <BrainIcon className="h-5 w-5 mr-2 text-purple-500" /> },
  ];

  return (
    <>
        {/* Desktop View: One combined pill */}
        <div className="hidden md:flex absolute top-5 right-5 bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-2 rounded-full shadow-lg z-20 items-center gap-2 border border-slate-300/50 dark:border-slate-800/50">
            <CoreButtons {...props} />
            <div className="flex items-center w-48 pl-1">
                <CustomSelect
                    id="model-select-desktop"
                    options={modelOptions}
                    value={model}
                    onChange={setModel}
                    disabled={isGenerating}
                />
            </div>
        </div>

        {/* Mobile View: Stacked pills */}
        <div className="md:hidden absolute top-5 right-5 z-20 flex flex-col items-end gap-2 pointer-events-none">
            <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-300/50 dark:border-slate-800/50 pointer-events-auto">
                <CoreButtons {...props} />
            </div>
            {/* --- CHANGE IS HERE --- */}
            {/* The fixed width class `w-52` has been removed to allow the container to shrink-to-fit its content. */}
            <div className="bg-slate-200/60 dark:bg-slate-900/60 backdrop-blur-lg p-2 rounded-full shadow-lg border border-slate-300/50 dark:border-slate-800/50 pointer-events-auto">
                <CustomSelect
                    id="model-select-mobile"
                    options={modelOptions}
                    value={model}
                    onChange={setModel}
                    disabled={isGenerating}
                />
            </div>
        </div>
    </>
  );
};

export default Toolbar;