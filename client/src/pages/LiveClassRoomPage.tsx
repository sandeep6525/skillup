import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Share2,
  PhoneOff,
  MessageSquare,
  Users,
  Send,
  Clock,
  Shield,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';

interface LiveClassDetails {
  id: string;
  title: string;
  description: string;
  status: string;
  startTime: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  duration: number;
  isRecorded?: boolean;
  course?: { id: string; title: string; instructorId?: string } | null;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
    role?: string;
  };
}

export const LiveClassRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  // Live classes removed from student portal - redirect students to /dashboard
  if (user?.role === 'STUDENT') {
    return <Navigate to="/dashboard" replace />;
  }

  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [classDetails, setClassDetails] = useState<LiveClassDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch token and class details
  useEffect(() => {
    let isMounted = true;
    const fetchSessionAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.post(`/live-classes/${id}/join`);
        if (!isMounted) return;

        if (res.data.success && res.data.data) {
          const { token, wsUrl, isHost, classDetails } = res.data.data;
          setToken(token);
          setWsUrl(wsUrl);
          setIsHost(isHost);
          setClassDetails(classDetails);
        } else {
          throw new Error(res.data.message || 'Failed to authenticate class access.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Failed to connect to live class. Verify authentication and room availability.';
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSessionAccess();

    return () => {
      isMounted = false;
      // Record participant leave timestamp
      if (id) {
        api.post(`/live-classes/${id}/leave`).catch(() => {});
      }
    };
  }, [id]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#111827] text-white flex flex-col items-center justify-center p-6">
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-4 max-w-md shadow-2xl">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-white">Connecting to Classroom...</h2>
          <p className="text-xs text-slate-400">
            Authorizing security token and establishing WebRTC peer connection.
          </p>
        </div>
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#111827] text-white flex flex-col items-center justify-center p-6">
        <div className="p-8 rounded-3xl bg-slate-900 border border-rose-900/40 text-center space-y-4 max-w-lg shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Live Classroom Notice</h2>
          <p className="text-xs text-slate-300 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 leading-relaxed">
            {error || 'LiveKit server configuration is required to initiate peer WebRTC streaming.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#55B957] hover:bg-[#46a548] text-white text-xs font-semibold rounded-xl transition-all"
            >
              Retry Connection
            </button>
            <Link
              to="/live-classes"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              Back to Live Classes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={true}
      audio={true}
      data-lk-theme="default"
      className="h-[calc(100vh-64px)] w-full overflow-hidden"
    >
      <RoomAudioRenderer />
      <ClassroomInterface
        classId={id || ''}
        classDetails={classDetails}
        isHost={isHost}
        currentUser={user}
      />
    </LiveKitRoom>
  );
};

interface ClassroomInterfaceProps {
  classId: string;
  classDetails: LiveClassDetails | null;
  isHost: boolean;
  currentUser: any;
}

const ClassroomInterface: React.FC<ClassroomInterfaceProps> = ({
  classId,
  classDetails,
  isHost,
  currentUser,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'participants'>('chat');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [classEnded, setClassEnded] = useState(classDetails?.status === 'COMPLETED');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Compute elapsed time from actualStart or startTime
  useEffect(() => {
    const startTimestamp = classDetails?.actualStart
      ? new Date(classDetails.actualStart).getTime()
      : new Date().getTime();

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTimestamp) / 1000);
      setElapsedSeconds(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [classDetails]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch initial chat messages from backend database
  useEffect(() => {
    let isSubscribed = true;
    const loadMessages = async () => {
      try {
        const res = await api.get(`/live-classes/${classId}/messages`);
        if (isSubscribed && res.data.success) {
          setChatMessages(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    loadMessages();
    return () => {
      isSubscribed = false;
    };
  }, [classId]);

  // Listen to LiveKit real-time data messages and room events
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any) => {
      try {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(payload);
        const data = JSON.parse(jsonStr);

        if (data.type === 'CLASS_ENDED') {
          setClassEnded(true);
        } else if (data.type === 'CHAT_MESSAGE') {
          setChatMessages((prev) => [...prev, data.message]);
        }
      } catch (e) {
        console.error('Error parsing data message', e);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  // Send message via API and LiveKit data broadcast
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      // 1. Persist to MySQL database
      const res = await api.post(`/live-classes/${classId}/messages`, { text });
      const savedMessage = res.data.data;

      // 2. Broadcast via LiveKit Data channel to peers
      if (room && room.localParticipant) {
        const encoder = new TextEncoder();
        const payload = encoder.encode(
          JSON.stringify({
            type: 'CHAT_MESSAGE',
            message: savedMessage,
          })
        );
        await room.localParticipant.publishData(payload, { reliable: true });
      }

      setChatMessages((prev) => [...prev, savedMessage]);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Instructor ends class
  const handleEndClass = async () => {
    if (!isHost) return;
    const confirmed = await confirm({
      title: 'End Live Class',
      message: 'Are you sure you want to officially end this live class for all participants? The room and streaming session will be closed.',
      confirmText: 'End Class',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      setIsEnding(true);
      await api.post(`/live-classes/${classId}/end`);

      // Broadcast class ended to room
      if (room && room.localParticipant) {
        const encoder = new TextEncoder();
        const payload = encoder.encode(JSON.stringify({ type: 'CLASS_ENDED' }));
        await room.localParticipant.publishData(payload, { reliable: true });
      }

      setClassEnded(true);
      toast.success('Live Class Ended', 'The session has been completed and saved.');
    } catch (err: any) {
      toast.apiError(err, 'Failed to End Class');
    } finally {
      setIsEnding(false);
    }
  };

  // Screen sharing toggle
  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      const willEnable = !localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(willEnable);
    } catch (e: any) {
      console.warn('Screen share error:', e);
    }
  };

  // Mic toggle
  const toggleMic = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    } catch (e) {
      console.error('Mic toggle error:', e);
    }
  };

  // Camera toggle
  const toggleCamera = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    } catch (e) {
      console.error('Camera toggle error:', e);
    }
  };

  // Tracks for rendering video
  const cameraTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  if (classEnded) {
    return (
      <div className="h-full bg-[#111827] text-white flex flex-col items-center justify-center p-6">
        <div className="p-8 rounded-3xl bg-slate-900 border border-indigo-900/40 text-center space-y-4 max-w-lg shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center mx-auto text-indigo-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Class Session Ended</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The instructor has concluded this live engineering masterclass. Your attendance and active duration
            have been recorded successfully.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/live-classes')}
              className="px-6 py-2.5 bg-gradient-to-r bg-[#55B957] hover:bg-[#46a548]  text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20/30 transition-all"
            >
              Return to Live Classes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find primary screen share or host track
  const screenShareTrack = cameraTracks.find((t) => t.source === Track.Source.ScreenShare);
  const primaryTrack = screenShareTrack || cameraTracks[0];
  const secondaryTracks = cameraTracks.filter((t) => t !== primaryTrack);

  return (
    <div className="h-full bg-[#111827] text-white flex flex-col overflow-hidden w-full select-none">
      {/* Top Header */}
      <div className="h-14 bg-[#1f2937] border-b border-slate-700/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
            {classDetails?.title || 'Live Engineering Masterclass'}
          </h1>
          <span className="hidden sm:inline-flex text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
            {classDetails?.isRecorded ? 'Recording Configured' : 'Live Session'}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5 text-rose-400 font-mono font-bold bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-900/40">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          {isHost ? (
            <button
              onClick={handleEndClass}
              disabled={isEnding}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-rose-900/30"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>{isEnding ? 'Ending...' : 'End Class'}</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/live-classes')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Video Area, Right Tabbed Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Video Area */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between gap-3 overflow-hidden bg-[#0b0f17]">
          {/* Active Speaker Spotlight + Participant Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 overflow-hidden min-h-0">
            {/* Spotlight Video (Cols 3 on Desktop) */}
            <div className="md:col-span-3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative group flex items-center justify-center min-h-[220px]">
              {primaryTrack ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black">
                  <VideoTrack trackRef={primaryTrack} className="w-full h-full object-contain" />
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>
                      {primaryTrack.participant.name || primaryTrack.participant.identity}
                      {primaryTrack.source === Track.Source.ScreenShare && ' (Screen Share)'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <VideoIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Waiting for Camera Feed</p>
                    <p className="text-xs text-slate-500">Unmute your camera or wait for participants to join.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Mini Video Strip (Cols 1 on Desktop) */}
            <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto md:max-h-full">
              {secondaryTracks.length > 0 ? (
                secondaryTracks.slice(0, 4).map((trackRef, idx) => (
                  <div
                    key={idx}
                    className="h-28 w-44 md:w-full rounded-xl overflow-hidden bg-slate-800 border border-slate-700 relative shrink-0"
                  >
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/70 px-2 py-0.5 rounded-md font-medium text-slate-200 truncate max-w-[120px]">
                      {trackRef.participant.name || trackRef.participant.identity}
                    </span>
                  </div>
                ))
              ) : (
                <div className="hidden md:flex flex-col items-center justify-center h-32 rounded-xl bg-slate-900/60 border border-slate-800/80 p-3 text-center">
                  <Users className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {participants.length} Active {participants.length === 1 ? 'Peer' : 'Peers'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="h-16 bg-[#1f2937]/90 backdrop-blur-md rounded-2xl border border-slate-700/80 px-4 sm:px-6 flex items-center justify-center gap-3 sm:gap-4 shrink-0 mx-auto max-w-xl w-full z-10 shadow-xl">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-xl transition-all shadow-md ${
                localParticipant?.isMicrophoneEnabled
                  ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600/50'
                  : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-900/30'
              }`}
              title={localParticipant?.isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {localParticipant?.isMicrophoneEnabled ? (
                <Mic className="w-5 h-5 text-emerald-400" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleCamera}
              className={`p-3 rounded-xl transition-all shadow-md ${
                localParticipant?.isCameraEnabled
                  ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600/50'
                  : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-900/30'
              }`}
              title={localParticipant?.isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {localParticipant?.isCameraEnabled ? (
                <VideoIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>

            {/* Screen Share Toggle */}
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-xl transition-all shadow-md ${
                localParticipant?.isScreenShareEnabled
                  ? 'bg-[#55B957] text-white hover:bg-[#46a548] shadow-emerald-500/20/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600/50'
              }`}
              title={localParticipant?.isScreenShareEnabled ? 'Stop Sharing' : 'Share Screen'}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Toggle Chat Panel */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`p-3 rounded-xl transition-all relative ${
                activeTab === 'chat'
                  ? 'bg-[#55B957] text-white shadow-emerald-500/20/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600/50'
              }`}
              title="Live Chat Panel"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Toggle Participants Panel */}
            <button
              onClick={() => setActiveTab('participants')}
              className={`p-3 rounded-xl transition-all ${
                activeTab === 'participants'
                  ? 'bg-[#55B957] text-white shadow-emerald-500/20/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-600/50'
              }`}
              title="Participants List"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Tabbed Panel (Class Details, Chat, Participants) */}
        <div className="w-full md:w-80 bg-[#1f2937] border-t md:border-t-0 md:border-l border-slate-700/80 flex flex-col shrink-0 h-64 md:h-full overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-700/80 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'details' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'chat' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                activeTab === 'participants' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Participants ({participants.length})
            </button>
          </div>

          {/* Tab 1: Class Details */}
          {activeTab === 'details' && (
            <div className="p-4 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Topic</span>
                <span className="text-white font-semibold text-sm">{classDetails?.title}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Description</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">{classDetails?.description || 'Hands-on practical live coding cohort.'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Course</span>
                <span className="text-indigo-400 font-semibold">{classDetails?.course?.title || 'General Engineering Cohort'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Duration</span>
                <span>{classDetails?.duration || 60} Minutes</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Session Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active WebRTC Session
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Live Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div ref={chatScrollRef} className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 space-y-1">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-1 opacity-60" />
                    <p className="text-xs font-semibold">No messages yet</p>
                    <p className="text-[11px]">Be the first to say hello to the cohort!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={msg.id || i} className="text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-indigo-400 truncate max-w-[160px]">
                          {msg.senderName}
                        </span>
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                      <p className="text-slate-200 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 leading-relaxed break-words">
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-700/80 flex gap-2 shrink-0 bg-slate-900/60">
                <input
                  type="text"
                  placeholder="Type message to cohort..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  maxLength={500}
                  className="flex-1 px-3 py-2 text-xs bg-slate-800 rounded-xl border border-slate-700 focus:outline-hidden focus:border-indigo-500 text-white placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-[#55B957] hover:bg-[#46a548] disabled:opacity-40 rounded-xl text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Real Participants List */}
          {activeTab === 'participants' && (
            <div className="p-3 sm:p-4 space-y-2 overflow-y-auto flex-1">
              {participants.map((p) => {
                const isLocal = p.identity === localParticipant?.identity;
                const isMicOn = p.isMicrophoneEnabled;
                const isCamOn = p.isCameraEnabled;

                return (
                  <div
                    key={p.identity}
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr bg-[#55B957] hover:bg-[#46a548] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
                        {(p.name || p.identity).charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-semibold text-white block truncate">
                          {p.name || p.identity} {isLocal && '(You)'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.identity === classDetails?.course?.instructorId ? 'Host / Instructor' : 'Participant'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMicOn ? (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      {isCamOn ? (
                        <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

