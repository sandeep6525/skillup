import React, { useRef, useState } from 'react';
import { UploadCloud, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../api/client';
import { getMediaUrl } from '../utils/mediaUrl';

interface ImageUploadProps {
  label: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  helperText?: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
  maxSizeMB?: number;
  className?: string;
  fallbackText?: string;
  folder?: 'thumbnails' | 'avatars' | 'partners';
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  helperText = 'Supported formats: JPG, JPEG, PNG, WEBP (Max 5MB)',
  aspectRatio = '16/9',
  maxSizeMB = 5,
  className = '',
  fallbackText = 'No image selected',
  folder = 'thumbnails',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview || (value ? getMediaUrl(value) : null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid file format. Please upload JPG, JPEG, PNG, or WEBP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (5MB default)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is ${maxSizeMB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Create instant local preview
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    // Upload to server
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    setIsUploading(true);
    try {
      const response = await api.post(`/upload/image?folder=${encodeURIComponent(folder)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = response.data?.data?.fileUrl;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      } else {
        throw new Error('Upload succeeded but no file URL was returned.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Image upload failed. Please try again.';
      setErrorMessage(msg);
      // Revert preview on error if there was no prior value
      if (!value) {
        setLocalPreview(null);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    setErrorMessage(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#14233B]">
          {label}
        </label>
        {displayUrl && (
          <span className="text-[11px] font-medium text-[#16845B]">Image Set</span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {displayUrl ? (
        <div className="relative rounded-xl border border-[#E4E9F0] overflow-hidden bg-slate-50 group">
          <div
            className={`w-full relative overflow-hidden bg-slate-900/5 ${
              aspectRatio === '16/9' ? 'aspect-video' : aspectRatio === '4/3' ? 'aspect-4/3' : 'aspect-square'
            }`}
          >
            <img
              src={displayUrl}
              alt={label}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              onError={(e) => {
                // If the image fails to load, fallback safely
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
              }}
            />

            {isUploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                <RefreshCw className="w-6 h-6 animate-spin mb-1 text-white" />
                <span className="text-xs font-semibold">Uploading to secure storage...</span>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-white border-t border-[#EDF0F4] flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#667085] truncate max-w-[200px]" title={displayUrl}>
              {displayUrl.split('/').pop() || displayUrl}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleTriggerUpload}
                disabled={isUploading}
                className="px-2.5 py-1 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="px-2.5 py-1 text-xs font-semibold text-[#C03945] bg-[#FDF2F2] hover:bg-red-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={handleTriggerUpload}
          className="border-2 border-dashed border-[#D0D5DD] hover:border-[#2563EB] bg-[#F9FAFB] hover:bg-[#EFF6FF]/40 rounded-xl p-5 text-center cursor-pointer transition-colors group"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-2xs border border-[#E4E9F0] mx-auto flex items-center justify-center mb-2 text-[#667085] group-hover:text-[#2563EB] group-hover:border-[#2563EB]/40 transition-colors">
            {isUploading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <p className="text-xs font-semibold text-[#14233B]">
            <span className="text-[#2563EB] underline underline-offset-2">Click to upload</span> or drag and drop
          </p>
          <p className="text-[11px] text-[#667085] mt-1">{helperText}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#C03945] bg-[#FDF2F2] p-2 rounded-lg border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
