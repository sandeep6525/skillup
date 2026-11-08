import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  Handshake,
  PlusCircle,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Upload,
  ArrowUpDown,
  Star,
  Globe,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';

export interface AdminPartner {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PartnerManagement: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals & State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<AdminPartner | null>(null);
  const [previewLogoModalUrl, setPreviewLogoModalUrl] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper for full logo url
  const getFullLogoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Toast trigger
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Fetch partners
  const { data: partnersData, isLoading, refetch } = useQuery<{ success: boolean; data: AdminPartner[] }>({
    queryKey: ['admin-partners', searchTerm, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/admin/partners', { params });
      return res.data;
    },
  });

  const partners = partnersData?.data || [];

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      if (!formName.trim()) {
        throw new Error('Partner company name is required');
      }

      if (!editingPartner && !selectedFile) {
        throw new Error('Please select a company logo to upload');
      }

      if (formWebsiteUrl.trim()) {
        try {
          new URL(formWebsiteUrl.trim());
        } catch {
          throw new Error('Please enter a valid website URL starting with https:// or http://');
        }
      }

      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('websiteUrl', formWebsiteUrl.trim());
      formData.append('description', formDescription.trim());
      formData.append('displayOrder', formDisplayOrder);
      formData.append('isActive', String(formIsActive));
      formData.append('isFeatured', String(formIsFeatured));

      if (selectedFile) {
        formData.append('logo', selectedFile);
      }

      if (editingPartner) {
        const res = await api.patch(`/admin/partners/${editingPartner.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      } else {
        const res = await api.post('/admin/partners', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['public-partners'] });
      setIsModalOpen(false);
      resetForm();
      showToast(data.message || (editingPartner ? 'Partner updated successfully' : 'Partner added successfully'));
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Operation failed. Please verify the input.';
      setFormError(msg);
    },
  });

  // Toggle active/inactive status quickly
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: boolean }) => {
      const res = await api.patch(`/admin/partners/${id}`, { isActive: nextStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['public-partners'] });
      showToast('Partner visibility updated');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/partners/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      queryClient.invalidateQueries({ queryKey: ['public-partners'] });
      setDeleteConfirmationId(null);
      showToast('Partner deleted successfully');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete partner');
    },
  });

  const resetForm = () => {
    setEditingPartner(null);
    setFormName('');
    setFormWebsiteUrl('');
    setFormDescription('');
    setFormDisplayOrder('0');
    setFormIsActive(true);
    setFormIsFeatured(false);
    setSelectedFile(null);
    setFilePreview(null);
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (partner: AdminPartner) => {
    setEditingPartner(partner);
    setFormName(partner.name);
    setFormWebsiteUrl(partner.websiteUrl || '');
    setFormDescription(partner.description || '');
    setFormDisplayOrder(String(partner.displayOrder));
    setFormIsActive(partner.isActive);
    setFormIsFeatured(partner.isFeatured);
    setSelectedFile(null);
    setFilePreview(getFullLogoUrl(partner.logoUrl));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Logo image file exceeds 5MB limit');
      return;
    }

    // Supported extensions: jpg, jpeg, png, webp, svg
    const allowed = /\.(png|jpe?g|webp|svg)$/i;
    if (!allowed.test(file.name)) {
      setFormError('Only PNG, JPG, JPEG, WEBP, or SVG image files are allowed');
      return;
    }

    setFormError(null);
    setSelectedFile(file);

    // Create local object URL for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setFilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-[#14233B] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-indigo-400/30 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header & Metric Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E4E9F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#14233B]">Partner Logo Management</h2>
              <p className="text-xs text-[#667085]">
                Manage corporate collaborations and companies featured in the homepage continuous carousel.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 text-xs font-medium text-[#667085] hover:text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] rounded-lg transition-colors flex items-center gap-1.5"
            title="Refresh List"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E4E9F0]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search partners by company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#667085] font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
          >
            <option value="all">All Partners</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-2xl border border-[#E4E9F0] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#2563EB] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#667085]">Loading partner records from MySQL...</p>
          </div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
              <Handshake className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#14233B]">No partners found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search filters to find existing partners.'
                : 'Click "Add Partner" to upload your first trusted company logo and showcase it on the homepage carousel.'}
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add First Partner</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E4E9F0] text-[#667085] font-semibold">
                  <th className="py-3.5 px-4 w-28">Logo</th>
                  <th className="py-3.5 px-4">Partner Name</th>
                  <th className="py-3.5 px-4">Website</th>
                  <th className="py-3.5 px-4 text-center w-28">Display Order</th>
                  <th className="py-3.5 px-4 text-center w-24">Status</th>
                  <th className="py-3.5 px-4 w-28">Created Date</th>
                  <th className="py-3.5 px-4 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F4]">
                {partners.map((partner) => {
                  const logoSrc = getFullLogoUrl(partner.logoUrl);
                  return (
                    <tr key={partner.id} className="hover:bg-[#F9FAFC] transition-colors">
                      {/* Logo Preview */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setPreviewLogoModalUrl(logoSrc)}
                          className="w-16 h-10 rounded-lg bg-white border border-[#E4E9F0] p-1 flex items-center justify-center cursor-pointer hover:border-indigo-300 transition-all shadow-2xs group relative"
                          title="Click to preview logo"
                        >
                          <img
                            src={logoSrc}
                            alt={partner.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      </td>

                      {/* Partner Name */}
                      <td className="py-3 px-4 font-semibold text-[#14233B]">
                        <div className="flex items-center gap-1.5">
                          <span>{partner.name}</span>
                          {partner.isFeatured && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              <span>Featured</span>
                            </span>
                          )}
                        </div>
                        {partner.description && (
                          <p className="text-[11px] text-[#667085] font-normal truncate max-w-xs mt-0.5">
                            {partner.description}
                          </p>
                        )}
                      </td>

                      {/* Website */}
                      <td className="py-3 px-4">
                        {partner.websiteUrl ? (
                          <a
                            href={partner.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#2563EB] hover:underline font-medium"
                          >
                            <span className="truncate max-w-[160px]">
                              {partner.websiteUrl.replace(/^https?:\/\//, '')}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-[#98A2B3] italic">—</span>
                        )}
                      </td>

                      {/* Display Order */}
                      <td className="py-3 px-4 text-center font-mono font-medium text-[#14233B]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {partner.displayOrder}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: partner.id,
                              nextStatus: !partner.isActive,
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                            partner.isActive
                              ? 'bg-[#EAF7F0] text-[#16845B] hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={`Click to ${partner.isActive ? 'disable' : 'enable'}`}
                        >
                          {partner.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-[#16845B]" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-[#667085]">
                        {new Date(partner.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(partner)}
                            className="p-1.5 rounded-lg text-[#2563EB] hover:bg-blue-50 transition-colors"
                            title="Edit Partner"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmationId(partner.id)}
                            className="p-1.5 rounded-lg text-[#C03945] hover:bg-red-50 transition-colors"
                            title="Delete Partner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT PARTNER
      ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14233B]">
                  {editingPartner ? 'Edit Partner Company' : 'Add New Partner Company'}
                </h3>
                <p className="text-xs text-[#667085]">
                  Company logo will be featured on the SkillUp homepage carousel.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-[#667085] hover:text-[#172033] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              {/* Partner Name */}
              <div>
                <label className="block text-[#14233B] font-semibold mb-1">
                  Partner Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Microsoft, Amazon"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Logo Upload Section */}
              <div>
                <label className="block text-[#14233B] font-semibold mb-1">
                  Company Logo <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-[#667085] mb-2">
                  Upload a crisp PNG, SVG, JPG, or WebP logo with transparent or light background. Max 5MB.
                </p>

                {/* File Drop / Selector */}
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-[#E4E9F0] hover:border-[#2563EB] rounded-xl p-4 text-center cursor-pointer transition-colors bg-[#F8FAFC]"
                  >
                    <Upload className="w-5 h-5 text-[#2563EB] mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-[#14233B] block">
                      {selectedFile ? selectedFile.name : 'Choose Logo File'}
                    </span>
                    <span className="text-[10px] text-[#667085] block mt-0.5">
                      PNG, SVG, JPG, WebP supported
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Logo Preview */}
                  {filePreview && (
                    <div className="relative w-24 h-20 rounded-xl bg-white border border-[#E4E9F0] p-2 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={filePreview}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(editingPartner ? getFullLogoUrl(editingPartner.logoUrl) : null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xs hover:bg-red-600 text-[10px]"
                        title="Cancel selected image"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-[#14233B] font-semibold mb-1">
                  Partner Website URL (Optional)
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={formWebsiteUrl}
                    onChange={(e) => setFormWebsiteUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <span className="text-[10px] text-[#667085] block mt-1">
                  If provided, users on the homepage can click this logo to visit the partner website in a new tab.
                </span>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-[#14233B] font-semibold mb-1">
                  Short Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Strategic hiring partner for cloud engineering & DevOps roles."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Display Order & Visibility Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-[#E4E9F0]">
                <div>
                  <label className="block text-[#14233B] font-semibold mb-1 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Display Order</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-[#667085] block mt-1">
                    Lower numbers appear first in the carousel.
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="partnerActiveCheckbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-[#2563EB] rounded focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="partnerActiveCheckbox" className="font-semibold text-[#14233B] cursor-pointer">
                      Active (Visible on Homepage)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="partnerFeaturedCheckbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="partnerFeaturedCheckbox" className="font-semibold text-[#14233B] cursor-pointer">
                      Mark as Featured Partner
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EDF0F4]">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-xs transition-colors cursor-pointer"
                >
                  {saveMutation.isPending
                    ? 'Saving Partner...'
                    : editingPartner
                    ? 'Update Partner'
                    : 'Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: LOGO HIGH-RES PREVIEW
      ======================================================== */}
      {previewLogoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewLogoModalUrl(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-[#14233B]">Logo Preview</span>
              <button
                onClick={() => setPreviewLogoModalUrl(null)}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-40 rounded-xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-center">
              <img
                src={previewLogoModalUrl}
                alt="Partner logo high resolution preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DELETE CONFIRMATION DIALOG
      ======================================================== */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E4E9F0]">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#14233B]">Delete Partner?</h3>
              <p className="text-xs text-[#667085]">
                Are you sure you want to remove this partner? The logo will be immediately removed from the public homepage carousel.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmationId(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmationId)}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#C03945] hover:bg-red-700 shadow-xs transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
