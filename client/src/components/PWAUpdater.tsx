import React, { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import ConfirmModal from './common/ConfirmModal';

const PWAUpdater: React.FC = () => {
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [needRefresh, setNeedRefresh] = useState(false);

    const [updateSWFn, setUpdateSWFn] = useState<((reload?: boolean) => Promise<void>) | null>(null);

    useEffect(() => {
        const updateSW = registerSW({
            onNeedRefresh() {
                setNeedRefresh(true);
                setShowUpdateModal(true);
            },
            onOfflineReady() {
                console.log('App ready to work offline');
            },
        });
        setUpdateSWFn(() => updateSW);
    }, []);

    const handleConfirm = () => {
        if (needRefresh && updateSWFn) {
            updateSWFn(true);
        }
        setShowUpdateModal(false);
    };

    const handleClose = () => {
        setShowUpdateModal(false);
    };

    return (
        <ConfirmModal
            isOpen={showUpdateModal}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title="Update Available"
            message="A new version of TrackX is available. Would you like to update now for the best experience?"
            confirmText="Update Now"
            cancelText="Later"
            type="info"
        />
    );
};

export default PWAUpdater;
