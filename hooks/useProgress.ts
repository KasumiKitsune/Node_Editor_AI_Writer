import { useState, useCallback, useRef } from 'react';

export const useProgress = () => {
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [activeProgressTask, setActiveProgressTask] = useState<string | null>(null);

    const progressIntervalRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const progressRef = useRef<number>(0);

    const updateProgress = useCallback(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // in seconds
        let currentProgress = 0;
        if (elapsed < 60) {
            currentProgress = 80 * (1 - Math.pow(1 - elapsed / 60, 3));
        } else if (elapsed < 120) {
            currentProgress = 80 + 15 * (1 - Math.pow(1 - (elapsed - 60) / 60, 3));
        } else {
            currentProgress = 95;
        }
        const finalProgress = Math.min(95, Math.floor(currentProgress));
        setProgress(finalProgress);
        progressRef.current = finalProgress;
    }, []);

    const startProgress = useCallback((taskIdentifier: string, initialMessage = '正在初始化...') => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setActiveProgressTask(taskIdentifier);
        setProgress(0);
        setProgressMessage(initialMessage);
        progressRef.current = 0;
        startTimeRef.current = Date.now();
        progressIntervalRef.current = window.setInterval(updateProgress, 200);
    }, [updateProgress]);

    const stopProgress = useCallback((onComplete?: () => void) => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        
        const startProgressVal = progressRef.current;
        const duration = 1000; // 1 second
        const startTime = Date.now();

        const animationInterval = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                clearInterval(animationInterval);
                progressIntervalRef.current = null;
                setProgress(100);
                progressRef.current = 100;
                setTimeout(() => {
                    onComplete?.();
                    setActiveProgressTask(null);
                    setProgress(0); 
                    setProgressMessage('');
                    progressRef.current = 0;
                }, 500); 
            } else {
                const newProgress = Math.round(startProgressVal + (100 - startProgressVal) * (elapsed / duration));
                setProgress(newProgress);
                progressRef.current = newProgress;
            }
        }, 16); 
        progressIntervalRef.current = animationInterval;
    }, []);

    return {
        progress,
        progressMessage,
        activeProgressTask,
        isAnyTaskRunning: !!activeProgressTask,
        setProgressMessage,
        startProgress,
        stopProgress,
    };
};
