import { useState, useCallback, useRef } from 'react';

export const useProgress = () => {
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [activeProgressTask, setActiveProgressTask] = useState<string | null>(null);

    const progressIntervalRef = useRef<number | null>(null);
    const progressRef = useRef<number>(0);
    const isCancelledRef = useRef<boolean>(false);
    
    // For both types
    const startTimeRef = useRef<number>(0);

    // For step-based progress
    const totalStepsRef = useRef<number>(1);
    const currentStepRef = useRef<number>(1);

    const clearAllIntervals = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    // --- Generic Time-based Progress ---
    const updateGenericProgress = useCallback(() => {
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
        isCancelledRef.current = false;
        clearAllIntervals();
        setActiveProgressTask(taskIdentifier);
        setProgress(0);
        setProgressMessage(initialMessage);
        progressRef.current = 0;
        startTimeRef.current = Date.now();
        progressIntervalRef.current = window.setInterval(updateGenericProgress, 200);
    }, [updateGenericProgress]);

    // --- Step-based Progress ---
    const updateSteppedProgress = useCallback(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // Time elapsed for the *current step*
        
        const stepSize = 100 / totalStepsRef.current;
        const baseProgressForCurrentStep = (currentStepRef.current - 1) * stepSize;
        const progressRangeInStep = stepSize * 0.8; // Max progress during generation is 80% of the step's slice

        let progressWithinStepAnimation = 0;
        if (elapsed < 30) {
            progressWithinStepAnimation = progressRangeInStep * (1 - Math.pow(1 - elapsed / 30, 3));
        } else {
            progressWithinStepAnimation = progressRangeInStep; // Hold at 80% of the step
        }
        
        const finalProgress = Math.floor(baseProgressForCurrentStep + progressWithinStepAnimation);
        setProgress(finalProgress);
        progressRef.current = finalProgress;
    }, []);
    
    const startSteppedProgress = useCallback((taskIdentifier: string, initialMessage: string, totalSteps: number) => {
        isCancelledRef.current = false;
        clearAllIntervals();
        setActiveProgressTask(taskIdentifier);
        setProgress(0);
        setProgressMessage(initialMessage);
        progressRef.current = 0;
        
        totalStepsRef.current = totalSteps > 0 ? totalSteps : 1;
        currentStepRef.current = 1;
        
        startTimeRef.current = Date.now();
        progressIntervalRef.current = window.setInterval(updateSteppedProgress, 200);
    }, [updateSteppedProgress]);

    const completeStepAndAdvance = useCallback((onStepComplete?: () => void) => {
        clearAllIntervals();
        if (isCancelledRef.current) return;

        const stepSize = 100 / totalStepsRef.current;
        const targetProgress = Math.floor(currentStepRef.current * stepSize);

        const startProgressVal = progressRef.current;
        const duration = 500; // 0.5s
        const startTime = Date.now();

        const animationInterval = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                clearInterval(animationInterval);
                setProgress(targetProgress);
                progressRef.current = targetProgress;

                currentStepRef.current += 1;
                
                if (currentStepRef.current <= totalStepsRef.current) {
                    startTimeRef.current = Date.now(); // Reset timer for next step
                    progressIntervalRef.current = window.setInterval(updateSteppedProgress, 200);
                }
                
                onStepComplete?.();
            } else {
                const newProgress = Math.round(startProgressVal + (targetProgress - startProgressVal) * (elapsed / duration));
                setProgress(newProgress);
                progressRef.current = newProgress;
            }
        }, 16);
        progressIntervalRef.current = animationInterval;
    }, [updateSteppedProgress]);

    // --- Common Functions ---
    const stopProgress = useCallback((onComplete?: () => void) => {
        clearAllIntervals();
        
        if (isCancelledRef.current) {
            setActiveProgressTask(null);
            setProgress(0);
            setProgressMessage('');
            progressRef.current = 0;
            return;
        }
        
        const startProgressVal = progressRef.current;
        const duration = 1000;
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
    
    const cancelProgress = useCallback(() => {
        isCancelledRef.current = true;
        clearAllIntervals();
        setActiveProgressTask(null);
        setProgress(0);
        setProgressMessage('');
        progressRef.current = 0;
        totalStepsRef.current = 1;
        currentStepRef.current = 1;
    }, []);

    return {
        progress,
        progressMessage,
        activeProgressTask,
        isAnyTaskRunning: !!activeProgressTask,
        setProgressMessage,
        startProgress,
        stopProgress,
        startSteppedProgress,
        completeStepAndAdvance,
        cancelProgress,
    };
};
