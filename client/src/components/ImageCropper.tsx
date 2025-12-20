/**
 * Image Cropper Modal Component
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-dark-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-dark-700">
                        <h3 className="text-lg font-semibold text-white">Crop Photo</h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Crop Area */}
                    <div className="p-4 bg-dark-900 flex justify-center items-center min-h-[300px] max-h-[400px] overflow-auto">
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
                                }}
                                onLoad={onImageLoad}
                                className="transition-transform"
                            />
                        </ReactCrop>
                    </div>

                    {/* Controls */}
                    <div className="p-4 border-t border-dark-700 space-y-4">
                        {/* Zoom Control */}
                        <div className="flex items-center gap-4">
                            <ZoomOut className="w-4 h-4 text-gray-400" />
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={scale}
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <ZoomIn className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleReset}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dark-700 hover:bg-dark-600 text-gray-300 font-medium transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Apply
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageCropper;
