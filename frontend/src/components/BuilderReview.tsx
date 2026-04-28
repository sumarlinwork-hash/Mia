// Builder Review Component - Phase 2.5.3
// Quality gate for auto-generated apps before saving to marketplace

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, AlertCircle, Edit2, Save } from 'lucide-react';

interface BuilderReviewProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manifest: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSave: (manifest: Record<string, any>) => void;
    onEdit: () => void;
    onCancel: () => void;
}

export function BuilderReview({ manifest: rawManifest, onSave, onEdit, onCancel }: BuilderReviewProps) {
    const manifest = rawManifest;
    const [editableFields, setEditableFields] = useState({
        name: (manifest.name as string) || '',
        description: (manifest.description as string) || '',
    });
    const [isEditing, setIsEditing] = useState(false);

    const validateManifest = () => {
        const errors: string[] = [];

        if (!editableFields.name || editableFields.name.trim() === '') {
            errors.push('App name is required');
        }

        if (!editableFields.description || editableFields.description.trim() === '') {
            errors.push('Description is required');
        }

        const capabilities = (manifest.capabilities as string[]) || [];
        if (!capabilities || capabilities.length === 0) {
            errors.push('At least one capability is required');
        }

        return errors;
    };

    const errors = validateManifest();
    const isValid = errors.length === 0;

    const handleSave = () => {
        if (!isValid) return;

        const updatedManifest = {
            ...manifest,
            ...editableFields,
        };

        onSave(updatedManifest);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[270] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br from-gray-900 to-black max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {isValid ? (
                                    <Check size={18} className="text-green-400" />
                                ) : (
                                    <AlertCircle size={18} className="text-yellow-400" />
                                )}
                                <span className={`text-xs uppercase tracking-widest font-bold ${isValid ? 'text-green-400' : 'text-yellow-400'
                                    }`}>
                                    Quality Review
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Review your AI app</h3>
                            <p className="text-white/60 text-sm mt-1">Check everything before publishing</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Validation Errors */}
                {errors.length > 0 && (
                    <div className="mx-6 mt-4 p-4 rounded-xl border border-yellow-400/30 bg-yellow-400/10">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-yellow-400 mt-0.5" />
                            <div>
                                <div className="text-yellow-400 font-bold text-sm">Please fix these issues:</div>
                                <ul className="mt-2 space-y-1">
                                    {errors.map((error, index) => (
                                        <li key={index} className="text-yellow-400/80 text-sm">• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review Content */}
                <div className="p-6 space-y-5">
                    {/* App Name */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] uppercase tracking-widest text-white/45">App Name</div>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editableFields.name}
                                onChange={(e) => setEditableFields(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary transition-all"
                                placeholder="Enter app name..."
                            />
                        ) : (
                            <div className="text-white font-bold text-xl">{(editableFields.name as string) || 'Not set'}</div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] uppercase tracking-widest text-white/45">Description</div>
                            {isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                            <textarea
                                value={editableFields.description}
                                onChange={(e) => setEditableFields(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-primary transition-all h-20 resize-none"
                                placeholder="What does this app do?"
                            />
                        ) : (
                            <div className="text-white/80">{(editableFields.description as string) || 'Not set'}</div>
                        )}
                    </div>

                    {/* Capabilities */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-3">Capabilities</div>
                        <div className="flex flex-wrap gap-2">
                            {((manifest.capabilities as string[]) || []).length > 0 ? (
                                ((manifest.capabilities as string[]) || []).map((cap: string) => (
                                    <span key={cap} className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-bold uppercase">
                                        {(cap as string).replace(/_/g, ' ')}
                                    </span>
                                ))
                            ) : (
                                <div className="text-white/50 text-sm">No capabilities detected</div>
                            )}
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-3">Required Permissions</div>
                        <div className="flex flex-wrap gap-2">
                            {(manifest.permissions as string[]) && (manifest.permissions as string[]).length > 0 ? (
                                (manifest.permissions as string[]).map((perm: string) => (
                                    <span key={perm} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs">
                                        {perm.replace(/_/g, ' ')}
                                    </span>
                                ))
                            ) : (
                                <div className="text-white/50 text-sm">No permissions required</div>
                            )}
                        </div>
                    </div>

                    {/* Execution Mode */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="text-[11px] uppercase tracking-widest text-white/45 mb-3">Execution Mode</div>
                        <div className={`text-sm font-bold ${manifest.execution_mode === 'instant'
                            ? 'text-green-400'
                            : 'text-yellow-400'
                            }`}>
                            {manifest.execution_mode === 'instant' ? (
                                <div className="flex items-center gap-2">
                                    <span>⚡</span>
                                    <span>Instant - Can execute immediately</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>⚙️</span>
                                    <span>Setup Required - User must configure before use</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sample Preview (if available) */}
                    {manifest.preview && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="text-[11px] uppercase tracking-widest text-white/45 mb-3">Preview Mode</div>
                            <div className="text-white/80 text-sm">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(manifest.preview as any)?.type === 'interactive' ? 'Interactive preview available' : 'Static preview'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onEdit}
                            className="px-5 py-2.5 rounded-xl bg-white/5 text-white/70 font-bold hover:bg-white/10 transition-all"
                        >
                            Edit Details
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isValid}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${isValid
                                ? 'bg-primary text-black hover:brightness-110'
                                : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }`}
                        >
                            <Save size={16} />
                            Save & Publish
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default BuilderReview;
