import React, { useState } from 'react';
import { STORY_PLOTS, PLOT_CATEGORIES, STORY_STYLES, STYLE_CATEGORIES, STORY_STRUCTURES, STRUCTURE_CATEGORIES } from '../constants';
import { PLOT_DESCRIPTIONS } from '../plotDescriptions';
import { Plot, PlotCategory, Style, StyleCategory, NodeType, StructurePlot, StructureCategory } from '../types';
import { ChevronDownIcon, PlusIcon, BookOpenIcon } from './icons';

interface SidebarProps {
  onAddNode: (type: NodeType, data?: any) => void;
  isOpen: boolean;
}

const PlotAccordionItem: React.FC<{ category: PlotCategory, plots: Plot[], onAddNode: (type: NodeType, data?: any) => void; }> = ({ category, plots, onAddNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePlot, setActivePlot] = useState<number | null>(null);

    const handleAddPlot = (plot: Plot) => {
        onAddNode(NodeType.PLOT, { plotId: plot.id, title: plot.name, description: plot.description });
    };

    return (
        <div className="border-b border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-700 transition-colors duration-200">
                <span className="font-semibold">{category}</span>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="bg-gray-800 p-2">
                    {plots.map(plot => (
                         <div key={plot.id} className="text-sm my-1">
                            <div className="flex justify-between items-center p-2 rounded hover:bg-cyan-600 hover:bg-opacity-20 transition-colors">
                                <span 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => setActivePlot(activePlot === plot.id ? null : plot.id)}
                                >
                                    {plot.name}
                                </span>
                                <button onClick={() => handleAddPlot(plot)} className="p-1 ml-2 rounded-full hover:bg-cyan-400 hover:text-gray-900 transition-colors">
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                            {activePlot === plot.id && (
                                <p className="p-3 text-xs text-gray-400 bg-gray-900 rounded mt-1 animate-fade-in">
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
        <div className="border-b border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-700 transition-colors duration-200">
                <span className="font-semibold">{category}</span>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="bg-gray-800 p-2">
                    {styles.map(style => (
                         <div key={style.id} className="text-sm my-1">
                            <div className="flex justify-between items-center p-2 rounded hover:bg-pink-600 hover:bg-opacity-20 transition-colors">
                                <span 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => setActiveStyle(activeStyle === style.id ? null : style.id)}
                                >
                                    {style.name}
                                </span>
                                <button onClick={() => handleAddStyle(style)} className="p-1 ml-2 rounded-full hover:bg-pink-400 hover:text-gray-900 transition-colors">
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                            {activeStyle === style.id && (
                                <p className="p-3 text-xs text-gray-400 bg-gray-900 rounded mt-1 animate-fade-in">
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
        <div className="border-b border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-700 transition-colors duration-200">
                <span className="font-semibold">{category}</span>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="bg-gray-800 p-2">
                    {structures.map(structure => (
                         <div key={structure.id} className="text-sm my-1">
                            <div className="flex justify-between items-center p-2 rounded hover:bg-yellow-600 hover:bg-opacity-20 transition-colors">
                                <span 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => setActiveStructure(activeStructure === structure.id ? null : structure.id)}
                                >
                                    {structure.name}
                                </span>
                                <button onClick={() => handleAddStructure(structure)} className="p-1 ml-2 rounded-full hover:bg-yellow-400 hover:text-gray-900 transition-colors">
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                            {activeStructure === structure.id && (
                                <p className="p-3 text-xs text-gray-400 bg-gray-900 rounded mt-1 animate-fade-in">
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


const Sidebar: React.FC<SidebarProps> = ({ onAddNode, isOpen }) => {
  const [customPlot, setCustomPlot] = useState('');
  const [customStyle, setCustomStyle] = useState('');

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

  const sidebarClasses = isOpen
    ? 'translate-x-0'
    : '-translate-x-full';

  return (
    <div className={`fixed top-0 left-0 h-full w-72 bg-gray-800 shadow-lg z-30 flex flex-col p-4 border-r border-gray-700 transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:z-20 ${sidebarClasses}`}>
      <h1 className="text-2xl font-bold mb-4 text-cyan-400">节点库</h1>
      
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button onClick={() => onAddNode(NodeType.WORK)} className="w-full flex items-center justify-center p-2 rounded-md bg-emerald-600 hover:bg-emerald-500 transition-colors font-semibold text-sm">
          <BookOpenIcon className="h-4 w-4 mr-2"/>
          添加作品
        </button>
        <button onClick={() => onAddNode(NodeType.CHARACTER)} className="w-full flex items-center justify-center p-2 rounded-md bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-sm">
          <PlusIcon className="h-4 w-4 mr-2"/>
          添加人物
        </button>
        <button onClick={() => onAddNode(NodeType.SETTING)} className="w-full flex items-center justify-center p-2 rounded-md bg-purple-600 hover:bg-purple-500 transition-colors font-semibold text-sm">
          <PlusIcon className="h-4 w-4 mr-2"/>
          添加设定
        </button>
        <button onClick={() => onAddNode(NodeType.ENVIRONMENT)} className="w-full flex items-center justify-center p-2 rounded-md bg-green-600 hover:bg-green-500 transition-colors font-semibold text-sm">
          <PlusIcon className="h-4 w-4 mr-2"/>
          添加环境
        </button>
      </div>

      <div className="flex-grow overflow-y-auto bg-gray-900 rounded-md divide-y-2 divide-gray-800">
        <div>
            <h2 className="text-lg font-semibold my-2 text-yellow-400 pl-3">首尾类型</h2>
            {STRUCTURE_CATEGORIES.map(category => (
                <StructureAccordionItem
                key={category}
                category={category}
                structures={STORY_STRUCTURES.filter(p => p.category === category)}
                onAddNode={onAddNode}
                />
            ))}
        </div>
        <div>
          <h2 className="text-lg font-semibold my-2 text-cyan-400 pl-3">情节类型</h2>
          <div className="p-3">
             <div className="flex space-x-2">
                <input 
                    type="text" 
                    value={customPlot}
                    onChange={(e) => setCustomPlot(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPlot()}
                    placeholder="自定义情节..."
                    className="w-full bg-gray-700 text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button onClick={handleAddCustomPlot} className="p-2 rounded-md bg-cyan-600 hover:bg-cyan-500 transition-colors">
                    <PlusIcon className="h-5 w-5"/>
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
        <div>
          <h2 className="text-lg font-semibold my-2 text-pink-400 pl-3">风格类型</h2>
           <div className="p-3">
             <div className="flex space-x-2">
                <input 
                    type="text" 
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStyle()}
                    placeholder="自定义风格..."
                    className="w-full bg-gray-700 text-sm p-2 rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button onClick={handleAddCustomStyle} className="p-2 rounded-md bg-pink-600 hover:bg-pink-500 transition-colors">
                    <PlusIcon className="h-5 w-5"/>
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