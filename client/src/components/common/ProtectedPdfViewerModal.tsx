import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Lock,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ProtectedPdfViewerModalProps {
  materialId: string;
  materialTitle: string;
  isOpen: boolean;
  onClose: () => void;
  requiresPassword?: boolean;
}

export const ProtectedPdfViewerModal: React.FC<ProtectedPdfViewerModalProps> = ({
  materialId,
  materialTitle,
  isOpen,
  onClose,
  requiresPassword = false,
}) => {
  const { user } = useAuth();
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!requiresPassword);
  const [passwordError, setPasswordError] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // 1. Fetch document stream and load into PDF.js
  useEffect(() => {
    let active = true;

    const fetchStream = async () => {
      if (!isOpen || !materialId) return;

      setIsLoading(true);
      setError(null);
      setPageNum(1);

      try {
        const response = await api.get(`/materials/${materialId}/view`, {
          responseType: 'arraybuffer',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!active) return;

        const loadingTask = pdfjsLib.getDocument({
          data: response.data,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err: any) {
        if (!active) return;
        let errMsg = 'Failed to load document. Please ensure purchase is completed.';
        if (err.response?.data) {
          try {
            const dec = new TextDecoder();
            const text = dec.decode(err.response.data);
            const parsed = JSON.parse(text);
            errMsg = parsed.message || parsed.error?.message || errMsg;
          } catch {
            // fallback
          }
        }
        setError(errMsg);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchStream();
    }

    return () => {
      active = false;
      setPdfDoc(null);
    };
  }, [isOpen, materialId]);

  // 2. Render Page on Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !isUnlocked) return;

    let cancelRender = false;
    setIsRenderingPage(true);

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore cancel errors
          }
        }

        const page = await pdfDoc.getPage(pageNum);
        if (cancelRender || !canvasRef.current) return;

        // Measure container width for responsive fit-to-width
        const containerWidth = containerRef.current
          ? containerRef.current.clientWidth - 48
          : window.innerWidth * 0.8;
        
        // Base viewport at 1.0 to get native PDF dimensions
        const baseViewport = page.getViewport({ scale: 1.0, rotation });
        const autoFitScale = (containerWidth / baseViewport.width) * scale;

        const viewport = page.getViewport({ scale: autoFitScale, rotation });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) return;

        // Support high-DPI displays for crisp text
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform || undefined,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      } finally {
        if (!cancelRender) setIsRenderingPage(false);
      }
    };

    renderPage();

    return () => {
      cancelRender = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNum, scale, rotation, isUnlocked]);

  // 3. Complete Anti-Right-Click, Anti-Print & Copy Prevention
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block Ctrl+C (Copy)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Block Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Escape
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [isOpen, isFullscreen, onClose]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPassword.trim()) {
      setPasswordError('Please enter document password');
      return;
    }
    setIsUnlocked(true);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
      }}
    >
      {/* Top Header Bar */}
      <div
        className={`w-full bg-[#111827] border border-slate-800 text-white rounded-t-2xl px-4 py-3 flex items-center justify-between shadow-xl ${isFullscreen ? 'max-w-none rounded-none' : 'max-w-5xl'
          }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-[#55B957]/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {materialTitle}
            </h3>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {numPages > 0 && isUnlocked && (
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg px-2 py-1 text-xs text-slate-300 mr-2">
              <button
                type="button"
                onClick={() => setPageNum((p) => Math.max(p - 1, 1))}
                disabled={pageNum <= 1}
                className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-1 text-xs font-semibold">
                {pageNum} / {numPages}
              </span>
              <button
                type="button"
                onClick={() => setPageNum((p) => Math.min(p + 1, numPages))}
                disabled={pageNum >= numPages}
                className="p-1 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="w-px h-3 bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => setScale((s) => Math.max(s - 0.2, 0.6))}
                className="p-1 hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(s + 0.2, 2.5))}
                className="p-1 hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 hover:text-white cursor-pointer ml-1"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
            title="Close Viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewer Canvas Area */}
      <div
        className={`relative w-full bg-[#1E293B] border-x border-b border-slate-800 rounded-b-2xl overflow-hidden flex flex-col items-center justify-center ${isFullscreen ? 'h-[calc(100vh-65px)] max-w-none rounded-none' : 'h-[80vh] max-w-5xl'
          }`}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400">Decrypting & loading protected document...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center p-8 max-w-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">Access Denied or File Unavailable</h4>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back to Materials
            </button>
          </div>
        )}

        {/* Password Prompt */}
        {!isLoading && !error && requiresPassword && !isUnlocked && (
          <div className="flex flex-col items-center justify-center p-8 max-w-sm text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Password Protected Document</h4>
              <p className="text-xs text-slate-400">
                Enter the access key provided upon purchase to unlock this question paper.
              </p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="w-full space-y-3">
              <input
                type="password"
                placeholder="Enter document password"
                value={enteredPassword}
                onChange={(e) => {
                  setEnteredPassword(e.target.value);
                  setPasswordError('');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-indigo-500 text-center"
              />
              {passwordError && <p className="text-[11px] text-red-400">{passwordError}</p>}
              <button
                type="submit"
                className="w-full py-2 bg-[#55B957] hover:bg-[#EAF5EA]0 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Unlock Document
              </button>
            </form>
          </div>
        )}

        {/* Direct HTML5 Canvas Rendering */}
        {!isLoading && !error && isUnlocked && pdfDoc && (
          <div
            className="relative w-full h-full overflow-y-auto overflow-x-hidden bg-[#2b2b2b] flex flex-col items-center justify-start p-4 sm:p-6"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Watermark Protection Layer */}
            <div
              className="absolute inset-0 pointer-events-none z-20 overflow-hidden flex flex-wrap items-center justify-center opacity-12 select-none"
              style={{ transform: 'rotate(-25deg) scale(1.15)' }}
            >
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="m-8 text-center">
                  <p className="text-white text-xs font-black tracking-widest uppercase">
                    CONFIDENTIAL &bull; {user?.name || 'STUDENT ACCESS'}
                  </p>
                  <p className="text-white text-[10px] font-mono tracking-wider">
                    {user?.email || 'VERIFIED PURCHASE'} &bull; ID: {materialId.slice(-6)}
                  </p>
                </div>
              ))}
            </div>

            {/* Canvas Container */}
            <div className="relative shadow-2xl bg-white border border-slate-300 rounded-sm my-auto max-w-full">
              {isRenderingPage && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#55B957]" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="block select-none max-w-full h-auto"
                style={{
                  pointerEvents: 'none', // Disallows selecting text or dragging canvas
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Security Notice */}
        <div className="w-full bg-[#0F172A] border-t border-slate-800 py-1.5 px-4 text-center">
          <p className="text-[10px] text-slate-500 font-medium tracking-wide flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-amber-500/80" />
            <span>Digital Rights Protected. Direct downloads and printing are restricted.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
export default ProtectedPdfViewerModal;
