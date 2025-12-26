import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    ShieldCheck,
    Users,
    Bus,
    Search,
    Filter,
    ArrowUpRight,
    Mail,
    Phone,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Clock,
    Globe,
    Plus,
    X,
    Trash2,
    Edit2,
    Save,
    Loader2
} from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/common/ConfirmModal';

interface Organization {
    id: string;
    name: string;
    code: string;
    contactEmail: string | null;
    contactPhone: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
    _count: {
        buses: number;
        drivers: number;
        admins: number;
    };
    primaryColor: string;
}

function MasterOrganizations() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, name: string } | null>(null);
    const [alertModal, setAlertModal] = useState<{ title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        contactEmail: '',
        contactPhone: '',
        primaryColor: '#2D6A4F',
        isActive: true,
        isVerified: true
    });
    const [saving, setSaving] = useState(false);

    const fetchOrgs = async () => {
        try {
            const res = await api.get('/superadmin/organizations');
            setOrgs(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    const handleOpenModal = (org: Organization | null = null) => {
        if (org) {
            setEditingOrg(org);
            setFormData({
                name: org.name,
                code: org.code,
                contactEmail: org.contactEmail || '',
                contactPhone: org.contactPhone || '',
                primaryColor: org.primaryColor || '#2D6A4F',
                isActive: org.isActive,
                isVerified: org.isVerified
            });
        } else {
            setEditingOrg(null);
            setFormData({
                name: '',
                code: '',
                contactEmail: '',
                contactPhone: '',
                primaryColor: '#2D6A4F',
                isActive: true,
                isVerified: true
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingOrg) {
                await api.put(`/superadmin/organizations/${editingOrg.id}`, formData);
            } else {
                await api.post('/superadmin/organizations', formData);
            }
            await fetchOrgs();
            setModalOpen(false);
        } catch (error: any) {
            console.error('Failed to save organization:', error);
            setAlertModal({
                title: 'Operation Failed',
                message: error.response?.data?.error || 'Failed to save organization. Please check for duplicate codes.',
                type: 'danger'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            await api.delete(`/superadmin/organizations/${confirmDelete.id}`);
            await fetchOrgs();
            setConfirmDelete(null);
        } catch (error: any) {
            console.error('Failed to delete organization:', error);
            setAlertModal({
                title: 'Deletion Denied',
                message: error.response?.data?.error || 'Failed to delete. Ensure this organization has no active data or users.',
                type: 'danger'
            });
        }
    };

    const filteredOrgs = orgs.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-[#D8F3DC] border-t-[#1B4332] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 border-b border-[#E9ECEF] pb-12 mb-12">
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <h1 className="text-3xl md:text-5xl font-black text-[#1B4332] tracking-tighter uppercase leading-[0.9]">
                            Manage<br className="hidden md:block lg:hidden" /> Institutions
                        </h1>
                        <div className="h-4 w-px bg-[#D8F3DC] hidden md:block" />
                        <div className="px-5 py-2 bg-[#D8F3DC] border border-[#2D6A4F]/10 rounded-2xl flex items-center gap-3 shadow-sm shadow-[#1B4332]/5">
                            <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
                            <span className="text-[10px] font-black text-[#2D6A4F] uppercase tracking-[0.2em]">Authority Control</span>
                        </div>
                    </div>
                    <p className="text-lg text-[#52796F] font-medium italic opacity-80">High-level administration for all licensed institutions.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group w-full sm:w-80">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#95A3A4] group-focus-within:text-[#2D6A4F] transition-colors" />
                        <input
                            type="text"
                            placeholder="Find institution by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border-2 border-[#E9ECEF] rounded-[24px] pl-14 pr-8 py-4 text-sm text-[#1B4332] focus:outline-none focus:border-[#2D6A4F] focus:ring-4 focus:ring-[#D8F3DC]/30 transition-all w-full font-bold shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto bg-[#1B4332] text-white px-8 py-4 rounded-[24px] flex items-center justify-center gap-4 font-black text-[11px] uppercase tracking-[0.25em] shadow-xl shadow-[#1B4332]/30 hover:bg-[#2D6A4F] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        Add Institution
                    </button>
                </div>
            </div>

            {/* Organizations Grid - Refined Desktop Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-10">
                {filteredOrgs.map((org, i) => (
                    <motion.div
                        key={org.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -8, shadow: '0 25px 50px -12px rgba(27,67,50,0.12)' }}
                        className="bg-white rounded-[40px] border border-[#E9ECEF] overflow-hidden shadow-sm flex flex-col group h-full transition-all relative"
                    >
                        {/* Status Ribbon */}
                        <div className="h-4 bg-[#F8F9FA] flex gap-1 px-1">
                            <div className="flex-1 rounded-full h-1 mt-1.5 opacity-20" style={{ backgroundColor: org.primaryColor || '#2D6A4F' }} />
                            <div className="flex-1 rounded-full h-1 mt-1.5 opacity-40" style={{ backgroundColor: org.primaryColor || '#2D6A4F' }} />
                            <div className="flex-1 rounded-full h-1 mt-1.5 opacity-60" style={{ backgroundColor: org.primaryColor || '#2D6A4F' }} />
                        </div>

                        <div className="p-8 flex-1">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transform group-hover:rotate-12 transition-transform"
                                        style={{ backgroundColor: org.primaryColor || '#2D6A4F' }}>
                                        <Building2 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-[#1B4332] tracking-tight">{org.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-[#2D6A4F] bg-[#D8F3DC] px-2 py-0.5 rounded-full uppercase tracking-widest">{org.code}</span>
                                            {org.isVerified && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Removed old action area from header */}
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
                                <div className="bg-[#F8F9FA] p-3 rounded-2xl text-center border border-[#E9ECEF] group-hover:border-[#2D6A4F]/20 transition-colors">
                                    <Bus className="w-4 h-4 mx-auto mb-2 text-[#457B9D]" />
                                    <p className="text-lg font-black text-[#1B4332]">{org._count?.buses || 0}</p>
                                    <p className="text-[8px] font-black text-[#95A3A4] uppercase tracking-widest">Fleet</p>
                                </div>
                                <div className="bg-[#F8F9FA] p-3 rounded-2xl text-center border border-[#E9ECEF] group-hover:border-[#2D6A4F]/20 transition-colors">
                                    <Users className="w-4 h-4 mx-auto mb-2 text-[#E07A5F]" />
                                    <p className="text-lg font-black text-[#1B4332]">{org._count?.drivers || 0}</p>
                                    <p className="text-[8px] font-black text-[#95A3A4] uppercase tracking-widest">Staff</p>
                                </div>
                                <div className="bg-[#F8F9FA] p-3 rounded-2xl text-center border border-[#E9ECEF] group-hover:border-[#2D6A4F]/20 transition-colors">
                                    <ShieldCheck className="w-4 h-4 mx-auto mb-2 text-[#2D6A4F]" />
                                    <p className="text-lg font-black text-[#1B4332]">{org._count?.admins || 0}</p>
                                    <p className="text-[8px] font-black text-[#95A3A4] uppercase tracking-widest">Admin</p>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-4 pt-6 border-t border-[#E9ECEF]">
                                {org.contactEmail && (
                                    <div className="flex items-center gap-3 text-[#52796F]">
                                        <div className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center">
                                            <Mail className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs font-bold truncate">{org.contactEmail}</span>
                                    </div>
                                )}
                                {org.contactPhone && (
                                    <div className="flex items-center gap-3 text-[#52796F]">
                                        <div className="w-8 h-8 rounded-full bg-[#F8F9FA] flex items-center justify-center">
                                            <Phone className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs font-bold">{org.contactPhone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Info & Actions */}
                        <div className="px-8 py-6 bg-white border-t border-[#F8F9FA] flex items-center justify-between relative z-10 group-hover:bg-[#FDFBF7]/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleOpenModal(org)}
                                    className="p-3 bg-white border border-[#E9ECEF] hover:border-[#1B4332] hover:bg-[#D8F3DC] rounded-2xl text-[#74796D] hover:text-[#1B4332] transition-all shadow-sm"
                                    title="Edit Institution"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setConfirmDelete({ id: org.id, name: org.name })}
                                    className="flex items-center gap-3 px-5 py-3 bg-[#FFF1E6] border border-[#E07A5F]/10 hover:bg-[#E07A5F] hover:text-white rounded-2xl text-[#E07A5F] transition-all shadow-sm group/del"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                                </button>
                            </div>
                            <div className="flex flex-col items-end">
                                <p className="text-[8px] font-black text-[#95A3A4] uppercase tracking-widest mb-1">Created</p>
                                <span className="text-[10px] font-bold text-[#1B4332]">{new Date(org.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredOrgs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-[#E9ECEF] shadow-sm">
                    <Building2 className="w-20 h-20 text-[#D8F3DC] mb-6" />
                    <h3 className="text-2xl font-black text-[#1B4332] tracking-tight">No Institutions Found</h3>
                    <p className="text-[#95A3A4] font-bold mt-2 uppercase tracking-widest text-[10px]">No matches identified in your records.</p>
                </div>
            )}

            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="Delete Institution"
                message={`Are you sure you want to permanently delete "${confirmDelete?.name}"? All associated data and configurations for this institution will be removed. This action is irreversible.`}
                confirmText="Permanently Delete"
                cancelText="Keep Institution"
                type="danger"
            />

            {/* Error/Alert Modal */}
            <ConfirmModal
                isOpen={!!alertModal}
                onClose={() => setAlertModal(null)}
                onConfirm={() => setAlertModal(null)}
                title={alertModal?.title || 'Notice'}
                message={alertModal?.message || ''}
                confirmText="Understood"
                type={alertModal?.type || 'info'}
            />

            {/* Modal for Add/Edit */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-[#1B4332]/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-[#E9ECEF]"
                        >
                            <div className="p-8 border-b border-[#F8F9FA] flex items-center justify-between bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#D8F3DC]/30 blur-3xl rounded-full -mr-12 -mt-12" />
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-black text-[#1B4332] tracking-tighter uppercase">
                                        {editingOrg ? 'Edit Institution' : 'Add New Institution'}
                                    </h2>
                                    <p className="text-[10px] font-black text-[#52796F] uppercase tracking-widest mt-1">Management Hub</p>
                                </div>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="relative z-10 p-3 bg-white border border-[#E9ECEF] rounded-2xl text-[#95A3A4] hover:text-[#1B4332] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter full institution name"
                                            className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl py-3.5 px-5 text-[#1B4332] text-sm font-bold focus:outline-none focus:border-[#2D6A4F] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Short Code</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                            placeholder="e.g. SRM-TN"
                                            className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl py-3.5 px-5 text-[#1B4332] text-sm font-bold focus:outline-none focus:border-[#2D6A4F] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Brand Theme Color</label>
                                        <div className="flex items-center gap-3 bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl p-2.5">
                                            <input
                                                type="color"
                                                value={formData.primaryColor}
                                                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                                className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer border-0 p-0"
                                            />
                                            <span className="text-xs font-bold text-[#1B4332] uppercase">{formData.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Contact Email</label>
                                        <input
                                            type="email"
                                            value={formData.contactEmail}
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            placeholder="admin@institution.edu"
                                            className="w-full bg-[#F8F9FA] border-2 border-[#E9ECEF] rounded-2xl py-3.5 px-5 text-[#1B4332] text-sm font-bold focus:outline-none focus:border-[#2D6A4F] transition-all"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-[#74796D] uppercase tracking-widest mb-3 ml-1">Account Status</label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                                className={`flex-1 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${formData.isActive ? 'bg-[#D8F3DC] border-[#2D6A4F] text-[#2D6A4F]' : 'bg-white border-[#E9ECEF] text-[#74796D]'}`}
                                            >
                                                {formData.isActive ? 'Active' : 'Suspended'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isVerified: !formData.isVerified })}
                                                className={`flex-1 py-3.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${formData.isVerified ? 'bg-[#E8F4F8] border-[#457B9D] text-[#457B9D]' : 'bg-white border-[#E9ECEF] text-[#74796D]'}`}
                                            >
                                                {formData.isVerified ? 'Verified' : 'Pending'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full mt-8 py-5 bg-[#1B4332] text-white rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-[#1B4332]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group/btn disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                                            Save Settings
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MasterOrganizations;
