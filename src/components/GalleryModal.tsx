import React, { useState } from 'react';
import { CapturedMedia } from '../types/camera';
import { formatStampDateTime } from '../utils/stampRenderer';
import { formatCoordinates } from '../utils/geo';
import {
  X,
  Download,
  Share2,
  Trash2,
  MapPin,
  ExternalLink,
  Film,
  Camera,
  Info,
  Calendar,
  Clock,
  HardDrive,
  Zap,
  Copy,
  Check,
} from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: CapturedMedia[];
  onDeleteMedia: (id: string) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  mediaList,
  onDeleteMedia,
}) => {
  const [selectedMedia, setSelectedMedia] = useState<CapturedMedia | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [copiedGis, setCopiedGis] = useState(false);

  if (!isOpen) return null;

  // Active item defaults to first item or selected item
  const currentItem = selectedMedia || (mediaList.length > 0 ? mediaList[0] : null);

  const handleDownload = (media: CapturedMedia) => {
    const a = document.createElement('a');
    a.href = media.url;
    a.download = media.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async (media: CapturedMedia) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File(
          [media.blob],
          media.fileName,
          { type: media.type === 'video' ? 'video/webm' : 'image/jpeg' }
        );
        await navigator.share({
          title: 'TimeMark GPS Record',
          text: `บันทึกเมื่อ: ${media.timestamp.toLocaleString()} พิกัด: ${media.metadata.latitude}, ${media.metadata.longitude}`,
          files: [file],
        });
      } catch (err) {
        // Fallback to link download if share cancelled or unsupported files
        handleDownload(media);
      }
    } else {
      handleDownload(media);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-6xl flex flex-col md:flex-row overflow-hidden text-slate-100">
        {/* Main Stage (Photo/Video Viewport) */}
        <div className="flex-1 relative flex flex-col bg-slate-950">
          {/* Top Bar for viewer */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 z-10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                {currentItem ? currentItem.fileName : 'แกลเลอรี TimeMark'}
              </span>
              {currentItem && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentItem.type === 'video' ? 'วิดีโอประทับเวลา' : 'ภาพถ่ายประทับเวลา'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {currentItem && (
                <>
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                    title="ข้อมูลพิกัดและไฟล์"
                  >
                    <Info className="w-5 h-5 text-amber-400" />
                  </button>
                  <button
                    onClick={() => handleShare(currentItem)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                    title="แชร์ไฟล์ภาพ/วิดีโอ"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(currentItem)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                    title="ดาวน์โหลดไฟล์ลงเครื่อง"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('คุณต้องการลบไฟล์นี้ใช่หรือไม่?')) {
                        onDeleteMedia(currentItem.id);
                        if (selectedMedia?.id === currentItem.id) {
                          setSelectedMedia(null);
                        }
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title="ลบไฟล์"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
                title="ปิดแกลเลอรี"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Media Display Area */}
          <div className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-black/60">
            {currentItem ? (
              currentItem.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center max-h-[75vh]">
                  <video
                    src={currentItem.url}
                    controls
                    playsInline
                    autoPlay
                    className="max-w-full max-h-full rounded-lg shadow-2xl object-contain border border-slate-800"
                  />
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center max-h-[75vh]">
                  <img
                    src={currentItem.url}
                    alt={currentItem.fileName}
                    className="max-w-full max-h-full rounded-lg shadow-2xl object-contain border border-slate-800"
                  />
                </div>
              )
            ) : (
              <div className="text-center p-8 text-slate-400">
                <Camera className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-sm font-medium">ยังไม่มีภาพหรือวิดีโอที่บันทึก</p>
                <p className="text-xs text-slate-500 mt-1">
                  กดถ่ายรูปภาพหรือวิดีโอเพื่อบันทึกตราประทับ GPS ลงไฟล์โดยตรง
                </p>
              </div>
            )}

            {/* Floating Mobile Action Bar at bottom of media viewer */}
            {currentItem && (
              <div className="absolute bottom-3 left-3 right-3 sm:hidden z-20 flex items-center gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl">
                <button
                  onClick={() => handleShare(currentItem)}
                  className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Share2 className="w-4 h-4" />
                  <span>ส่ง LINE / แชร์</span>
                </button>
                <button
                  onClick={() => handleDownload(currentItem)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-1 border border-slate-700"
                  title="ดาวน์โหลด"
                >
                  <Download className="w-4 h-4" />
                  <span>บันทึก</span>
                </button>
                {currentItem.metadata.latitude !== null && currentItem.metadata.longitude !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${currentItem.metadata.latitude},${currentItem.metadata.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center border border-slate-700"
                    title="เปิด Google Maps"
                  >
                    <MapPin className="w-4 h-4 text-amber-400" />
                  </a>
                )}
              </div>
            )}

            {/* Floating Info Overlay Drawer */}
            {showInfo && currentItem && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-20 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-400" /> ข้อมูลตราประทับในไฟล์
                  </span>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-slate-300">
                  {/* Electrical Asset Info */}
                  {(currentItem.metadata.poleId || currentItem.metadata.voltageLevel || currentItem.metadata.surveyType) && (
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200">
                      <div className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                        <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>เสา: {currentItem.metadata.poleId || 'ไม่ระบุ'}</span>
                        {currentItem.metadata.voltageLevel && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 font-semibold ml-auto">
                            {currentItem.metadata.voltageLevel}
                          </span>
                        )}
                      </div>
                      {currentItem.metadata.surveyType && (
                        <div className="text-[10px] text-amber-100/80 mt-1">
                          งาน: {currentItem.metadata.surveyType}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formatStampDateTime(currentItem.timestamp, 'thai').dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono-numbers">{formatStampDateTime(currentItem.timestamp, 'thai').timeStr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-mono-numbers text-amber-300">
                      {formatCoordinates(currentItem.metadata.latitude, currentItem.metadata.longitude, 'decimal')}
                    </span>
                  </div>
                  {currentItem.metadata.address && (
                    <div className="text-[11px] text-slate-400 pl-5 leading-relaxed">
                      {currentItem.metadata.address}
                    </div>
                  )}
                  {currentItem.metadata.project && (
                    <div className="text-[11px] text-amber-300 pl-5">
                      โครงการ: {currentItem.metadata.project}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {formatFileSize(currentItem.fileSizeBytes)} ({currentItem.width}×{currentItem.height})
                    </span>
                  </div>
                </div>

                {/* Quick copy GIS coordinates button */}
                <button
                  onClick={() => {
                    if (currentItem.metadata.latitude !== null && currentItem.metadata.longitude !== null) {
                      const textToCopy = `⚡ เสา ${currentItem.metadata.poleId || 'PEA'}: ${currentItem.metadata.latitude.toFixed(6)}, ${currentItem.metadata.longitude.toFixed(6)} (${currentItem.metadata.voltageLevel || '22 kV'})\n📍 ${currentItem.metadata.address || ''}\nhttps://www.google.com/maps?q=${currentItem.metadata.latitude},${currentItem.metadata.longitude}`;
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedGis(true);
                      setTimeout(() => setCopiedGis(false), 2000);
                    }
                  }}
                  className="min-h-[40px] w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs flex items-center justify-center gap-1.5 border border-amber-500/30 transition-colors"
                >
                  {copiedGis ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">คัดลอกพิกัดแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกพิกัดเสาไฟ (GIS LINE Format)</span>
                    </>
                  )}
                </button>

                {/* Google Maps link */}
                {currentItem.metadata.latitude !== null && currentItem.metadata.longitude !== null && (
                  <a
                    href={`https://www.google.com/maps?q=${currentItem.metadata.latitude},${currentItem.metadata.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[40px] mt-1 w-full py-1.5 px-3 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium text-xs flex items-center justify-center gap-1.5 border border-amber-500/40 transition-colors"
                  >
                    <span>ดูตำแหน่งใน Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Thumbnails Reel */}
        <div className="w-full md:w-72 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col max-h-48 md:max-h-full">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>ภาพสำรวจ ({mediaList.length})</span>
            </span>
          </div>

          <div className="flex-1 overflow-x-auto md:overflow-y-auto p-3 flex md:flex-col gap-2.5">
            {mediaList.map((media) => {
              const isSelected = currentItem?.id === media.id;
              return (
                <button
                  key={media.id}
                  onClick={() => setSelectedMedia(media)}
                  className={`min-h-[56px] relative shrink-0 w-28 md:w-full rounded-xl overflow-hidden border p-1 text-left flex md:flex-row flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full md:w-20 h-16 md:h-14 rounded-lg overflow-hidden bg-black shrink-0">
                    <img
                      src={media.thumbnailUrl || media.url}
                      alt={media.fileName}
                      className="w-full h-full object-cover"
                    />
                    {media.type === 'video' ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Film className="w-4 h-4 text-white" />
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono-numbers bg-black/80 px-1 rounded text-white">
                          {formatDuration(media.durationSec)}
                        </span>
                      </div>
                    ) : (
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono-numbers bg-black/80 px-1 rounded text-white">
                        JPG
                      </span>
                    )}

                    {/* Pole badge over thumbnail */}
                    {media.metadata.poleId && (
                      <span className="absolute top-1 left-1 bg-amber-500/90 text-slate-950 font-bold text-[8px] px-1 py-0.2 rounded shadow">
                        {media.metadata.poleId}
                      </span>
                    )}
                  </div>

                  {/* Metadata preview in list */}
                  <div className="hidden md:block flex-1 min-w-0 pr-1">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                      {media.metadata.poleId && <Zap className="w-3 h-3 text-amber-400 shrink-0" />}
                      <span className="truncate">{media.metadata.poleId ? `เสา ${media.metadata.poleId}` : media.fileName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-numbers mt-0.5">
                      {formatStampDateTime(media.timestamp, 'thai').shortDateStr}
                    </div>
                    <div className="text-[10px] text-amber-400 font-mono-numbers truncate">
                      {media.metadata.latitude !== null
                        ? `${media.metadata.latitude.toFixed(4)}, ${media.metadata.longitude?.toFixed(4)}`
                        : 'GPS'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
