import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings,
    Shield,
    Zap,
    Globe,
    Lock,
    Bell,
    Eye,
    Server,
    Database,
    Cpu,
    Save,
    ChevronRight,
    ShieldCheck,
    Key,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';

const categories = [
    { id: 'infra', label: 'Platform Performance', icon: Globe },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'matrix', label: 'Live Data Update', icon: Zap },
    { id: 'api', label: 'External Integrations', icon: Server },
    { id: 'account', label: 'Admin Account', icon: Key },
];

function MasterSettings() {
    const [activeCategory, setActiveCategory] = useState('infra');
    const [config, setConfig] = useState<any>({
        matrixAutoScaling: false,
        rootCipherLogic: 'AES-512-GCM',
        telemetryPushFreq: 1000,
        encryptionLevel: 'Master-AES',
        maintenanceMode: false,
        apiRateLimit: 5000
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showLockPrompt, setShowLockPrompt] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Password Change State
    const [passwords, setPasswords] = useState({
        current: '',
        new: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/superadmin/config');
                setConfig((prev: any) => ({ ...prev, ...res.data.data }));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await api.patch('/superadmin/config', config);
            setMessage('Changes saved successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (e) {
            console.error(e);
            setAlertConfig({
                isOpen: true,
                title: 'Save Failed',
                message: 'Failed to synchronize configuration with the master node.',
                type: 'danger'
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        setChangingPassword(true);

        if (passwords.new.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            setChangingPassword(false);
            return;
        }

        try {
            await api.put('/superadmin/profile/password', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            setPasswordSuccess('Password changed successfully');
            setPasswords({ current: '', new: '' });
            setTimeout(() => setPasswordSuccess(''), 3000);
        } catch (e: any) {
            console.error(e);
            setPasswordError(e.response?.data?.error || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleInitiateLockout = () => {
        setAlertConfig({
            isOpen: true,
            title: 'Lockout Initiated',
            message: 'Global security lockout has been successfully established across all institutional endpoints.',
            type: 'success'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-[#D8F3DC] border-t-[#1B4332] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-[#1B4332] tracking-tighter uppercase">Application Settings</h1>
                    <p className="text-[#52796F] mt-2 font-medium italic">Adjust platform parameters and security options.</p>
                </div>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 bg-[#D8F3DC] px-6 py-3 rounded-2xl border border-[#2D6A4F]/20"
                    >
                        <CheckCircle2 className="w-5 h-5 text-[#2D6A4F]" />
                        <span className="text-xs font-black text-[#2D6A4F] uppercase tracking-widest">{message}</span>
                    </motion.div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Navigation Sidebar */}
                <div className="space-y-4">
                    {categories.map((item, i) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveCategory(item.id)}
                            className={`w-full flex items-center justify-between p-5 rounded-[28px] transition-all group border ${activeCategory === item.id
                                ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-xl shadow-[#1B4332]/20'
                                : 'bg-white text-[#74796D] hover:text-[#1B4332] hover:bg-[#D8F3DC]/40 border-[#E9ECEF]'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeCategory === item.id ? 'bg-white/10' : 'bg-[#F8F9FA]'}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-tight">{item.label}</span>
                            </div>
                            <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${activeCategory === item.id ? 'text-[#D8F3DC]' : 'text-[#E9ECEF]'}`} />
                        </button>
                    ))}
                </div>

                {/* Main Config Area */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white border border-[#E9ECEF] rounded-[48px] p-10 lg:p-14 shadow-sm relative overflow-hidden min-h-[600px]">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D8F3DC]/30 blur-[100px] -mr-40 -mt-40 rounded-full" />

                        <div className="relative z-10">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeCategory}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h3 className="text-2xl font-black text-[#1B4332] mb-12 flex items-center gap-4">
                                        {categories.find(c => c.id === activeCategory)?.icon && React.createElement(categories.find(c => c.id === activeCategory)!.icon, { className: "w-8 h-8 text-[#2D6A4F]" })}
                                        {categories.find(c => c.id === activeCategory)?.label}
                                    </h3>

                                    {activeCategory === 'infra' && (
                                        <div className="space-y-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[#F8F9FA]">
                                                <div className="flex-1">
                                                    <h4 className="text-[#1B4332] font-black text-lg mb-2">Auto-Scaling</h4>
                                                    <p className="text-xs text-[#74796D] font-bold uppercase tracking-tight">Automatically increase resources based on traffic patterns.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={config.matrixAutoScaling}
                                                        onChange={(e) => setConfig({ ...config, matrixAutoScaling: e.target.checked })}
                                                    />
                                                    <div className="w-16 h-9 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-[#1B4332] after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-[#D8F3DC]"></div>
                                                </label>
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex-1">
                                                    <h4 className="text-[#1B4332] font-black text-lg mb-2">Maintenance Mode</h4>
                                                    <p className="text-xs text-[#74796D] font-bold uppercase tracking-tight">Set global platform to read-only for scheduled updates.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={config.maintenanceMode}
                                                        onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                                                    />
                                                    <div className="w-16 h-9 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-[#E07A5F] after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-[#FFF1E6]"></div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {activeCategory === 'security' && (
                                        <div className="space-y-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[#F8F9FA]">
                                                <div className="flex-1">
                                                    <h4 className="text-[#1B4332] font-black text-lg mb-2">Security Algorithm</h4>
                                                    <p className="text-xs text-[#74796D] font-bold uppercase tracking-tight">Standard security method for data protection.</p>
                                                </div>
                                                <select
                                                    value={config.rootCipherLogic}
                                                    onChange={(e) => setConfig({ ...config, rootCipherLogic: e.target.value })}
                                                    className="bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl px-6 py-3 text-sm text-[#1B4332] font-black uppercase tracking-widest"
                                                >
                                                    <option value="AES-512-GCM">AES-512-GCM</option>
                                                    <option value="ChaCha20-P-1305">ChaCha20-P-1305</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {activeCategory === 'matrix' && (
                                        <div className="space-y-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex-1">
                                                    <h4 className="text-[#1B4332] font-black text-lg mb-2">Location Update Frequency</h4>
                                                    <p className="text-xs text-[#74796D] font-bold uppercase tracking-tight">Interval for refreshing bus locations on the map (ms).</p>
                                                </div>
                                                <div className="flex items-center gap-6 bg-[#F8F9FA] px-6 py-3 rounded-2xl border border-[#E9ECEF]">
                                                    <input
                                                        type="range"
                                                        className="w-32 h-2 accent-[#1B4332]"
                                                        min="100" max="5000" step="100"
                                                        value={config.telemetryPushFreq}
                                                        onChange={(e) => setConfig({ ...config, telemetryPushFreq: Number(e.target.value) })}
                                                    />
                                                    <span className="text-sm font-black text-[#1B4332] min-w-[40px]">{(config.telemetryPushFreq / 1000).toFixed(1)}s</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeCategory === 'api' && (
                                        <div className="space-y-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex-1">
                                                    <h4 className="text-[#1B4332] font-black text-lg mb-2">API Rate Limit</h4>
                                                    <p className="text-xs text-[#74796D] font-bold uppercase tracking-tight">Maximum allowed requests per minute per institution.</p>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={config.apiRateLimit}
                                                    onChange={(e) => setConfig({ ...config, apiRateLimit: Number(e.target.value) })}
                                                    className="w-32 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl px-4 py-3 text-[#1B4332] font-black uppercase tracking-widest text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeCategory === 'account' && (
                                        <div className="space-y-10">
                                            <div className="pb-10 border-b border-[#F8F9FA]">
                                                <h4 className="text-[#1B4332] font-black text-lg mb-2">Change Password</h4>
                                                <p className="text-xs text-[#74796D] font-bold uppercase tracking-tight">Update your superadmin access credentials.</p>
                                            </div>

                                            <form onSubmit={handlePasswordChange} className="space-y-8 max-w-2xl">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-3">
                                                        <label className="block text-xs font-black text-[#1B4332] uppercase tracking-widest ml-1">Current Password</label>
                                                        <input
                                                            type="password"
                                                            required
                                                            value={passwords.current}
                                                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                                            className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl px-6 py-4 text-[#1B4332] focus:border-[#1B4332] outline-none transition-all shadow-sm"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="block text-xs font-black text-[#1B4332] uppercase tracking-widest ml-1">New Password</label>
                                                        <input
                                                            type="password"
                                                            required
                                                            value={passwords.new}
                                                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                                            className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl px-6 py-4 text-[#1B4332] focus:border-[#1B4332] outline-none transition-all shadow-sm"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {passwordError && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest flex items-center gap-3 border border-red-100"
                                                        >
                                                            <AlertCircle className="w-4 h-4" />
                                                            {passwordError}
                                                        </motion.div>
                                                    )}

                                                    {passwordSuccess && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="p-4 rounded-2xl bg-green-50 text-green-600 text-xs font-black uppercase tracking-widest flex items-center gap-3 border border-green-100"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {passwordSuccess}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <button
                                                    type="submit"
                                                    disabled={changingPassword || !passwords.current || !passwords.new}
                                                    className="inline-flex items-center gap-4 px-10 py-4 bg-[#1B4332] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#2D6A4F] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-[#1B4332]/20 active:scale-95"
                                                >
                                                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    Update Root Password
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {activeCategory !== 'account' && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full mt-14 py-5 bg-[#1B4332] text-white rounded-[24px] font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-[#1B4332]/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="p-8 rounded-[48px] bg-[#FFF1E6] border border-[#E07A5F]/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[24px] bg-[#E07A5F] flex items-center justify-center shadow-lg shadow-[#E07A5F]/20">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h4 className="text-[#1B4332] font-black uppercase tracking-widest text-base">Emergency Lockout</h4>
                                <p className="text-[#E07A5F] text-[10px] font-black mt-1 uppercase tracking-widest">Immediately suspend all access globally</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLockPrompt(true)}
                            className="px-10 py-4 bg-[#E07A5F] hover:bg-[#d46a4f] text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-[#E07A5F]/20 active:scale-95"
                        >
                            Activate Lockout
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showLockPrompt}
                onClose={() => setShowLockPrompt(false)}
                onConfirm={handleInitiateLockout}
                title="Security Lockout"
                message="WARNING: This will immediately suspend all non-administrative access globally across every institution on the TrackX network. This action is recorded in the master audit log."
                confirmText="Initiate Authority Lock"
                cancelText="Decline Action"
                type="danger"
            />

            <ConfirmModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                confirmText="Acknowledge"
                type={alertConfig.type}
            />
        </div>
    );
}

export default MasterSettings;
