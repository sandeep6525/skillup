import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Eye,
  Lock,
  CheckCircle,
  ArrowLeft,
  BookOpen,
  Check,
  AlertCircle,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import ProtectedPdfViewerModal from '../components/common/ProtectedPdfViewerModal';

interface MaterialDetail {
  id: string;
  title: string;
  titleTa?: string | null;
  description: string | null;
  descriptionTa?: string | null;
  type: string;
  fileSize: number | null;
  price: string | number;
  discountPrice: string | number | null;
  isFree: boolean;
  thumbnailUrl: string | null;
  category: string | null;
  createdAt: string;
  course?: { id: string; title: string; slug: string } | null;
  uploader?: { id: string; name: string; title: string | null; avatarUrl: string | null } | null;
  hasAccess?: boolean;
  purchaseStatus?: 'NOT_PURCHASED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'COMPLETED';
  isOwnerOrAdmin?: boolean;
  _count?: { purchases: number };
}

export const MaterialDetailPage: React.FC = () => {
  const { materialId } = useParams<{ materialId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // 1. Fetch Material Details
  const {
    data: material,
    isLoading,
    error,
    refetch,
  } = useQuery<MaterialDetail>({
    queryKey: ['material-detail', materialId],
    queryFn: async () => {
      const res = await api.get(`/materials/${materialId}`);
      return res.data.data;
    },
    enabled: Boolean(materialId),
  });

  // 2. Format File Size
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Documentation PDF';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  };

  // 3. Download Handler (Only available for verified access)
  const handleDownload = async () => {
    if (!user) {
      navigate(`/login?redirect=/materials/${materialId}`);
      return;
    }

    try {
      const res = await api.get(`/materials/${materialId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const cleanName = (material?.title || 'material').replace(/[/\\?%*:|"<>]/g, '_');
      link.setAttribute('download', `${cleanName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download Started', `Downloading "${material?.title}".`);
    } catch (err: any) {
      let message = 'Unable to download file. Please verify purchase status.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed?.error?.message || parsed?.message || message;
        } catch {
          // fallback
        }
      } else if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      }
      toast.error('Download Failed', message);
    }
  };

  // 4. Coupon Validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await api.post('/payments/validate-coupon', {
        code: couponCode.trim(),
        materialId,
      });
      setAppliedCoupon(res.data.data);
      toast.success('Coupon Applied', `Discount of ₹${res.data.data.discountAmount} applied!`);
    } catch (err: any) {
      toast.error('Invalid Coupon', err.response?.data?.error?.message || 'Failed to apply coupon.');
      setAppliedCoupon(null);
    }
  };

  // 5. Payment Checkout Flow
  const handleConfirmPurchase = async () => {
    if (!user) {
      navigate(`/login?redirect=/materials/${materialId}`);
      return;
    }

    if (!material) return;

    setIsPurchasing(true);
    try {
      const res = await api.post('/payments/orders', {
        materialId: material.id,
        couponCode: appliedCoupon?.code,
      });

      const orderData = res.data.data;

      // Free grant via 100% coupon or 0-cost material
      if (orderData.isFree) {
        setIsPurchasing(false);
        setIsCheckoutModalOpen(false);
        toast.success('Material Unlocked', 'Free pass redeemed! You can now view and download this resource.');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['my-materials-student-view'] });
        queryClient.invalidateQueries({ queryKey: ['my-materials-purchases'] });
        queryClient.invalidateQueries({ queryKey: ['materials-marketplace'] });
        return;
      }

      // Launch Razorpay Checkout
      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SkillUp Materials Marketplace',
          description: material.title,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              toast.success('Purchase Confirmed', 'Payment verified! The material is now permanently unlocked.');
              setIsCheckoutModalOpen(false);
              refetch();
              queryClient.invalidateQueries({ queryKey: ['my-materials-student-view'] });
              queryClient.invalidateQueries({ queryKey: ['my-materials-purchases'] });
              queryClient.invalidateQueries({ queryKey: ['materials-marketplace'] });
            } catch (vErr: any) {
              toast.error('Verification Error', vErr.response?.data?.error?.message || 'Payment verification failed.');
            } finally {
              setIsPurchasing(false);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: {
            color: '#0866E8',
          },
          modal: {
            ondismiss: () => {
              setIsPurchasing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error('Payment Error', 'Payment gateway could not be loaded. Please refresh.');
        setIsPurchasing(false);
      }
    } catch (err: any) {
      toast.error('Checkout Failed', err.response?.data?.error?.message || 'Unable to initiate checkout.');
      setIsPurchasing(false);
    }
  };

  // Loading & Error States
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#0866E8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#526B91]">Loading learning resource details...</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#D8E7FA] p-8 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#092653]">Resource Not Found</h2>
          <p className="text-xs text-[#526B91]">
            The requested learning material could not be found or has been moved from the marketplace.
          </p>
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0866E8] text-white text-xs font-bold rounded-xl hover:bg-[#0755C5] transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Materials</span>
          </Link>
        </div>
      </div>
    );
  }

  const isFree = material.isFree || Number(material.price) === 0;
  // Entitlement status strictly driven by backend verified database purchase record
  const purchaseStatus = material.purchaseStatus || (material.hasAccess ? 'COMPLETED' : 'NOT_PURCHASED');
  const isPurchasedAndVerified = purchaseStatus === 'COMPLETED' || isFree;
  const isPaymentPending = purchaseStatus === 'PENDING';
  const isPaymentFailed = purchaseStatus === 'FAILED';
  const isPaymentRefunded = purchaseStatus === 'REFUNDED';

  const basePrice = Number(material.discountPrice || material.price);
  const finalPayable = appliedCoupon ? appliedCoupon.finalPrice : basePrice;

  const displayTitle = language === 'ta' && material.titleTa ? material.titleTa : material.title;
  const displayDescription = language === 'ta' && material.descriptionTa ? material.descriptionTa : material.description;

  return (
    <div className="min-h-screen bg-[#F8FBFF] pb-20">
      {/* Top Breadcrumb & Navigation */}
      <div className="border-b border-[#D8E7FA] bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            to="/materials"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#526B91] hover:text-[#0866E8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Materials Marketplace</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#0866E8] bg-[#EAF4FF] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {material.type} • {material.category || 'Development'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Main Grid: Left Column Details & Right Sticky Purchase Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS: Main Details, Cover, Description & Highlights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#EAF4FF] text-[#0866E8] uppercase tracking-wider">
                  {material.type}
                </span>
                {material.category && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#092653]">
                    {material.category}
                  </span>
                )}

                {/* Status Badges based on verified purchase */}
                {isPurchasedAndVerified ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1.5 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Purchased & Verified</span>
                  </span>
                ) : isPaymentPending ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 flex items-center gap-1.5 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Payment Pending</span>
                  </span>
                ) : isPaymentFailed ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 flex items-center gap-1.5 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Payment Failed</span>
                  </span>
                ) : isPaymentRefunded ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1.5 border border-slate-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Refunded (Access Revoked)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#0866E8] border border-blue-200">
                    Official Study Material
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#092653] leading-snug tracking-tight">
                {displayTitle}
              </h1>

              {/* Creator & Meta info */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-3 border-t border-slate-100 text-xs text-[#526B91]">
                {material.uploader && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#0866E8] text-white flex items-center justify-center font-bold text-[10px]">
                      {material.uploader.name.charAt(0)}
                    </div>
                    <span>
                      Created by <strong className="text-[#092653] font-semibold">{material.uploader.name}</strong>
                    </span>
                  </div>
                )}

                {material.course && (
                  <div className="flex items-center gap-1.5 text-[#0866E8] font-medium">
                    <BookOpen className="w-4 h-4" />
                    <span>Associated Course: {material.course.title}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Updated {new Date(material.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Thumbnail Preview Banner */}
            {material.thumbnailUrl && (
              <div className="bg-white rounded-2xl border border-[#D8E7FA] overflow-hidden shadow-sm">
                <div className="aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden relative group">
                  <img
                    src={material.thumbnailUrl}
                    alt={displayTitle}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=80';
                    }}
                  />
                  {/* If user purchased or material is free, allow opening viewer */}
                  {isPurchasedAndVerified && material.type === 'PDF' && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                      <button
                        onClick={() => setIsViewerOpen(true)}
                        className="px-4 py-2 bg-white/90 hover:bg-white text-[#092653] text-xs font-bold rounded-xl backdrop-blur-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-[#0866E8]" />
                        <span>Open Document Viewer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complete Description Section */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-[#092653] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0866E8]" />
                <span>Complete Material Overview & Contents</span>
              </h2>

              <div className="prose prose-slate max-w-none text-sm text-[#092653] leading-relaxed whitespace-pre-line font-normal">
                {displayDescription || 'Detailed syllabus and syllabus notes provided in the document.'}
              </div>
            </div>

            {/* What's Covered / Key Highlights */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-[#092653] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>What's Inside This Learning Kit</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {[
                  '100% Curated and verified technical questions & explanations',
                  'Downloadable high-resolution PDF format with bookmarks',
                  'Clear syntax examples formatted for rapid review',
                  'Self-paced interview prep suitable for all developers',
                  'Lifetime access in your SkillUp Student Dashboard',
                  'Mobile & desktop readable layout with dark/light clarity',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#092653]">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Purchase & Access Action Box */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-7 space-y-6 shadow-sm">
              {/* Pricing Section */}
              <div className="space-y-1 border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold uppercase text-[#526B91] tracking-wider">
                  Access Fee
                </span>
                <div className="flex items-baseline gap-2">
                  {isFree ? (
                    <span className="text-2xl font-black text-emerald-600">FREE</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-[#092653]">
                        ₹{Number(material.discountPrice || material.price).toLocaleString()}
                      </span>
                      {material.discountPrice && (
                        <span className="text-sm font-semibold text-[#98A2B3] line-through">
                          ₹{Number(material.price).toLocaleString()}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!isFree && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    One-time payment • Lifetime access included
                  </p>
                )}
              </div>

              {/* State-Based Action Buttons */}
              <div className="space-y-3">
                {/* STATE 1: PURCHASED & VERIFIED */}
                {isPurchasedAndVerified ? (
                  <>
                    <button
                      onClick={() => setIsViewerOpen(true)}
                      className="w-full py-3.5 px-4 bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Online in Viewer</span>
                    </button>

                    <button
                      onClick={handleDownload}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF File</span>
                    </button>
                  </>
                ) : isPaymentPending ? (
                  /* STATE 2: PAYMENT PENDING */
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> Payment Pending Verification
                      </p>
                      <p className="text-[11px] text-amber-700">
                        Your payment is being processed or requires verification.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        refetch();
                        toast.info('Status Refreshed', 'Checking latest payment status.');
                      }}
                      className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Check Verification Status</span>
                    </button>

                    <button
                      onClick={() => setIsCheckoutModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-[#092653] text-xs font-semibold rounded-xl transition text-center cursor-pointer"
                    >
                      Retry Payment
                    </button>
                  </div>
                ) : isPaymentFailed ? (
                  /* STATE 3: PAYMENT FAILED */
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" /> Payment Failed
                      </p>
                      <p className="text-[11px] text-rose-700">
                        The previous transaction could not be completed. You can retry anytime.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsCheckoutModalOpen(true)}
                      className="w-full py-3.5 px-4 bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Payment (₹{basePrice})</span>
                    </button>
                  </div>
                ) : isPaymentRefunded ? (
                  /* STATE 4: REFUNDED */
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Access Revoked (Refunded)
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Payment for this resource was refunded. Please purchase again to regain access.
                    </p>
                    <button
                      onClick={() => setIsCheckoutModalOpen(true)}
                      className="w-full mt-2 py-3 px-4 bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <span>Repurchase Material (₹{basePrice})</span>
                    </button>
                  </div>
                ) : (
                  /* STATE 5: NOT PURCHASED */
                  <button
                    onClick={() => {
                      if (!user) {
                        navigate(`/login?redirect=/materials/${materialId}`);
                        return;
                      }
                      setIsCheckoutModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Buy Material (₹{basePrice})</span>
                  </button>
                )}
              </div>

              {/* Resource Specifications */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between items-center text-[#526B91]">
                  <span>File Format</span>
                  <strong className="text-[#092653] uppercase">{material.type} Document</strong>
                </div>

                <div className="flex justify-between items-center text-[#526B91]">
                  <span>File Size</span>
                  <strong className="text-[#092653]">{formatFileSize(material.fileSize)}</strong>
                </div>

                <div className="flex justify-between items-center text-[#526B91]">
                  <span>Category</span>
                  <strong className="text-[#092653]">{material.category || 'General'}</strong>
                </div>

                <div className="flex justify-between items-center text-[#526B91]">
                  <span>Unlocked Students</span>
                  <strong className="text-[#092653]">
                    {material._count?.purchases ? `${material._count.purchases} Learners` : 'New Release'}
                  </strong>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D8E7FA] space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#092653]">
                  <ShieldCheck className="w-4 h-4 text-[#0866E8]" />
                  <span>SkillUp Verified Study Resource</span>
                </div>
                <p className="text-[10px] text-[#526B91]">
                  Protected document streaming with 256-bit encryption. Compatible with all desktop & mobile PDF readers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D8E7FA] shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#092653]">Complete Order</h3>
                <p className="text-xs text-[#526B91]">Material: {material.title}</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Resource Price</span>
                <span className="font-semibold text-[#092653]">₹{basePrice}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span>-₹{appliedCoupon.discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-2 text-[#092653]">
                <span>Total Payable</span>
                <span className="text-[#0866E8]">₹{finalPayable}</span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Coupon (e.g. SKILLUP50)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-xs border border-[#D8E7FA] rounded-xl focus:outline-none focus:border-[#0866E8]"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#092653] text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Apply
              </button>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={isPurchasing}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-[#0866E8] hover:bg-[#0755C5] rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isPurchasing ? 'Processing...' : `Pay ₹${finalPayable} with Razorpay`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Protected Inline PDF Viewer */}
      <ProtectedPdfViewerModal
        isOpen={isViewerOpen}
        materialId={material.id}
        materialTitle={displayTitle}
        onClose={() => setIsViewerOpen(false)}
      />
    </div>
  );
};

export default MaterialDetailPage;
