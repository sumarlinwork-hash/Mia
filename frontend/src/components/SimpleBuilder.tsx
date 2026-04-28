// Simple Builder - Phase 2.5
// Allow app creation in < 60 seconds for non-technical users
// Dual-mode: Simple Mode (NEW) + Advanced Mode (EXISTING SkillWizard)

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Bot, PenTool, Workflow, BarChart3, Sparkles } from 'lucide-react';

interface SimpleBuilderProps {
    onClose: () => void;
    onComplete: (manifest: Record<string, unknown>) => void;
    onSwitchToAdvanced: () => void;
}

interface TemplateOption {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    capabilities: string[];
    permissions: string[];
    execution_mode: 'instant' | 'setup_required';
}

const TEMPLATES: TemplateOption[] = [
    {
        id: 'chatbot',
        name: 'Chatbot',
        description: 'Conversational AI assistant for interactive dialogues',
        icon: <Bot size={24} />,
        capabilities: ['conversation', 'llm'],
        permissions: ['llm_access'],
        execution_mode: 'instant',
    },
    {
        id: 'content_generator',
        name: 'Content Generator',
        description: 'Generate written content, articles, and creative copy',
        icon: <PenTool size={24} />,
        capabilities: ['writing', 'creative'],
        permissions: ['llm_access'],
        execution_mode: 'instant',
    },
    {
        id: 'automation',
        name: 'Automation',
        description: 'Automate repetitive tasks and workflows',
        icon: <Workflow size={24} />,
        capabilities: ['automation'],
        permissions: ['external_api'],
        execution_mode: 'setup_required',
    },
    {
        id: 'data_analyzer',
        name: 'Data Analyzer',
        description: 'Analyze and visualize data with natural language',
        icon: <BarChart3 size={24} />,
        capabilities: ['analysis', 'calculation'],
        permissions: ['llm_access'],
        execution_mode: 'instant',
    },
];

interface FormData {
    name: string;
    purpose: string;
    template: string;
    customTone?: string;
    customDomain?: string;
}

export function SimpleBuilder({ onClose, onComplete, onSwitchToAdvanced }: SimpleBuilderProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        purpose: '',
        template: '',
    });
    const [generating, setGenerating] = useState(false);

    const generateAIDescription = async () => {
        if (!formData.name || !formData.template) return;
        setGenerating(true);
        try {
            const resp = await fetch('http://localhost:8000/api/discovery/builder/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name, template: formData.template })
            });
            const data = await resp.json();
            if (data.status === 'success') {
                setFormData(prev => ({ ...prev, purpose: data.description }));
            }
        } catch (err) {
            console.error("AI Generation failed", err);
        } finally {
            setGenerating(false);
        }
    };

    const steps = [
        'Choose Template',
        'Fill Details',
        'Review & Create',
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const generateManifest = () => {
        const template = TEMPLATES.find(t => t.id === formData.template);
        if (!template) return null;

        return {
            id: formData.name.toLowerCase().replace(/\s+/g, '_'),
            name: formData.name,
            description: formData.purpose,
            capabilities: template.capabilities,
            permissions: template.permissions,
            execution_mode: template.execution_mode,
            version: '1.0.0',
            preview: {
                type: 'interactive',
                mode: 'template',
                template: `${template.id}_demo`,
            },
        };
    };

    const isCurrentStepValid = () => {
        if (currentStep === 0) {
            return formData.template !== '';
        }
        if (currentStep === 1) {
            return formData.name.trim() !== '' && formData.purpose.trim() !== '';
        }
        return true;
    };

    const selectedTemplate = TEMPLATES.find(t => t.id === formData.template);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[260] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl rounded-3xl border border-primary/30 bg-gradient-to-br from-gray-900 to-black"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={18} className="text-primary" />
                                <span className="text-xs uppercase tracking-widest text-primary font-bold">Simple Builder</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Create your own AI app</h3>
                            <p className="text-white/60 text-sm mt-1">Build in under 60 seconds - no coding required</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Mode Selection */}
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                        <button className="flex-1 py-2 rounded-lg bg-primary text-black text-sm font-bold">
                            Simple Mode
                        </button>
                        <button
                            onClick={onSwitchToAdvanced}
                            className="flex-1 py-2 rounded-lg text-white/60 text-sm font-bold hover:bg-white/10 hover:text-white transition-all"
                        >
                            Advanced Mode
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="px-6 pt-4">
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2 mb-4">
                        {steps.map((step, index) => (
                            <div
                                key={step}
                                className={`text-xs font-bold ${index <= currentStep ? 'text-primary' : 'text-white/30'
                                    }`}
                            >
                                Step {index + 1}: {step}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step content */}
                <div className="p-6 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: Choose Template */}
                        {currentStep === 0 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h4 className="text-lg font-bold text-white mb-2">Choose a template</h4>
                                <p className="text-white/60 text-sm mb-6">Select the type of app you want to create</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {TEMPLATES.map(template => (
                                        <button
                                            key={template.id}
                                            onClick={() => setFormData(prev => ({ ...prev, template: template.id }))}
                                            className={`p-5 rounded-2xl border-2 text-left transition-all ${formData.template === template.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`p-2 rounded-xl ${formData.template === template.id
                                                    ? 'bg-primary text-black'
                                                    : 'bg-white/10 text-white/70'
                                                    }`}>
                                                    {template.icon}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">{template.name}</div>
                                                    <div className="text-xs text-white/50 mt-1">{template.description}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${template.execution_mode === 'instant'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {template.execution_mode === 'instant' ? 'Instant' : 'Setup Required'}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Fill Details */}
                        {currentStep === 1 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h4 className="text-lg font-bold text-white mb-2">Fill in the details</h4>
                                <p className="text-white/60 text-sm mb-6">Tell us about your new AI app</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            App Name <span className="text-primary">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., My Creative Writer"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-white/80">
                                                Purpose / Description <span className="text-primary">*</span>
                                            </label>
                                            <button
                                                onClick={generateAIDescription}
                                                disabled={generating || !formData.name || !formData.template}
                                                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all disabled:opacity-30"
                                            >
                                                {generating ? (
                                                    <span className="flex items-center gap-1 animate-pulse"><Sparkles size={10} className="animate-spin" /> Thinking...</span>
                                                ) : (
                                                    <><Sparkles size={10} /> Auto-generate AI</>
                                                )}
                                            </button>
                                        </div>
                                        <textarea
                                            value={formData.purpose}
                                            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                                            placeholder="What does this app do? How will it help users?"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all h-24 resize-none"
                                        />
                                    </div>

                                    {formData.template === 'chatbot' && (
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">
                                                Conversation Tone (Optional)
                                            </label>
                                            <select
                                                value={formData.customTone || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, customTone: e.target.value }))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                                            >
                                                <option value="">Default (Professional)</option>
                                                <option value="friendly">Friendly & Casual</option>
                                                <option value="professional">Professional & Formal</option>
                                                <option value="humorous">Humorous & Witty</option>
                                            </select>
                                        </div>
                                    )}

                                    {formData.template === 'content_generator' && (
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">
                                                Content Domain (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customDomain || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value }))}
                                                placeholder="e.g., marketing, blog, social media"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Review & Create */}
                        {currentStep === 2 && selectedTemplate && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h4 className="text-lg font-bold text-white mb-2">Review your app</h4>
                                <p className="text-white/60 text-sm mb-6">Check everything before creating</p>

                                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-1">App Name</div>
                                        <div className="text-white font-bold text-lg">{formData.name}</div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-1">Description</div>
                                        <div className="text-white/80 text-sm">{formData.purpose}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[11px] uppercase tracking-widest text-white/45 mb-1">Template</div>
                                            <div className="flex items-center gap-2 text-white font-semibold">
                                                {selectedTemplate.icon}
                                                {selectedTemplate.name}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] uppercase tracking-widest text-white/45 mb-1">Execution Mode</div>
                                            <div className={`text-sm font-bold ${selectedTemplate.execution_mode === 'instant' ? 'text-green-400' : 'text-yellow-400'
                                                }`}>
                                                {selectedTemplate.execution_mode === 'instant' ? '⚡ Instant' : '⚙️ Setup Required'}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-2">Capabilities</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTemplate.capabilities.map(cap => (
                                                <span key={cap} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-bold uppercase">
                                                    {cap}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-2">Permissions</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTemplate.permissions.map(perm => (
                                                <span key={perm} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs">
                                                    {perm.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-5 py-2.5 rounded-xl bg-white/5 text-white/70 font-bold hover:bg-white/10 transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={currentStep === 2 ? () => onComplete(generateManifest()!) : handleNext}
                            disabled={currentStep < 2 && !isCurrentStepValid()}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${currentStep === 2
                                ? 'bg-primary text-black hover:brightness-110'
                                : isCurrentStepValid()
                                    ? 'bg-primary text-black hover:brightness-110'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            {currentStep === 2 ? (
                                <>
                                    <Sparkles size={16} />
                                    Create App
                                </>
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default SimpleBuilder;
