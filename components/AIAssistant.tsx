import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WandIcon, XIcon, SendIcon } from './icons';

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string) => void;
    isProcessing: boolean;
    progress: number;
    message: string | null;
    isAwaitingConfirmation: boolean;
    onAccept: () => void;
    onRevert: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, onSubmit, isProcessing, progress, message, isAwaitingConfirmation, onAccept, onRevert }) => {
    const [position, setPosition] = useState({ 
        x: window.innerWidth / 2 - 192, // 192 is half of the panel width (384px)
        y: window.innerHeight / 2 - 150 
    });
    const dragRef = useRef<{ x: number, y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    
    const [inputValue, setInputValue] = useState('');
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isOpen) {
            const panelWidth = containerRef.current?.offsetWidth || (window.innerWidth < 768 ? 320 : 384);
            const panelHeight = containerRef.current?.offsetHeight || 250;
            setPosition({
                x: window.innerWidth / 2 - panelWidth / 2,
                y: window.innerHeight / 2 - panelHeight / 2,
            });
        }
    }, [isOpen]);

    useEffect(() => {
        // Prevent exit animation on initial load when isOpen is false
        if (isInitialRender.current) {
          isInitialRender.current = false;
          return;
        }

        if (!isOpen) {
            setIsAnimatingOut(true);
            const timer = setTimeout(() => setIsAnimatingOut(false), 200); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);
    
    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(onClose, 200);
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (headerRef.current && headerRef.current.contains(e.target as Node)) {
            if ('touches' in e && e.cancelable) {
                e.preventDefault();
            }
            const point = 'touches' in e ? e.touches[0] : e;
            dragRef.current = {
                x: point.clientX - position.x,
                y: point.clientY - position.y,
            };
        }
    };

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (dragRef.current && containerRef.current) {
            if ('touches' in e && e.cancelable) {
                e.preventDefault();
            }
            const point = 'touches' in e ? e.touches[0] : e;
            if (!point) return;

            const newY = point.clientY - dragRef.current.y;
            const newX = point.clientX - dragRef.current.x;

            const containerRect = containerRef.current.getBoundingClientRect();
            
            const clampedY = Math.max(16, Math.min(newY, window.innerHeight - containerRect.height - 16));
            const clampedX = Math.max(16, Math.min(newX, window.innerWidth - containerRect.width - 16));

            setPosition({
                x: clampedX,
                y: clampedY,
            });
        }
    }, []);

    const handleDragEnd = useCallback(() => {
        dragRef.current = null;
    }, []);
    
    useEffect(() => {
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('touchend', handleDragEnd);
        
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [handleDragMove, handleDragEnd]);


    const handleSubmit = () => {
        if (inputValue.trim() && !isProcessing && !isAwaitingConfirmation) {
            onSubmit(inputValue);
        }
    };
    
    const handleAcceptAndClear = () => {
        onAccept();
        setInputValue('');
    };


    if (!isOpen && !isAnimatingOut) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={`fixed z-40 w-80 md:w-96 bg-slate-200/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-300/50 dark:border-slate-700/50 p-4 flex flex-col ${isOpen && !isAnimatingOut ? 'animate-scale-in' : 'animate-scale-out'}`}
            style={{ 
                left: position.x, 
                top: position.y,
                touchAction: 'none'
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            <div 
                ref={headerRef}
                className="flex justify-between items-center mb-3 cursor-grab"
            >
                <h4 className="font-bold text-lg text-monet-dark dark:text-blue-400 flex items-center">
                    <WandIcon className="h-5 w-5 mr-2" />
                    AI 助手
                </h4>
                <button 
                    onClick={handleClose} 
                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-300/70 dark:hover:bg-slate-700/70 cursor-pointer btn-material"
                >
                    <XIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="relative">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                    placeholder="例如：创建一个关于背叛的情节，并将其连接到“初始场景”之后..."
                    className="w-full bg-slate-50/80 dark:bg-slate-800/70 text-sm p-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none border-none pr-12"
                    rows={4}
                    disabled={isProcessing || isAwaitingConfirmation}
                />
                <button 
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || isProcessing || isAwaitingConfirmation}
                    className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center bg-monet-dark text-white rounded-full hover:bg-monet-dark-hover disabled:bg-slate-400 dark:disabled:bg-slate-600 transition-colors btn-material"
                >
                    <SendIcon className="h-5 w-5" />
                </button>
            </div>
             {(isProcessing || message) && (
                 <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 px-2 animate-scale-in" style={{ animationDuration: '150ms' }}>
                     {isProcessing ? (
                         <div className="space-y-1.5">
                             {message && <p>{message}</p>}
                             <div className="w-full bg-slate-300/70 rounded-full h-1.5 dark:bg-slate-700/70">
                                 <div
                                     className="bg-blue-500 h-1.5 rounded-full"
                                     style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}
                                 ></div>
                             </div>
                         </div>
                     ) : (
                         message && <p>{message}</p>
                     )}
                 </div>
            )}
            {isAwaitingConfirmation && (
                 <div className="mt-3 flex items-center justify-end space-x-3 animate-scale-in" style={{animationDuration: '150ms'}}>
                    <button onClick={onRevert} className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-300/70 dark:bg-slate-700/70 rounded-full hover:bg-slate-400/70 dark:hover:bg-slate-600/70 transition-colors btn-material">
                        回退
                    </button>
                    <button onClick={handleAcceptAndClear} className="px-5 py-2 text-sm font-semibold text-white bg-monet-dark rounded-full hover:bg-monet-dark-hover transition-colors btn-material">
                        接受
                    </button>
                </div>
            )}
        </div>
    );
};

export default AIAssistant;