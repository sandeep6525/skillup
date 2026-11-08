import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast, useConfirm } from '../../context/ToastContext';
import { getMediaUrl } from '../../utils/mediaUrl';
import { ImageUpload } from '../ImageUpload';
import {
  Image,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Star,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
  X,
  Layers,
  Upload,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  label: string;
  description?: string;
  imageUrl: string;
  link?: string;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface GallerySettings {
  id: string;
  isEnabled: boolean;
  sectionTitle: string;
  sectionBadge: string;
  sectionDesc: string;
  defaultIndex: number;
}

export const GalleryManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [link, setLink] = useState('#');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Settings State
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('Discover. Learn. Create.');
  const [sectionBadge, setSectionBadge] = useState('EXPLORE SKILLUP');
  const [sectionDesc, setSectionDesc] = useState('Explore our learning experiences, student projects, workshops and technical programs.');
  const [isEnabled, setIsEnabled] = useState(true);

  // Fetch all gallery items and settings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-gallery-data'],
    queryFn: async () => {
      const res = await api.get('/admin/gallery');
      return res.data?.data || { settings: null, items: [] };
    },
  });

  const settings: GallerySettings = data?.settings || {
    id: 'default',
    isEnabled: true,
    sectionTitle: 'Discover. Learn. Create.',
    sectionBadge: 'EXPLORE SKILLUP',
    sectionDesc: 'Explore our learning experiences, student projects, workshops and technical programs.',
    defaultIndex: 0,
  };

  const items: GalleryItem[] = data?.items || [];

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setLabel('');
    setDescription('');
    setImageUrl('');
    setLink('#');
    setIsActive(true);
    setIsDefault(false);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setLabel(item.label);
    setDescription(item.description || '');
    setImageUrl(item.imageUrl);
    setLink(item.link || '#');
    setIsActive(item.isActive);
    setIsDefault(item.isDefault);
    setIsModalOpen(true);
  };

  // Upload image handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      toast.error('Allowed file types: JPG, JPEG, PNG, WEBP');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size cannot exceed 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'gallery');

    setUploadingImage(true);
    try {
      const res = await api.post('/upload/image?folder=gallery', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data?.data?.fileUrl || res.data?.data?.url || res.data?.url;
      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        toast.success('Image uploaded successfully!');
      } else {
        toast.error('Could not retrieve image URL from upload response');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        label,
        description,
        imageUrl,
        link,
        isActive,
        isDefault,
      };

      if (editingItem) {
        return api.put(`/admin/gallery/items/${editingItem.id}`, payload);
      } else {
        return api.post('/admin/gallery/items', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? 'Gallery item updated' : 'Gallery item created');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-data'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-gallery-public'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save item');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/gallery/items/${id}`);
    },
    onSuccess: () => {
      toast.success('Gallery item deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-data'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-gallery-public'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete item');
    },
  });

  // Toggle Active State
  const toggleActive = async (item: GalleryItem) => {
    try {
      await api.put(`/admin/gallery/items/${item.id}`, { isActive: !item.isActive });
      toast.success(`Image ${!item.isActive ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-data'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-gallery-public'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Set as Default Active Image
  const setDefaultItem = async (item: GalleryItem) => {
    try {
      await api.put(`/admin/gallery/items/${item.id}`, { isDefault: true });
      toast.success(`"${item.title}" is now the default active image`);
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-data'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-gallery-public'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set default');
    }
  };

  // Reorder Handler (Move up / down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    try {
      await api.put('/admin/gallery/reorder', {
        orderIds: newItems.map((it) => it.id),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-data'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-gallery-public'] });
      toast.success('Order updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reorder');
    }
  };

  // Save Settings Mutation
  const handleSaveSettings = async () => {
    try {
      await api.put('/admin/gallery/settings', {
        isEnabled,
        sectionTitle,
        sectionBadge,
        sectionDesc,
      });
      toast.success('Gallery section settings saved');
      setIsEditingSettings(false);
      queryClient.invalidateQueries({ queryKey: ['admin-gallery-data'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-gallery-public'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    }
  };

  // Initialize settings input values when data loads
  React.useEffect(() => {
    if (data?.settings) {
      setIsEnabled(data.settings.isEnabled);
      setSectionTitle(data.settings.sectionTitle);
      setSectionBadge(data.settings.sectionBadge);
      setSectionDesc(data.settings.sectionDesc);
    }
  }, [data?.settings]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Homepage Gallery Management</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${settings.isEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              {settings.isEnabled ? 'Published Live' : 'Hidden / Unpublished'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage interactive AccordionGallery items displayed immediately below the homepage Hero.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsEditingSettings(!isEditingSettings)}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>{isEditingSettings ? 'Close Settings' : 'Section Settings'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Gallery Image</span>
          </button>
        </div>
      </div>

      {/* Gallery Section Settings Panel (Collapsible) */}
      {isEditingSettings && (
        <div className="bg-purple-50/50 border border-purple-200/60 rounded-2xl p-5 shadow-xs animate-in fade-in space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-purple-200/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Configure Gallery Section Headings & Visibility</h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded"
              />
              <span>Display Section on Homepage</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Section Badge Pill</label>
              <input
                type="text"
                value={sectionBadge}
                onChange={(e) => setSectionBadge(e.target.value)}
                placeholder="e.g. EXPLORE SKILLUP"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Section Main Heading</label>
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g. Discover. Learn. Create."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Section Description</label>
              <textarea
                rows={2}
                value={sectionDesc}
                onChange={(e) => setSectionDesc(e.target.value)}
                placeholder="Brief description for the gallery..."
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditingSettings(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Gallery Items Grid / List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-4 h-64 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Image className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Gallery Images Uploaded</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload your first high-resolution image to show in the homepage interactive AccordionGallery.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-5 py-2 text-xs font-bold text-white bg-purple-600 rounded-xl shadow-xs"
          >
            Add First Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                item.isActive ? 'border-slate-200/80 shadow-xs hover:shadow-md' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                {/* Image Preview with Badges */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={getMediaUrl(item.imageUrl)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-purple-300 border border-purple-500/30">
                      Order #{index + 1}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center gap-1 shadow-xs">
                          <Star className="w-3 h-3 fill-white" />
                          Default Open
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${item.isActive ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                        {item.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Image Overlay Label */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
                      {item.label}
                    </span>
                    <h4 className="text-sm font-bold truncate leading-snug">{item.title}</h4>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-2">
                  <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                    {item.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate pt-1 border-t border-slate-100">
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">Target: {item.link || '#'}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    title="Move Up in Order"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-200"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Move Down in Order"
                    disabled={index === items.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-slate-200"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    title={item.isActive ? 'Disable image from homepage' : 'Enable image on homepage'}
                    onClick={() => toggleActive(item)}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-white border border-slate-200 transition-colors"
                  >
                    {item.isActive ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>

                  {!item.isDefault && (
                    <button
                      title="Set as Default Active Image"
                      onClick={() => setDefaultItem(item)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-white border border-slate-200 transition-colors hover:text-amber-500"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    title="Edit Item"
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 border border-purple-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    title="Delete Item"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Delete Gallery Image?',
                        message: `Are you sure you want to permanently delete "${item.title}"?`,
                        confirmText: 'Delete Image',
                        isDestructive: true,
                      });
                      if (ok) deleteMutation.mutate(item.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingItem ? 'Edit Gallery Image' : 'Add New Gallery Image'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-4 overflow-y-auto">
              
              {/* File Upload / Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gallery Image <span className="text-rose-500">*</span>
                </label>
                
                <div className="flex items-center gap-3 mb-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload File (JPG, PNG, WEBP)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400">Max 10MB</span>
                </div>

                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste direct image URL (https://...)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />

                {imageUrl && (
                  <div className="mt-3 relative h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={getMediaUrl(imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Title & Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Image Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Cloud Architecture"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Enterprise Full-Stack Labs"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of this program or highlight..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              {/* Destination Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Link</label>
                <input
                  type="text"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="e.g. /courses or https://external.link"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                  <span>Active & Visible</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>Default Active Panel</span>
                </label>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 px-6 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending || !title || !label || !imageUrl}
                onClick={() => saveMutation.mutate()}
                className="px-6 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveMutation.isPending ? 'Saving...' : 'Save Gallery Item'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

