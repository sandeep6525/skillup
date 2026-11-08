import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast, useConfirm } from '../../context/ToastContext';
import { getMediaUrl } from '../../utils/mediaUrl';
import { ImageUpload } from '../ImageUpload';
import {
  Trophy,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Star,
  ExternalLink,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  Search,
  Filter,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';

interface AchievementCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  _count?: { achievements: number };
}

interface AchievementImage {
  id?: string;
  imageUrl: string;
  caption?: string;
  displayOrder: number;
}

interface Achievement {
  id: string;
  title: string;
  slug: string;
  shortSummary?: string;
  description: string;
  coverImage?: string;
  eventDate?: string;
  location?: string;
  categoryId: string;
  category?: AchievementCategory;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  images: AchievementImage[];
  createdAt: string;
}

export const AchievementManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Achievement | null>(null);

  // Achievement Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [shortSummary, setShortSummary] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [galleryImages, setGalleryImages] = useState<AchievementImage[]>([]);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Fetch Achievements
  const { data: achievements = [], isLoading, refetch } = useQuery<Achievement[]>({
    queryKey: ['admin-achievements', search, selectedCategory, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await api.get(`/achievements/admin/all?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  // Fetch Categories
  const { data: categories = [], refetch: refetchCategories } = useQuery<AchievementCategory[]>({
    queryKey: ['achievement-categories'],
    queryFn: async () => {
      const res = await api.get('/achievements/categories');
      return res.data?.data || [];
    },
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setCategoryId(categories[0]?.id || '');
    setEventDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setShortSummary('');
    setDescription('');
    setCoverImage('');
    setIsFeatured(false);
    setIsPublished(true);
    setDisplayOrder(achievements.length);
    setGalleryImages([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: Achievement) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategoryId(item.categoryId);
    setEventDate(item.eventDate ? item.eventDate.split('T')[0] : '');
    setLocation(item.location || '');
    setShortSummary(item.shortSummary || '');
    setDescription(item.description);
    setCoverImage(item.coverImage || '');
    setIsFeatured(item.isFeatured);
    setIsPublished(item.isPublished);
    setDisplayOrder(item.displayOrder);
    setGalleryImages(item.images?.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      caption: img.caption || '',
      displayOrder: img.displayOrder,
    })) || []);
    setIsModalOpen(true);
  };

  // Save (Create / Update) Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingItem) {
        return api.patch(`/achievements/admin/${editingItem.id}`, payload);
      }
      return api.post('/achievements/admin', payload);
    },
    onSuccess: () => {
      toast.success(
        editingItem ? 'Achievement Updated' : 'Achievement Created',
        editingItem ? 'Changes saved successfully.' : 'New achievement published to website.'
      );
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['public-achievements'] });
    },
    onError: (err: any) => {
      toast.error('Failed to Save', err.response?.data?.error?.message || 'Check input details and try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Validation Error', 'Title is required');
      return;
    }
    if (!categoryId) {
      toast.error('Validation Error', 'Please select a category');
      return;
    }
    if (!description.trim()) {
      toast.error('Validation Error', 'Description is required');
      return;
    }

    saveMutation.mutate({
      title: title.trim(),
      categoryId,
      eventDate: eventDate ? new Date(eventDate).toISOString() : null,
      location: location.trim() || null,
      shortSummary: shortSummary.trim() || null,
      description: description.trim(),
      coverImage: coverImage.trim() || null,
      isFeatured,
      isPublished,
      displayOrder: Number(displayOrder) || 0,
      images: galleryImages.filter(g => g.imageUrl.trim()),
    });
  };

  // Quick Toggle Published
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      return api.patch(`/achievements/admin/${id}`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['public-achievements'] });
    },
    onError: () => {
      toast.error('Update Failed', 'Could not toggle published status');
    },
  });

  // Delete Achievement Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/achievements/admin/${id}`);
    },
    onSuccess: () => {
      toast.success('Achievement Deleted', 'The achievement was permanently removed.');
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['public-achievements'] });
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err.response?.data?.error?.message || 'Could not delete item.');
    },
  });

  const handleDelete = async (item: Achievement) => {
    const ok = await confirm({
      title: 'Delete Achievement',
      message: `Are you sure you want to delete "${item.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (ok) {
      deleteMutation.mutate(item.id);
    }
  };

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      return api.post('/achievements/admin/categories', payload);
    },
    onSuccess: () => {
      toast.success('Category Added', 'New achievement category created.');
      setNewCatName('');
      setNewCatDesc('');
      refetchCategories();
    },
    onError: (err: any) => {
      toast.error('Failed to Create Category', err.response?.data?.error?.message || 'Error occurred.');
    },
  });

  // Delete Category Mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/achievements/admin/categories/${id}`);
    },
    onSuccess: () => {
      toast.success('Category Deleted', 'Category removed successfully.');
      refetchCategories();
    },
    onError: (err: any) => {
      toast.error('Category In Use', err.response?.data?.error?.message || 'Cannot delete category.');
    },
  });

  // Gallery Helpers
  const addGalleryImageSlot = () => {
    setGalleryImages([...galleryImages, { imageUrl: '', caption: '', displayOrder: galleryImages.length }]);
  };

  const updateGalleryImage = (index: number, field: 'imageUrl' | 'caption', value: string) => {
    const updated = [...galleryImages];
    updated[index] = { ...updated[index], [field]: value };
    setGalleryImages(updated);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-[#8B00FF]">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-[#102A56]">Achievement Management</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Publish milestones, student successes, awards, event photo galleries, and press recognition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-[#8B00FF]" />
            Manage Categories
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#102A56] via-[#2563EB] to-[#8B00FF] hover:opacity-95 text-white text-xs font-semibold shadow-sm transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Achievement
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Achievement Cards / Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-[#8B00FF] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Loading achievements...</p>
        </div>
      ) : achievements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 text-[#8B00FF] flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#102A56]">No achievements found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || selectedCategory !== 'all'
              ? 'Try clearing your filters or search terms.'
              : 'Start by creating your first milestone, workshop gallery, or student success story.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-[#8B00FF] text-white text-xs font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add First Achievement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {achievements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div>
                {/* Image Cover */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  <img
                    src={getMediaUrl(item.coverImage) || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80';
                    }}
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-white/95 text-[#102A56] backdrop-blur-xs shadow-xs">
                      {item.category?.name || 'Milestone'}
                    </span>
                    {item.isFeatured && (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-400 text-slate-900 flex items-center gap-0.5 shadow-xs">
                        <Star className="w-3 h-3 fill-current" />
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      onClick={() =>
                        togglePublishMutation.mutate({
                          id: item.id,
                          isPublished: !item.isPublished,
                        })
                      }
                      className={`px-2 py-1 text-[10px] font-bold rounded-full backdrop-blur-xs flex items-center gap-1 shadow-xs cursor-pointer ${
                        item.isPublished
                          ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                          : 'bg-slate-700/80 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {item.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {item.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {item.eventDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(item.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    )}
                    {item.images && item.images.length > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-[#8B00FF] font-semibold text-[10px]">
                        <ImageIcon className="w-3 h-3" />
                        {item.images.length} photos
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-[#102A56] text-sm line-clamp-1 leading-snug hover:text-[#8B00FF] transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.shortSummary || item.description}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={`/achievements/${item.slug || item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#55B957] hover:text-blue-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Public
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-600 hover:text-[#8B00FF] hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit Achievement"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Achievement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          CREATE / EDIT MODAL
      ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 text-[#8B00FF]">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#102A56] text-base">
                    {editingItem ? 'Edit Achievement' : 'Create New Achievement'}
                  </h3>
                  <p className="text-xs text-slate-500">Fill in the details, cover image, and photo gallery</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Achievement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winner of National FinTech Hackathon 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
                />
              </div>

              {/* Category, Date & Location in 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF] bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore / Virtual"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
                  />
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <ImageUpload
                  label="Cover Image"
                  value={coverImage}
                  onChange={(url) => setCoverImage(url || '')}
                  helperText="Upload landscape photo or enter URL below (Max 5MB)"
                  aspectRatio="16/9"
                />
                <div className="mt-1.5">
                  <input
                    type="text"
                    placeholder="Or enter direct image URL"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
                  />
                </div>
              </div>

              {/* Short Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Summary (Highlights for card preview)
                </label>
                <input
                  type="text"
                  placeholder="One sentence summary of the accomplishment"
                  value={shortSummary}
                  onChange={(e) => setShortSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Story & Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Detailed narrative of what was achieved, participants involved, key outcomes, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#8B00FF]"
                />
              </div>

              {/* Gallery Images (Multiple Photos with Captions) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#8B00FF]" />
                      Photo Gallery ({galleryImages.length} images)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Upload event photos with captions for the lightbox gallery
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addGalleryImageSlot}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-[#8B00FF] border border-purple-200 hover:bg-purple-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Photo
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {img.imageUrl ? (
                          <img
                            src={getMediaUrl(img.imageUrl)}
                            alt="thumb"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={img.imageUrl}
                          onChange={(e) => updateGalleryImage(idx, 'imageUrl', e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Caption (e.g. Award Ceremony)"
                          value={img.caption || ''}
                          onChange={(e) => updateGalleryImage(idx, 'caption', e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <label className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-[#8B00FF] border border-purple-200 rounded-lg hover:bg-purple-100 cursor-pointer">
                          <span>Browse</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const res = await api.post('/upload/image', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                });
                                if (res.data?.data?.fileUrl) {
                                  updateGalleryImage(idx, 'imageUrl', res.data.data.fileUrl);
                                }
                              } catch {
                                toast.error('Upload Failed', 'Could not upload image.');
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {galleryImages.length === 0 && (
                    <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                      No gallery photos added yet. Click &quot;Add Photo&quot; above to include gallery pictures.
                    </div>
                  )}
                </div>
              </div>

              {/* Toggles: Featured, Published & Display Order */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-slate-300 text-[#8B00FF] focus:ring-[#8B00FF]"
                    />
                    <span>Highlight as Featured</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Published (Visible publicly)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label className="font-semibold text-slate-700">Display Order:</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border border-slate-200 rounded-md text-center"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold bg-[#8B00FF] hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {saveMutation.isPending ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CATEGORY MANAGEMENT MODAL
      ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#8B00FF]" />
                <h3 className="font-bold text-[#102A56] text-sm">Manage Achievement Categories</h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add New Category */}
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-[#102A56]">Create New Category</span>
                <input
                  type="text"
                  placeholder="Category Name (e.g. Media Coverage)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:outline-hidden"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!newCatName.trim()) return;
                      createCategoryMutation.mutate({ name: newCatName.trim() });
                    }}
                    disabled={!newCatName.trim() || createCategoryMutation.isPending}
                    className="px-3 py-1 text-xs font-semibold bg-[#8B00FF] text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Add Category
                  </button>
                </div>
              </div>

              {/* List of existing categories */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                <span className="text-xs font-semibold text-slate-500">Existing Categories</span>
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 text-xs hover:bg-slate-50"
                  >
                    <div>
                      <span className="font-bold text-[#102A56]">{c.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({c.slug})</span>
                      {c._count && (
                        <span className="text-[10px] text-slate-500 ml-1">
                          • {c._count.achievements} items
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCategoryMutation.mutate(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
