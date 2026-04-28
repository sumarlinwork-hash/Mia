// First-Time UX - Guided Highlights System
// Phase 2.6: First-Time User Experience

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';

interface HighlightStep {
    id: string;
    targetSelector?: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface FirstTimeGuideProps {
    onComplete: () => void;
}

const HIGHLIGHT_STEPS: HighlightStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to the App Marketplace!',
        description: 'Discover powerful AI apps that transform how you work. We have reframed everything to focus on your success.',
        position: 'center',
    },
    {
        id: 'recommended',
        targetSelector: '[data-testid="recommended-section"]',
        title: 'Personalized For You',
        description: 'These apps are recommended based on your usage and what is popular among users like you.',
        position: 'bottom',
    },
    {
        id: 'try-button',
        targetSelector: '[data-testid="app-card"]',
        title: 'Try Before You Use',
        description: 'Gunakan tombol "Try" untuk mencoba aplikasi dalam mode pratinjau interaktif tanpa harus memilikinya terlebih dahulu.',
        position: 'top',
    },
    {
        id: 'simple-builder',
        targetSelector: '[data-testid="simple-builder-banner"]',
        title: 'Create Your Own App',
        description: 'Want something specific? Use our Simple Builder to create your own custom AI app in under 60 seconds.',
        position: 'bottom',
    },
    {
        id: 'use-button',
        targetSelector: '[data-testid="use-button"]',
        title: 'Instant Deployment',
        description: 'Click "Use" to instantly add an app to your AI assistant. Simple, fast, and secure.',
        position: 'top',
    },
];

const STORAGE_KEY = 'mia_marketplace_first_visit';

export function FirstTimeGuide({ onComplete }: FirstTimeGuideProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if this is the first visit
        const hasVisitedBefore = localStorage.getItem(STORAGE_KEY);

        if (!hasVisitedBefore) {
            // Mark as visited
            localStorage.setItem(STORAGE_KEY, 'false');

            // Show guide after a short delay
            setTimeout(() => {
                setIsVisible(true);
            }, 1000);
        } else {
            // User has visited before, skip guide
            onComplete();
        }
    }, [onComplete]);

    const handleNext = () => {
        if (currentStep < HIGHLIGHT_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
        onComplete();
    };

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.setItem(STORAGE_KEY, 'true');
        onComplete();
    };

    if (!isVisible) return null;

    const step = HIGHLIGHT_STEPS[currentStep];
    const progress = ((currentStep + 1) / HIGHLIGHT_STEPS.length) * 100;

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
                    />

                    {/* Guide tooltip */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-md pointer-events-auto">
                            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-gray-900 to-black p-6 shadow-2xl shadow-primary/20">
                                {/* Progress bar */}
                                <div className="mb-4 h-1 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={handleSkip}
                                    className="absolute top-4 right-4 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <X size={16} />
                                </button>

                                {/* Content */}
                                <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                                <p className="text-white/70 mb-6">{step.description}</p>

                                {/* Footer */}
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={handleSkip}
                                        className="text-sm text-white/50 hover:text-white transition-colors"
                                    >
                                        Skip tour
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-bold hover:brightness-110 transition-all"
                                    >
                                        {currentStep < HIGHLIGHT_STEPS.length - 1 ? (
                                            <>
                                                Next
                                                <ArrowRight size={16} />
                                            </>
                                        ) : (
                                            'Get Started'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Tooltip component for individual elements
export function Tooltip({
    message,
    visible,
    position = 'bottom',
}: {
    message: string;
    visible: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
}) {
    if (!visible) return null;

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute ${positionClasses[position]} z-50 whitespace-nowrap`}
        >
            <div className="rounded-xl bg-gray-900 border border-white/20 px-4 py-2 text-sm text-white shadow-lg">
                {message}
            </div>
        </motion.div>
    );
}
