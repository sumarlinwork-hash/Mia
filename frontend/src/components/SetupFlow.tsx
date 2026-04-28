// Setup Flow Component - Phase 1.4.C.2
// Handles apps requiring setup before execution (API keys, config, permissions)

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Key, Settings, Shield, ArrowRight, Check } from 'lucide-react';

interface SetupStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface SetupField {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select';
    placeholder?: string;
    required?: boolean;
    options?: string[];
}

interface SetupFlowProps {
    appName: string;
    setupFields?: SetupField[];
    requiredPermissions?: string[];
    onComplete: (config: Record<string, string>) => void;
    onCancel: () => void;
}

const DEFAULT_FIELDS: SetupField[] = [
    {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key...',
        required: true,
    },
];

export function SetupFlow({
    appName,
    setupFields = DEFAULT_FIELDS,
    requiredPermissions = [],
    onComplete,
    onCancel,
}: SetupFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [agreedToPermissions, setAgreedToPermissions] = useState(false);

    const steps: SetupStep[] = [
        {
            id: 'config',
            title: 'Configure App',
            description: 'Enter the required settings to get started',
            icon: <Settings size={20} />,
        },
        {
            id: 'permissions',
            title: 'Grant Permissions',
            description: 'Review and accept the required permissions',
            icon: <Shield size={20} />,
        },
        {
            id: 'complete',
            title: 'Ready to Launch',
            description: 'Everything is set up and ready to use',
            icon: <Check size={20} />,
        },
    ];

    const handleFieldChange = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete(config);
        }
    };

    const isCurrentStepValid = () => {
        if (currentStep === 0) {
            // Check if all required fields are filled
            return setupFields.every(field =>
                !field.required || (config[field.key] && config[field.key].trim() !== '')
            );
        }
        if (currentStep === 1) {
            return agreedToPermissions;
        }
        return true;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-black p-6"
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-white">Set up {appName}</h3>
                        <p className="text-white/60 text-sm mt-1">Complete these steps to start using the app</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mb-6 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6">
                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`flex items-center gap-2 ${index < steps.length - 1 ? 'flex-1' : ''}`}
                        >
                            <div
                                className={`p-2 rounded-full ${index <= currentStep
                                    ? 'bg-primary text-black'
                                    : 'bg-white/5 text-white/30'
                                    }`}
                            >
                                {step.icon}
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-px ${index < currentStep ? 'bg-primary' : 'bg-white/10'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step content */}
                <div className="min-h-[300px]">
                    {currentStep === 0 && (
                        <div>
                            <h4 className="text-lg font-bold text-white mb-4">Configure Settings</h4>
                            <div className="space-y-4">
                                {setupFields.map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            {field.label}
                                            {field.required && <span className="text-primary ml-1">*</span>}
                                        </label>
                                        {field.type === 'password' ? (
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                                <input
                                                    id={field.key}
                                                    name={field.key}
                                                    type="password"
                                                    value={config[field.key] || ''}
                                                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                        ) : field.type === 'select' && field.options ? (
                                            <select
                                                id={field.key}
                                                name={field.key}
                                                value={config[field.key] || ''}
                                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                                            >
                                                <option value="">Select an option...</option>
                                                {field.options.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                id={field.key}
                                                name={field.key}
                                                type="text"
                                                value={config[field.key] || ''}
                                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                placeholder={field.placeholder}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div>
                            <h4 className="text-lg font-bold text-white mb-4">Required Permissions</h4>
                            <p className="text-white/60 text-sm mb-4">
                                This app needs the following permissions to function:
                            </p>
                            <div className="space-y-2 mb-6">
                                {requiredPermissions.length > 0 ? (
                                    requiredPermissions.map(perm => (
                                        <div key={perm} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Shield size={14} className="text-primary" />
                                                <span className="text-sm text-white/80">{perm}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-primary" />
                                            <span className="text-sm text-white/80">Access to AI services</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    id="consent-check"
                                    name="consent-check"
                                    type="checkbox"
                                    checked={agreedToPermissions}
                                    onChange={(e) => setAgreedToPermissions(e.target.checked)}
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-white/70">
                                    I understand and consent to these permissions being granted
                                </span>
                            </label>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="text-center py-8">
                            <div className="inline-flex p-4 rounded-full bg-primary/20 text-primary mb-4">
                                <Check size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">All Set!</h4>
                            <p className="text-white/60">
                                {appName} is configured and ready to use
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/10">
                    {currentStep > 0 && (
                        <button
                            onClick={() => setCurrentStep(currentStep - 1)}
                            className="px-4 py-2.5 rounded-xl bg-white/5 text-white/70 font-bold hover:bg-white/10 transition-all"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={!isCurrentStepValid()}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${isCurrentStepValid()
                            ? 'bg-primary text-black hover:brightness-110'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                            }`}
                    >
                        {currentStep === steps.length - 1 ? (
                            <>
                                Launch App
                                <ArrowRight size={16} />
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default SetupFlow;
