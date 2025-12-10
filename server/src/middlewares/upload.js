/**
 * ============================================
 * File Upload Middleware
 * ============================================
 * Multer configuration for driver photo uploads
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subDir = path.join(uploadDir, 'drivers');
        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
        }
        cb(null, subDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

// File filter for images only
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
};

// Configure multer
export const upload = multer({
    storage,
    fileFilter: imageFilter,
    limits: {
        fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024, // 5MB default
    },
});

export default upload;
