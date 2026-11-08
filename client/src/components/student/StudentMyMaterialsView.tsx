import { useToast } from '../../context/ToastContext';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  FolderDown,
  Search,
  Filter,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  Eye,
} from 'lucide-react';
import ProtectedPdfViewerModal from '../common/ProtectedPdfViewerModal';

export const StudentMyMaterialsView: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DIRECT' | 'COURSE' | 'FREE'>('ALL');
  const [viewingMaterial, setViewingMaterial] = useState<{ id: string; title: string } | null>(null);

  // Fetch student's purchased & eligible course-included materials (deduplicated by backend)
  const {
    data: myMaterials = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['my-materials-student-view'],
    queryFn: async () => {
      const res = await api.get('/materials/my/purchases');
      return res.data.data;
    },
    enabled: Boolean(user),
  });

  const filteredMaterials = (myMaterials as any[]).filter((item: any) => {
    const titleMatch =
      !search ||
      item.material?.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.material?.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.associatedCourse?.title?.toLowerCase().includes(search.toLowerCase());

    if (!titleMatch) return false;

    if (filterType === 'DIRECT') {
      return item.accessSource === 'DIRECT_PURCHASE' || item.accessSource === 'DIRECT_AND_COURSE' || item.isDirectlyPurchased;
    }
    if (filterType === 'COURSE') {
      return item.accessSource === 'COURSE_INCLUDED' || item.accessSource === 'DIRECT_AND_COURSE' || item.isCourseIncluded;
    }
    if (filterType === 'FREE') {
      return item.material?.isFree || item.paidAmount === 0;
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <FolderDown className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Learning Resources & Downloads</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            My Materials
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Access your individually purchased resources and course-included handbooks, templates, and guides.
          </p>
        </div>

        <Link
          to="/materials"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <span>Browse Available Materials</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E4E9F0] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, topic, or course name..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:outline-hidden focus:bg-white focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filterType === 'ALL'
              ? 'bg-[#173B73] text-white'
              : 'bg-[#F8F9FC] text-[#667085] hover:bg-slate-100'
              }`}
          >
            All Resources ({myMaterials.length})
          </button>
          <button
            onClick={() => setFilterType('DIRECT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filterType === 'DIRECT'
              ? 'bg-[#173B73] text-white'
              : 'bg-[#F8F9FC] text-[#667085] hover:bg-slate-100'
              }`}
          >
            Direct Purchases ({(myMaterials as any[]).filter((i: any) => i.accessSource === 'DIRECT_PURCHASE' || i.accessSource === 'DIRECT_AND_COURSE' || i.isDirectlyPurchased).length})
          </button>
          <button
            onClick={() => setFilterType('COURSE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filterType === 'COURSE'
              ? 'bg-[#173B73] text-white'
              : 'bg-[#F8F9FC] text-[#667085] hover:bg-slate-100'
              }`}
          >
            Course Included ({(myMaterials as any[]).filter((i: any) => i.accessSource === 'COURSE_INCLUDED' || i.accessSource === 'DIRECT_AND_COURSE' || i.isCourseIncluded).length})
          </button>
        </div>
      </div>

      {/* Main Materials Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <FolderDown className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#14233B]">No learning materials found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 leading-relaxed">
              {search
                ? 'No materials matched your search query. Try searching for a different keyword or clear your filter.'
                : 'You have not purchased any direct materials or enrolled in courses containing study materials yet.'}
            </p>
          </div>
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Browse Available Materials</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((item: any) => {
            const material = item.material;
            const fileSize = material?.fileSize
              ? material.fileSize < 1024 * 1024
                ? `${Math.round(material.fileSize / 1024)} KB`
                : `${(material.fileSize / (1024 * 1024)).toFixed(1)} MB`
              : null;
            const courseTitle = item.associatedCourse?.title || material?.course?.title;
            return (
              <div
                key={item.id || item.materialId || material?.id}
                className="bg-white rounded-2xl border border-[#E4E9F0] p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#EFF6FF] text-[#2563EB] uppercase">
                      {material?.type || 'PDF'}
                    </span>
                    {fileSize && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {fileSize}
                      </span>
                    )}

                    {/* Entitlement & Access Badges */}
                    {item.accessSource === 'DIRECT_AND_COURSE' ? (
                      <>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Direct Purchase
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Course Included
                        </span>
                      </>
                    ) : item.accessSource === 'COURSE_INCLUDED' ||
                      item.paymentStatus === 'INCLUDED_IN_COURSE' ||
                      item.isCourseIncluded ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Course Included
                      </span>
                    ) : item.paidAmount > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Direct Purchase
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#EAF5EA] text-blue-700 border border-blue-200">
                        Free Resource
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3
                      className="text-sm font-bold text-[#14233B] line-clamp-2 leading-snug"
                      title={material?.title}
                    >
                      {material?.title}
                    </h3>
                    {material?.description && (
                      <p className="text-xs text-[#667085] line-clamp-2 mt-1 leading-relaxed">
                        {material.description}
                      </p>
                    )}
                  </div>

                  {/* Course Association & Date */}
                  <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Access Status:</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Authorized</span>
                      </span>
                    </div>
                    {item.createdAt && (
                      <div className="flex items-center justify-between">
                        <span>Unlocked:</span>
                        <span className="text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {courseTitle && (
                      <div className="text-[10px] text-[#2563EB] font-medium truncate pt-0.5">
                        Course: {courseTitle}
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure Actions: View In Dialog & Download Button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() =>
                      setViewingMaterial({
                        id: item.materialId || material?.id,
                        title: material?.title || 'Study Material',
                      })
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Online</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Protected In-Dialog PDF Modal */}
      {viewingMaterial && (
        <ProtectedPdfViewerModal
          isOpen={!!viewingMaterial}
          materialId={viewingMaterial.id}
          materialTitle={viewingMaterial.title}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  );
};
export default StudentMyMaterialsView;
