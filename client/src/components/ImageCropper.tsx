/**
 * Image Cropper Modal Component
 * Human-Centered Design - Sage Green Theme
 * Allows users to crop profile photos before uploading
 */

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
    aspectRatio?: number;
}

// Center a crop on the image
function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    );
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    isOpen,
    imageSrc,
    onClose,
    onCropComplete,
    aspectRatio = 1, // Default to square crop for profile photos
}) => {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [scale, setScale] = useState(1);
    const [rotate, setRotate] = useState(0);
    const imgRef = useRef<HTMLImageElement>(null);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspectRatio));
    }, [aspectRatio]);

    const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
        const image = imgRef.current;
        if (!image || !completedCrop) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        // Set canvas size to the crop size
        const pixelRatio = window.devicePixelRatio;
        canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
        canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingQuality = 'high';

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        // Calculate center point for rotation
        const centerX = image.naturalWidth / 2;
        const centerY = image.naturalHeight / 2;

        ctx.save();

        // Move to center, rotate, scale, then draw
        ctx.translate(-cropX, -cropY);
        ctx.translate(centerX, centerY);
        ctx.rotate((rotate * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        ctx.drawImage(image, 0, 0);

        ctx.restore();

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                'image/jpeg',
                0.9 // Quality
            );
        });
    }, [completedCrop, rotate, scale]);

    const handleConfirm = async () => {
        const blob = await getCroppedImg();
        if (blob) {
            onCropComplete(blob);
            onClose();
        }
    };

    const handleReset = () => {
        setScale(1);
        setRotate(0);
        if (imgRef.current) {
            const { width, height } = imgRef.current;
            setCrop(centerAspectCrop(width, height, aspectRatio));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#1B4332]/40 backdrop-blur-md p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 50 }}
                    className="bg-[#FDFBF7] rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-[#E9ECEF]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 bg-white border-b border-[#E9ECEF]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#D8F3DC] flex items-center justify-center">
                                <Check className="w-5 h-5 text-[#2D6A4F]" />
                            </div>
                            <h3 className="text-xl font-bold text-[#1B4332]">Photo Editor</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#74796D] transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Crop Area */}
                    <div className="p-8 bg-[#FDFBF7] flex justify-center items-center min-h-[300px] max-h-[450px] overflow-hidden">
                        <div className="relative rounded-3xl overflow-hidden shadow-inner bg-white p-2 border-2 border-[#E9ECEF]">
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspectRatio}
                                circularCrop
                                className="max-w-full"
                            >
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="Crop preview"
                                    style={{
                                        transform: `scale(${scale}) rotate(${rotate}deg)`,
                                        maxHeight: '350px',
                                        borderRadius: '1rem'
                                    }}
                                    onLoad={onImageLoad}
                                    className="transition-transform duration-300"
                                />
                            </ReactCrop>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-8 bg-white border-t border-[#E9ECEF] space-y-8">
                        {/* Zoom Control */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black text-[#95A3A4] uppercase tracking-widest">Adjust Zoom</span>
                                <span className="text-xs font-bold text-[#2D6A4F]">{Math.round(scale * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 text-[#74796D] hover:text-[#2D6A4F]">
                                    <ZoomOut className="w-5 h-5" />
                                </button>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.01"
                                    value={scale}
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-[#D8F3DC] rounded-full appearance-none cursor-pointer accent-[#2D6A4F]"
                                />
                                <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 text-[#74796D] hover:text-[#2D6A4F]">
                                    <ZoomIn className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleReset}
                                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#74796D] font-bold text-sm transition-all border border-[#E9ECEF]"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-[2] flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-br from-[#2D6A4F] to-[#40916C] text-white font-bold text-sm shadow-xl shadow-[#2D6A4F]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Check className="w-5 h-5" />
                                Update Profile Photo
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageCropper;
