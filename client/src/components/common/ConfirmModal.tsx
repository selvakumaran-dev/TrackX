import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Check, Info, ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
}) => {
    const typeStyles = {
        danger: {
            icon: <ShieldAlert className="w-8 h-8 text-[#E07A5F]" />,
            bg: 'bg-[#FFF1E6]',
            accent: 'bg-[#E07A5F]',
            border: 'border-[#E07A5F]/20',
            button: 'bg-[#E07A5F] hover:bg-[#D66D52] shadow-xl shadow-[#E07A5F]/20',
            glow: 'shadow-[#E07A5F]/10'
        },
        warning: {
            icon: <AlertTriangle className="w-8 h-8 text-[#F4A261]" />,
            bg: 'bg-[#FEF3C7]/20',
            accent: 'bg-[#F4A261]',
            border: 'border-[#F4A261]/20',
            button: 'bg-[#F4A261] hover:bg-[#E09151] shadow-xl shadow-[#F4A261]/20',
            glow: 'shadow-[#F4A261]/10'
        },
        info: {
            icon: <Info className="w-8 h-8 text-[#457B9D]" />,
            bg: 'bg-[#E8F4F8]',
            accent: 'bg-[#457B9D]',
            border: 'border-[#457B9D]/20',
            button: 'bg-[#457B9D] hover:bg-[#1D3557] shadow-xl shadow-[#457B9D]/20',
            glow: 'shadow-[#457B9D]/10'
        },
        success: {
            icon: <Check className="w-8 h-8 text-[#2D6A4F]" />,
            bg: 'bg-[#D8F3DC]/40',
            accent: 'bg-[#2D6A4F]',
            border: 'border-[#2D6A4F]/20',
            button: 'bg-[#2D6A4F] hover:bg-[#1B4332] shadow-xl shadow-[#2D6A4F]/20',
            glow: 'shadow-[#2D6A4F]/10'
        }
    };

    const style = typeStyles[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                    {/* High-fidelity Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-[#1B4332]/40 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Professional Box Modal */}
                    <motion.div
                        className={`relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-[#E9ECEF] flex flex-col ${style.glow}`}
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    >
                        {/* Top Accent Strip */}
                        <div className={`h-1.5 w-full ${style.accent}`} />

                        {/* Status Header */}
                        <div className={`px-6 sm:px-10 pt-10 pb-8 ${style.bg} relative overflow-hidden`}>
                            {/* Decorative Grid */}
                            <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                                <svg width="100%" height="100%">
                                    <pattern id="modal-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
                                    </pattern>
                                    <rect width="100%" height="100%" fill="url(#modal-grid)" />
                                </svg>
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-20 h-20 bg-white rounded-[24px] shadow-2xl flex items-center justify-center border border-[#E9ECEF] mb-6">
                                    {style.icon}
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tighter uppercase text-center leading-tight">
                                    {title}
                                </h3>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-xl bg-white/50 hover:bg-white text-[#74796D] hover:text-[#1B4332] transition-all shadow-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Message Content */}
                        <div className="px-6 sm:px-10 py-8 sm:py-10 bg-white">
                            <p className="text-[#52796F] text-center font-bold leading-relaxed text-sm sm:text-base">
                                {message}
                            </p>
                        </div>

                        {/* Action Area (Boxy Footer) */}
                        <div className="px-6 sm:px-10 pb-8 sm:pb-10 flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`w-full py-4 sm:py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.3em] text-white transition-all active:scale-95 shadow-lg ${style.button}`}
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 sm:py-5 rounded-[20px] font-black text-[10px] uppercase tracking-[0.3em] text-[#74796D] bg-[#F8F9FA] hover:bg-[#E9ECEF] border border-[#E9ECEF] transition-all active:scale-95"
                            >
                                {cancelText}
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
