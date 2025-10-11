
import React, { useState, useRef, useEffect } from 'react';
import { STORY_PLOTS, PLOT_CATEGORIES, STORY_STYLES, STYLE_CATEGORIES, STORY_STRUCTURES, STRUCTURE_CATEGORIES } from '../constants';
import { PLOT_DESCRIPTIONS } from '../plotDescriptions';
import { Plot, PlotCategory, Style, StyleCategory, NodeType, StructurePlot, StructureCategory } from '../types';
import { ChevronDownIcon, PlusIcon, BookOpenIcon, XIcon } from './icons';

interface SidebarProps {
  onAddNode: (type: NodeType, data?: any) => void;
  isOpen: boolean;
  onClose: () => void;
  dragOffset: number | null;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const PlotAccordionItem: React.FC<{ category: PlotCategory, plots: Plot[], onAddNode: (type: NodeType, data?: any) => void; }> = ({ category, plots, onAddNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePlot, setActivePlot] = useState<number | null>(null);

    const handleAddPlot = (plot: Plot) => {
        onAddNode(NodeType.PLOT, { plotId: plot.id, title: plot.name, description: plot.description });
    };

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors duration-200">
                <span className="font-semibold text-lg">{category}</span>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="bg-slate-100 dark:bg-slate-900/50 px-2 pb-2">
                    {plots.map(plot => (
                         <div key={plot.id} className="text-sm my-1">
                            <div className="flex justify-between items-center p-3 rounded-2xl hover:bg-blue-200/50 dark:hover:bg-blue-900/40 transition-colors">
                                <span 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => setActivePlot(activePlot === plot.id ? null : plot.id)}
                                >
                                    {plot.name}
                                </span>
                                <button onClick={() => handleAddPlot(plot)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center ml-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-blue-300 dark:hover:bg-blue-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            </div>
                            {activePlot === plot.id && (
                                <p className="p-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl mt-1 animate-scale-in" style={{animationDuration: '150ms'}}>
                                    {PLOT_DESCRIPTIONS[plot.id] || '暂无描述。'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StyleAccordionItem: React.FC<{ category: StyleCategory, styles: Style[], onAddNode: (type: NodeType, data?: any) => void; }> = ({ category, styles, onAddNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeStyle, setActiveStyle] = useState<number | null>(null);

    const handleAddStyle = (style: Style) => {
        onAddNode(NodeType.STYLE, { styleId: style.id, title: style.name, description: style.description });
    };

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors duration-200">
                <span className="font-semibold text-lg">{category}</span>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                 <div className="bg-slate-100 dark:bg-slate-900/50 px-2 pb-2">
                    {styles.map(style => (
                         <div key={style.id} className="text-sm my-1">
                            <div className="flex justify-between items-center p-3 rounded-2xl hover:bg-pink-200/50 dark:hover:bg-pink-900/40 transition-colors">
                                <span 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => setActiveStyle(activeStyle === style.id ? null : style.id)}
                                >
                                    {style.name}
                                </span>
                                <button onClick={() => handleAddStyle(style)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center ml-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-pink-300 dark:hover:bg-pink-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            </div>
                            {activeStyle === style.id && (
                                <p className="p-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl mt-1 animate-scale-in" style={{animationDuration: '150ms'}}>
                                    {style.description || '暂无描述。'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StructureAccordionItem: React.FC<{ category: StructureCategory, structures: StructurePlot[], onAddNode: (type: NodeType, data?: any) => void; }> = ({ category, structures, onAddNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeStructure, setActiveStructure] = useState<number | null>(null);

    const handleAddStructure = (structure: StructurePlot) => {
        onAddNode(NodeType.STRUCTURE, { structureId: structure.id, title: structure.name, description: structure.description, category: structure.category });
    };

    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors duration-200">
                <span className="font-semibold text-lg">{category}</span>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="bg-slate-100 dark:bg-slate-900/50 px-2 pb-2">
                    {structures.map(structure => (
                         <div key={structure.id} className="text-sm my-1">
                            <div className="flex justify-between items-center p-3 rounded-2xl hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition-colors">
                                <span 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => setActiveStructure(activeStructure === structure.id ? null : structure.id)}
                                >
                                    {structure.name}
                                </span>
                                <button onClick={() => handleAddStructure(structure)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center ml-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-amber-300 dark:hover:bg-amber-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                            </div>
                            {activeStructure === structure.id && (
                                <p className="p-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl mt-1 animate-scale-in" style={{animationDuration: '150ms'}}>
                                    {structure.description || '暂无描述。'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ onAddNode, isOpen, onClose, dragOffset, sidebarRef }) => {
  const [customPlot, setCustomPlot] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  
  type FilterType = 'all' | 'structure' | 'plot' | 'style';
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [sliderStyle, setSliderStyle] = useState({});
  const filters: { id: FilterType; label: string }[] = [
      { id: 'all', label: '全部' },
      { id: 'structure', label: '首尾' },
      { id: 'plot', label: '情节' },
      { id: 'style', label: '风格' },
  ];

  useEffect(() => {
    const activeTabIndex = filters.findIndex(f => f.id === activeFilter);
    const activeButton = tabsRef.current[activeTabIndex];
    if (activeButton) {
      setSliderStyle({
        left: `${activeButton.offsetLeft}px`,
        width: `${activeButton.offsetWidth}px`,
      });
    }
  }, [activeFilter, filters]);


  const handleAddCustomPlot = () => {
    if (customPlot.trim()) {
      onAddNode(NodeType.PLOT, { isCustom: true, title: customPlot });
      setCustomPlot('');
    }
  };

  const handleAddCustomStyle = () => {
    if (customStyle.trim()) {
      onAddNode(NodeType.STYLE, { isCustom: true, title: customStyle });
      setCustomStyle('');
    }
  };
  
  const isDragging = dragOffset !== null;
  const transitionClass = isDragging ? '' : 'transition-transform duration-300 ease-in-out';
  // Use inline style ONLY when dragging for smooth movement
  const transformStyle = isDragging ? { transform: `translateX(${dragOffset}px)` } : {};
  // Use classes for open/closed states
  const openClosedClass = isOpen ? 'translate-x-0' : '-translate-x-full';
    
  return (
    <div 
      ref={sidebarRef}
      className={`fixed top-0 left-0 h-full w-80 bg-slate-200 dark:bg-slate-900 shadow-2xl z-30 flex flex-col p-5 border-r border-slate-300 dark:border-slate-800 transform md:relative md:z-20 md:translate-x-0 ${transitionClass} ${openClosedClass}`}
      style={transformStyle}
    >
      <button
          onClick={onClose}
          className="md:hidden absolute top-6 right-5 z-50 p-2 rounded-full bg-slate-300/50 dark:bg-slate-800/50 hover:bg-slate-400/50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200 transition-colors"
          aria-label="Close sidebar"
      >
          <XIcon className="h-6 w-6" />
      </button>
      <h1 className="text-4xl font-bold mb-6 text-blue-600 dark:text-blue-400">节点库</h1>
      
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => onAddNode(NodeType.WORK)} className="w-full flex items-center justify-center p-3 rounded-full bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-300 dark:hover:bg-emerald-800 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">
          <BookOpenIcon className="h-5 w-5 mr-2"/>
          添加作品
        </button>
        <button onClick={() => onAddNode(NodeType.CHARACTER)} className="w-full flex items-center justify-center p-3 rounded-full bg-indigo-200 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">
          <PlusIcon className="h-5 w-5 mr-2"/>
          添加人物
        </button>
        <button onClick={() => onAddNode(NodeType.SETTING)} className="w-full flex items-center justify-center p-3 rounded-full bg-purple-200 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 hover:bg-purple-300 dark:hover:bg-purple-800 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">
          <PlusIcon className="h-5 w-5 mr-2"/>
          添加设定
        </button>
        <button onClick={() => onAddNode(NodeType.ENVIRONMENT)} className="w-full flex items-center justify-center p-3 rounded-full bg-green-200 dark:bg-green-900/80 text-green-800 dark:text-green-200 hover:bg-green-300 dark:hover:bg-green-800 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">
          <PlusIcon className="h-5 w-5 mr-2"/>
          添加环境
        </button>
      </div>

      <div className="relative flex items-center mb-4 p-1 bg-slate-300/80 dark:bg-slate-800/80 rounded-full">
         <div
            className="absolute top-0 h-full bg-blue-600 rounded-full shadow-lg transition-all duration-300 ease-out"
            style={{...sliderStyle, top: '4px', bottom: '4px', height: 'auto'}}
          />
        {filters.map((filter, index) => (
            <button 
                key={filter.id}
                ref={el => { tabsRef.current[index] = el; }}
                onClick={() => setActiveFilter(filter.id)} 
                className={`relative z-10 w-full text-center px-3 py-2 rounded-full transition-colors duration-300 font-medium text-sm focus:outline-none ${
                    activeFilter === filter.id 
                    ? 'text-white' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-400/20 dark:hover:bg-slate-700/50'
                }`}
            >
                {filter.label}
            </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto bg-white/50 dark:bg-slate-800/50 rounded-3xl divide-y-2 divide-slate-200 dark:divide-slate-800">
        {(activeFilter === 'all' || activeFilter === 'structure') && (
            <div>
                <h2 className="text-2xl font-semibold my-4 text-amber-600 dark:text-amber-400 pl-4">首尾类型</h2>
                {STRUCTURE_CATEGORIES.map(category => (
                    <StructureAccordionItem
                    key={category}
                    category={category}
                    structures={STORY_STRUCTURES.filter(p => p.category === category)}
                    onAddNode={onAddNode}
                    />
                ))}
            </div>
        )}
        {(activeFilter === 'all' || activeFilter === 'plot') && (
            <div>
              <h2 className="text-2xl font-semibold my-4 text-blue-600 dark:text-blue-400 pl-4">情节类型</h2>
              <div className="px-4 py-2">
                 <div className="flex space-x-2">
                    <input 
                        type="text" 
                        value={customPlot}
                        onChange={(e) => setCustomPlot(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPlot()}
                        placeholder="自定义情节..."
                        className="w-full bg-slate-200 dark:bg-slate-700/50 text-sm p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    />
                    <button onClick={handleAddCustomPlot} className="p-3 w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors text-white">
                        <PlusIcon className="h-6 w-6"/>
                    </button>
                 </div>
              </div>
              {PLOT_CATEGORIES.map(category => (
                <PlotAccordionItem
                  key={category}
                  category={category}
                  plots={STORY_PLOTS.filter(p => p.category === category)}
                  onAddNode={onAddNode}
                />
              ))}
            </div>
        )}
        {(activeFilter === 'all' || activeFilter === 'style') && (
            <div>
              <h2 className="text-2xl font-semibold my-4 text-pink-600 dark:text-pink-400 pl-4">风格类型</h2>
               <div className="px-4 py-2">
                 <div className="flex space-x-2">
                    <input 
                        type="text" 
                        value={customStyle}
                        onChange={(e) => setCustomStyle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStyle()}
                        placeholder="自定义风格..."
                        className="w-full bg-slate-200 dark:bg-slate-700/50 text-sm p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                    />
                    <button onClick={handleAddCustomStyle} className="p-3 w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-full bg-pink-500 hover:bg-pink-600 transition-colors text-white">
                        <PlusIcon className="h-6 w-6"/>
                    </button>
                 </div>
              </div>
              {STYLE_CATEGORIES.map(category => (
                <StyleAccordionItem
                  key={category}
                  category={category}
                  styles={STORY_STYLES.filter(p => p.category === category)}
                  onAddNode={onAddNode}
                />
              ))}
            </div>
        )}
      </div>
       <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(-5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;