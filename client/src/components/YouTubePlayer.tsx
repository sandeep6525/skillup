import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Lock,
  ShieldAlert,
} from 'lucide-react';
// @ts-ignore
import YouTube from 'react-youtube';

interface YouTubePlayerProps {
  url: string;
  title?: string;
  watermarkText?: string;
  enableAntiDownload?: boolean;
}

/**
 * Extracts 11-character YouTube video ID
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^\s&]+&)*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);

  if (match && match[1]) return match[1];

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = parsed.pathname.split('/');
      const last = parts[parts.length - 1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(last)) return last;
    } else if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '');
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // Ignore URL parse error
  }

  return null;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  url,
  title,
  watermarkText,
  enableAntiDownload = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const progressInterval = useRef<any>(null);
  const hideControlsTimeout = useRef<any>(null);

  const videoId = extractYouTubeVideoId(url);

  // Keyboard shortcut blocker
  useEffect(() => {
    if (!enableAntiDownload) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2500);
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'u' ||
          e.key === 'U' ||
          e.key === 's' ||
          e.key === 'S' ||
          (e.shiftKey &&
            (e.key === 'I' ||
              e.key === 'i' ||
              e.key === 'J' ||
              e.key === 'j' ||
              e.key === 'C' ||
              e.key === 'c')))
      ) {
        e.preventDefault();
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableAntiDownload]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    };
  }, []);

  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const onPlayerReady = (event: any) => {
    const yt = event.target;
    setPlayer(yt);
    setDuration(yt.getDuration() || 0);
    yt.playVideo();
  };

  const onPlayerStateChange = (event: any) => {
    // 1 = playing, 2 = paused, 0 = ended
    if (event.data === 1) {
      setIsPlaying(true);
      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = setInterval(() => {
        if (event.target && typeof event.target.getCurrentTime === 'function') {
          setProgress(event.target.getCurrentTime());
          setDuration(event.target.getDuration() || 0);
        }
      }, 500);
    } else {
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
      setShowControls(true);
    }
  };

  const togglePlay = () => {
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    triggerControlsVisibility();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(time, true);
    }
    triggerControlsVisibility();
  };

  const skipSeconds = (seconds: number) => {
    if (!player) return;
    const current = player.getCurrentTime() || 0;
    const target = Math.max(0, Math.min(duration, current + seconds));
    player.seekTo(target, true);
    setProgress(target);
    triggerControlsVisibility();
  };

  const toggleMute = () => {
    if (!player) return;
    if (isMuted) {
      player.unMute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
    triggerControlsVisibility();
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (player) {
      player.setVolume(val);
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        player.unMute();
        setIsMuted(false);
      }
    }
    triggerControlsVisibility();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Fallback for MP4 / WebM
  if (!videoId) {
    if (url && (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/uploads/'))) {
      return (
        <div
          className="relative w-full h-full bg-black select-none"
          onContextMenu={(e) => {
            e.preventDefault();
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 2500);
          }}
        >
          <video
            key={url}
            controls
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            autoPlay
            className="w-full h-full object-contain pointer-events-auto"
            src={url}
          />
          {watermarkText && (
            <div className="absolute top-4 right-4 pointer-events-none select-none px-2.5 py-1 rounded bg-black/40 backdrop-blur-xs text-[10px] font-mono text-white/50 tracking-wider">
              {watermarkText}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900 select-none">
        <p className="text-sm font-semibold text-rose-400 mb-1">Video Stream Notice</p>
        <p className="text-xs max-w-md">
          Unable to parse YouTube video URL. Please ensure a valid link is provided.
        </p>
        <p className="text-[11px] font-mono text-slate-500 mt-2 break-all">{url}</p>
      </div>
    );
  }

  // YouTube player options with controls: 0 (completely removes YouTube UI & context menus)
  const ytOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0, // Strips YouTube controls completely!
      disablekb: 1, // Disable keyboard inside YouTube
      fs: 0, // Hide native fullscreen button
      modestbranding: 1,
      rel: 0, // No related videos
      iv_load_policy: 3, // No annotations
      playsinline: 1,
      showinfo: 0,
    },
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black select-none overflow-hidden group flex flex-col items-center justify-center"
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      onMouseMove={triggerControlsVisibility}
      onClick={triggerControlsVisibility}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2500);
      }}
    >
      {/* 
        1. Clean YouTube Frame with NO native controls.
      */}
      <div className="w-full h-full absolute inset-0 [&>div]:w-full [&>div]:h-full [&>div>iframe]:w-full [&>div>iframe]:h-full [&>div>iframe]:border-0 pointer-events-none">
        <YouTube
          videoId={videoId}
          opts={ytOpts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
        />
      </div>

      {/* 
        2. Solid Interaction Canvas Shield.
        This absorbs all clicks and right-clicks. Users NEVER touch the YouTube iframe,
        making it 100% IMPOSSIBLE to open YouTube's context menu, Copy link, or Stats for nerds!
      */}
      <div
        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        onClick={togglePlay}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 2500);
        }}
      />

      {/* 
        3. Custom Top Header Bar
      */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between px-5 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-xs sm:text-sm font-semibold text-white drop-shadow truncate max-w-md">
          {title || 'Protected Lesson Stream'}
        </span>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[11px] font-medium text-emerald-400 backdrop-blur-xs">
          <Lock className="w-3.5 h-3.5" />
          <span>DRM Protected</span>
        </div>
      </div>

      {/* 
        4. Central Big Play/Pause Indicator when paused
      */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-20 w-16 h-16 rounded-full bg-[#55B957]/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-[#55B957] transition-all cursor-pointer pointer-events-auto"
        >
          <Play className="w-8 h-8 ml-1" />
        </button>
      )}

      {/* 
        5. Student Forensic Watermark Overlay
      */}
      {watermarkText && (
        <div className="absolute bottom-20 right-5 z-20 pointer-events-none select-none px-3 py-1 rounded-lg bg-black/40 backdrop-blur-xs border border-white/10 text-[11px] font-mono font-medium text-white/40 tracking-wider">
          {watermarkText}
        </div>
      )}

      {/* 
        6. Custom Bottom Player Controls Bar
        100% custom React controls - NO YouTube buttons, NO settings menu, NO copy link!
      */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 flex flex-col gap-2.5 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar / Scrubber */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] font-mono text-slate-300 shrink-0 select-none">
            {formatTime(progress)}
          </span>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={progress}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
            />
          </div>

          <span className="text-[11px] font-mono text-slate-400 shrink-0 select-none">
            {formatTime(duration)}
          </span>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-lg transition text-white"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Skip 10s backward */}
            <button
              onClick={() => skipSeconds(-10)}
              className="p-2 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Skip 10s forward */}
            <button
              onClick={() => skipSeconds(10)}
              className="p-2 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume & Mute */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolume}
                className="w-16 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Warning Toast */}
      {showWarning && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/95 text-white border border-rose-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs font-semibold">
            Right-click & video downloads are restricted on protected course streams.
          </span>
        </div>
      )}
    </div>
  );
};
