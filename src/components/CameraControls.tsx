import React from 'react';
import {
  Grid,
  Zap,
  ZapOff,
  SwitchCamera,
  Settings,
  Volume2,
  VolumeX,
  FileText,
  Image as ImageIcon,
  Play,
  Square,
  Sparkles,
  Minus,
  Plus,
} from 'lucide-react';

interface CameraControlsProps {
  mode: 'photo' | 'video';
  setMode: (mode: 'photo' | 'video') => void;
  onCapturePhoto: () => void;
  onStartVideoRecord: () => void;
  onStopVideoRecord: () => void;
  isRecording: boolean;
  recordDurationSec: number;
  onSwitchCamera: () => void;
  hasMultipleCameras: boolean;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  torchEnabled: boolean;
  onToggleTorch: () => void;
  isTorchSupported: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenGallery: () => void;
  onOpenQuickNotes: () => void;
  galleryCount: number;
  lastMediaThumbnail: string | null;
  gpsAccuracy: number | null;
  currentProject: string;
  poleId?: string;
  zoomLevel: number;
  setZoomLevel: (z: number | ((prev: number) => number)) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  mode,
  setMode,
  onCapturePhoto,
  onStartVideoRecord,
  onStopVideoRecord,
  isRecording,
  recordDurationSec,
  onSwitchCamera,
  hasMultipleCameras,
  showGrid,
  setShowGrid,
  torchEnabled,
  onToggleTorch,
  isTorchSupported,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenGallery,
  onOpenQuickNotes,
  galleryCount,
  lastMediaThumbnail,
  gpsAccuracy,
  currentProject,
  poleId,
  zoomLevel,
  setZoomLevel,
}) => {
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Top App Bar with safe-area padding for mobile notch/Dynamic Island */}
      <header
        style={{
          paddingTop: 'max(0.65rem, env(safe-area-inset-top, 0px))',
        }}
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pb-2 bg-gradient-to-b from-black/90 via-black/50 to-transparent"
      >
        {/* Left slot: PEA Emblem, Electrical Survey Tag & GPS Accuracy badge */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-950/80 border border-purple-500/50 shadow-sm">
            <img
              src="/pea-logo.png"
              alt="PEA Logo"
              className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400"
            />
            <span className="text-[11px] font-bold text-white tracking-tight">PEA</span>
          </div>

          {/* Electrical Survey Pro badge & Active Pole ID */}
          <button
            onClick={onOpenQuickNotes}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            title="กดเพื่อแก้ไขรหัสเสาและข้อมูลงานสำรวจไฟฟ้า"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold tracking-tight">
              {poleId ? `เสา ${poleId}` : 'สำรวจไฟฟ้า'}
            </span>
          </button>

          {/* GPS Accuracy status badge */}
          <div className="text-[11px] font-mono-numbers px-2 py-1 rounded-md bg-slate-900/80 border border-slate-700/60 text-slate-200 flex items-center gap-1.5 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${gpsAccuracy !== null && gpsAccuracy <= 10 ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            <span>{gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : 'GPS...'}</span>
          </div>
        </div>

        {/* Right slot: Quick mobile camera toggles */}
        <div className="flex items-center gap-1">
          {/* Torch toggle */}
          {isTorchSupported && (
            <button
              onClick={onToggleTorch}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
                torchEnabled ? 'text-amber-400 bg-amber-500/25' : 'text-white/80 hover:text-white'
              }`}
              title="เปิด/ปิด ไฟฉาย"
            >
              {torchEnabled ? <Zap className="w-5 h-5 fill-amber-400 text-amber-400" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid((prev) => !prev)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
              showGrid ? 'text-amber-400 bg-white/15' : 'text-white/80 hover:text-white'
            }`}
            title="เส้นตาราง 3x3"
          >
            <Grid className="w-5 h-5" />
          </button>

          {/* Sound toggle */}
          <button
            onClick={onToggleMute}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
            title="เปิด/ปิด เสียงชัตเตอร์"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Camera switcher (Rear / Front) */}
          {hasMultipleCameras && (
            <button
              onClick={onSwitchCamera}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors active:rotate-180 duration-300"
              title="สลับกล้องหน้า/หลัง"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}

          {/* Settings modal trigger */}
          <button
            onClick={onOpenSettings}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
            title="ตั้งค่ารูปแบบ TimeMark"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Bottom Control Zone with mobile safe-area padding */}
      <footer
        style={{
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
        }}
        className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pt-2 px-4 bg-gradient-to-t from-black via-black/85 to-transparent select-none"
      >
        {/* Smartphone Zoom Presets Bar (Always visible & tap-able above shutter/modes) */}
        <div className="flex items-center gap-1 mb-2 px-2.5 py-1 bg-black/65 backdrop-blur-md rounded-full border border-white/20 shadow-xl pointer-events-auto">
          {/* Zoom Out Button (-0.2x) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevel((prev) => Math.max(1, Math.round((prev - 0.2) * 10) / 10));
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-xs"
            title="ลดระยะซูม (-0.2x)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Quick Zoom Presets: 1x, 2x, 3x, 5x */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 5].map((z) => {
              const isActive = Math.abs(zoomLevel - z) < 0.15;
              return (
                <button
                  key={z}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel(z);
                  }}
                  className={`min-w-[36px] h-8 px-2 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md scale-105 font-extrabold ring-1 ring-amber-300'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title={`ซูม ${z} เท่า`}
                >
                  {z}×
                </button>
              );
            })}
          </div>

          {/* Current non-preset zoom indicator (e.g. 1.4x, 2.6x) */}
          {![1, 2, 3, 5].some((z) => Math.abs(zoomLevel - z) < 0.15) && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold font-mono-numbers shadow-sm animate-in fade-in">
              {zoomLevel.toFixed(1)}×
            </span>
          )}

          {/* Zoom In Button (+0.2x) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomLevel((prev) => Math.min(6, Math.round((prev + 0.2) * 10) / 10));
            }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all text-xs"
            title="เพิ่มระยะซูม (+0.2x)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Mode Selector Tabs (Photo vs Video) */}
        {!isRecording && (
          <div className="flex items-center gap-1 mb-3.5 p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/15 shadow-lg">
            <button
              onClick={() => setMode('photo')}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                mode === 'photo'
                  ? 'bg-amber-400 text-slate-950 shadow-md scale-102'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              รูปภาพ (PHOTO)
            </button>
            <button
              onClick={() => setMode('video')}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                mode === 'video'
                  ? 'bg-red-500 text-white shadow-md scale-102'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              วิดีโอ (VIDEO)
            </button>
          </div>
        )}

        {/* Smartphone Thumb Shutter & Action Bar */}
        <div className="w-full max-w-sm flex items-center justify-between px-2">
          {/* Gallery Button (Left Thumb) */}
          <button
            onClick={onOpenGallery}
            className="relative min-w-[50px] min-h-[50px] w-13 h-13 rounded-2xl bg-slate-900/95 border-2 border-slate-700/80 overflow-hidden flex items-center justify-center active:scale-95 transition-transform shadow-lg"
            title="ดูแกลเลอรีภาพและวิดีโอ"
          >
            {lastMediaThumbnail ? (
              <img
                src={lastMediaThumbnail}
                alt="Last captured"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-slate-400" />
            )}
            {galleryCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-md">
                {galleryCount}
              </span>
            )}
          </button>

          {/* Primary Mobile Shutter Button (Center Thumb - 80px) */}
          <div className="flex items-center justify-center">
            {mode === 'photo' ? (
              <button
                onClick={onCapturePhoto}
                className="group relative w-20 h-20 rounded-full border-4 border-white/95 p-1.5 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-2xl hover:border-amber-400"
                title="กดถ่ายภาพประทับเวลา (Shutter)"
              >
                <div className="w-full h-full rounded-full bg-white group-hover:bg-amber-400 transition-colors shadow-inner flex items-center justify-center ring-2 ring-amber-400/30" />
              </button>
            ) : isRecording ? (
              <button
                onClick={onStopVideoRecord}
                className="relative w-20 h-20 rounded-full border-4 border-red-500 p-1.5 flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-xl shadow-red-950/70"
                title="หยุดบันทึกวิดีโอ"
              >
                <div className="w-9 h-9 rounded-md bg-red-500 flex items-center justify-center shadow">
                  <Square className="w-5 h-5 text-white fill-white" />
                </div>
              </button>
            ) : (
              <button
                onClick={onStartVideoRecord}
                className="group relative w-20 h-20 rounded-full border-4 border-red-500/90 p-1.5 flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-2xl hover:border-red-400"
                title="เริ่มบันทึกวิดีโอประทับเวลา"
              >
                <div className="w-full h-full rounded-full bg-red-500 group-hover:bg-red-400 transition-colors flex items-center justify-center shadow-inner">
                  <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                </div>
              </button>
            )}
          </div>

          {/* Electrical Pole Asset & Field Sheet Trigger (Right Thumb) */}
          <button
            onClick={onOpenQuickNotes}
            className="min-w-[50px] min-h-[50px] w-13 h-13 rounded-2xl bg-slate-900/95 border-2 border-amber-500/70 flex flex-col items-center justify-center text-slate-200 active:scale-95 transition-transform shadow-lg shadow-amber-950/40"
            title="ข้อมูลสำรวจไฟฟ้า / รหัสเสา"
          >
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400/40" />
            <span className="text-[9px] text-amber-300 font-bold truncate max-w-[46px] mt-0.5">
              {poleId || 'ระบุเสา'}
            </span>
          </button>
        </div>
      </footer>
    </>
  );
};
