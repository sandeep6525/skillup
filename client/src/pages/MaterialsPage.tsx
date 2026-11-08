import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FolderDown,
  FileText,
  Download,
  Lock,
  Tag,
  CheckCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import ProtectedPdfViewerModal from '../components/common/ProtectedPdfViewerModal';

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileSize: number | null;
  price: string | number;
  discountPrice: string | number | null;
  isFree: boolean;
  thumbnailUrl: string | null;
  category: string | null;
  createdAt: string;
  course?: { id: string; title: string };
  _count?: { purchases: number };
}

export const MaterialsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [checkoutMaterial, setCheckoutMaterial] = useState<Material | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState<{ id: string; title: string } | null>(null);

  // Fetch materials
  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data.data;
    },
  });

  // Fetch my purchases if logged in
  const { data: myPurchases = [] } = useQuery({
    queryKey: ['my-materials-purchases'],
    queryFn: async () => {
      const res = await api.get('/materials/my/purchases');
      return res.data.data;
    },
    enabled: !!user,
  });

  const ownedMaterialIds = new Set(myPurchases.map((p: any) => p.materialId));

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Documentation';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (materialId: string, title: string) => {
    if (!user) {
      navigate(`/login?redirect=/materials`);
      return;
    }

    try {
      // Trigger protected download stream
      const res = await api.get(`/materials/${materialId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download Started', `Downloading "${title}".`);
    } catch (err: any) {
      let message = 'Unable to download file. Please verify access rights.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed?.error?.message || parsed?.message || message;
        } catch {
          // fallback to default
        }
      } else if (err.response?.data?.error?.message) {
        message = err.response.data.error.message;
      }
      toast.error('Download Failed', message);
    }
  };

  const handleInitiatePurchase = (mat: Material) => {
    if (!user) {
      navigate(`/login?redirect=/materials`);
      return;
    }
    setCheckoutMaterial(mat);
    setCouponCode('');
    setCouponResult(null);
    setCouponError('');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !checkoutMaterial) return;
    setIsCheckingCoupon(true);
    setCouponError('');

    try {
      const res = await api.post('/payments/validate-coupon', {
        couponCode: couponCode.trim(),
        materialId: checkoutMaterial.id,
      });
      setCouponResult(res.data.data);
    } catch (err: any) {
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code for this material');
      setCouponResult(null);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const refreshPurchasedMaterialQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['my-materials-purchases'] });
    queryClient.invalidateQueries({ queryKey: ['my-materials-student-view'] });
    queryClient.invalidateQueries({ queryKey: ['my-materials'] });
    queryClient.invalidateQueries({ queryKey: ['my-materials-overview'] });
    queryClient.invalidateQueries({ queryKey: ['student-dashboard-overview-summary'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['my-orders-payments'] });
    queryClient.invalidateQueries({ queryKey: ['my-payments-overview'] });
  };

  const handleExecutePayment = async () => {
    if (!checkoutMaterial || !user) return;
    setIsPurchasing(true);

    try {
      const res = await api.post('/payments/orders', {
        materialId: checkoutMaterial.id,
        couponCode: couponResult?.code || undefined,
      });

      const orderData = res.data.data;

      // Handle 100% Free coupon grant
      if (orderData.isFree) {
        toast.success(
          'Payment Successful',
          'Your payment has been verified. The learning material is now available in My Materials.'
        );
        setCheckoutMaterial(null);
        refreshPurchasedMaterialQueries();
        return;
      }

      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SkillUp Platform',
          description: orderData.description,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              toast.success(
                'Payment Successful',
                'Your payment has been verified. The learning material is now available in My Materials.'
              );
              setCheckoutMaterial(null);
              refreshPurchasedMaterialQueries();
            } catch (vErr: any) {
              toast.error(
                'Payment Verification Failed',
                vErr.response?.data?.error?.message || 'Payment verification failed'
              );
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: { color: '#173B73' },
          modal: {
            ondismiss: () => setIsPurchasing(false),
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.warning(
          'Gateway Initializing',
          'Razorpay gateway SDK is initializing. Please try again in a moment.'
        );
      }
    } catch (err: any) {
      toast.error(
        'Checkout Error',
        err.response?.data?.error?.message || 'Failed to initialize checkout'
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const categories = ['All', 'Development', 'System Design', 'Databases', 'Cloud & DevOps', 'Security'];

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#E4E9F0] pb-8">
        <div className="space-y-3">
           
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#14233B] tracking-tight">
            Learning Materials & Architecture Handouts
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] max-w-2xl leading-relaxed">
            Download production-ready system architecture diagrams, cheatsheets, configuration blueprints, and curriculum resources.
          </p>
        </div>

        {user && (
          <button
            onClick={() => navigate('/dashboard/materials')}
            className="flex items-center gap-2 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-4 py-2.5 rounded-xl border border-[#2563EB]/20 transition-colors cursor-pointer"
          >
            <FolderDown className="w-4 h-4" />
            <span>Go to My Materials</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials, templates, guides..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#E4E9F0] bg-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-colors ${selectedCategory === cat
                ? 'bg-[#173B73] text-white shadow-2xs'
                : 'bg-white text-[#667085] border border-[#E4E9F0] hover:bg-slate-50'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-sm font-semibold text-[#667085]">
          Loading materials marketplace...
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-[#E4E9F0] p-8 space-y-3">
          <FolderDown className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-[#14233B]">No materials match your criteria</p>
          <p className="text-xs text-[#667085]">Try adjusting your search terms or filter selection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((m) => {
            const isOwned = ownedMaterialIds.has(m.id);
            const isFree = m.isFree || Number(m.price) === 0;

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                {m.thumbnailUrl && (
                  <Link to={`/materials/${m.id}`} className="block relative aspect-video bg-slate-100 overflow-hidden border-b border-[#EDF0F4] group">
                    <img
                      src={m.thumbnailUrl}
                      alt={m.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80';
                      }}
                    />
                  </Link>
                )}

                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {!m.thumbnailUrl && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] uppercase">
                          {m.type} • {formatFileSize(m.fileSize)}
                        </span>
                      )}
                      {isOwned ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Owned</span>
                        </span>
                      ) : isFree ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                          Free Resource
                        </span>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-black text-[#14233B]">
                            ₹{Number(m.discountPrice || m.price)}
                          </span>
                          {m.discountPrice && (
                            <span className="text-[10px] text-[#98A2B3] line-through ml-1.5">
                              ₹{Number(m.price)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#14233B] leading-snug">
                      <Link to={`/materials/${m.id}`} className="hover:text-[#0866E8] transition-colors">
                        {m.title}
                      </Link>
                    </h3>

                    {m.description && (
                      <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}

                    {m.course && (
                      <div className="text-[11px] text-[#2563EB] font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">Course: {m.course.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#98A2B3]">
                      {m._count?.purchases ? `${m._count.purchases} students unlocked` : 'Instant access'}
                    </span>

                    {isOwned || isFree ? (
                      <button
                        onClick={() => setViewingMaterial({ id: m.id, title: m.title })}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Paper</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInitiatePurchase(m)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-300" />
                        <span>Buy Material</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E4E9F0] shadow-xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                  Instant Checkout
                </span>
                <h3 className="text-base font-bold text-[#14233B] mt-1">
                  {checkoutMaterial.title}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutMaterial(null)}
                className="text-[#667085] hover:text-[#14233B] text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Price Breakdown */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100 text-xs">
              <div className="flex justify-between text-[#667085]">
                <span>Original Price</span>
                <span className="font-semibold text-[#14233B]">
                  ₹{Number(checkoutMaterial.discountPrice || checkoutMaterial.price)}
                </span>
              </div>

              {couponResult && (
                <div className="flex justify-between text-[#16845B] font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Coupon ({couponResult.code})</span>
                  </span>
                  <span>-₹{couponResult.discountAmount}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#14233B]">
                <span>Total Payable</span>
                <span className="text-[#2563EB]">
                  ₹{couponResult ? couponResult.finalPrice : Number(checkoutMaterial.discountPrice || checkoutMaterial.price)}
                </span>
              </div>
            </div>

            {/* Coupon Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                Have a coupon or college discount?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. COLLEGE100"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB] uppercase font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isCheckingCoupon || !couponCode.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] disabled:opacity-50 rounded-lg transition-colors shrink-0"
                >
                  {isCheckingCoupon ? 'Verifying...' : 'Apply'}
                </button>
              </div>

              {couponError && (
                <p className="text-[11px] font-semibold text-[#C03945] flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}

              {couponResult && (
                <p className="text-[11px] font-semibold text-[#16845B] flex items-center gap-1 mt-1">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>Coupon applied! You save ₹{couponResult.discountAmount}</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setCheckoutMaterial(null)}
                className="w-1/2 py-2.5 rounded-xl border border-[#E4E9F0] text-xs font-bold text-[#667085] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isPurchasing}
                className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPurchasing ? 'Processing...' : 'Pay with Razorpay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure In-Dialog PDF Paper Viewer */}
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
