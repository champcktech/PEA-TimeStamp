import React, { useState, useRef } from 'react';
import { StampData, StampSettings } from '../types/camera';
import { formatStampDateTime } from '../utils/stampRenderer';
import { formatCoordinates, formatHeading } from '../utils/geo';
import { MapPin, Navigation, Mountain, Sun } from 'lucide-react';

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showGrid: boolean;
  isMirrored: boolean;
  stampData: StampData;
  stampSettings: StampSettings;
  isRecording: boolean;
  recordDurationSec: number;
  isShutterFlashing: boolean;
  zoomLevel: number;
  setZoomLevel: (z: number | ((prev: number) => number)) => void;
  orientationAngle: number;
  hardwareZoomApplied?: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({
  videoRef,
  showGrid,
  isMirrored,
  stampData,
  stampSettings,
  isRecording,
  recordDurationSec,
  isShutterFlashing,
  zoomLevel,
  setZoomLevel,
  orientationAngle,
  hardwareZoomApplied = false,
}) => {
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const touchDistanceRef = useRef<number | null>(null);
  const zoomFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const triggerZoomHUD = () => {
    setIsZooming(true);
    if (zoomFadeTimeoutRef.current) clearTimeout(zoomFadeTimeoutRef.current);
    zoomFadeTimeoutRef.current = setTimeout(() => {
      setIsZooming(false);
    }, 1200);
  };

  const handleTapToFocus = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });

    // Clear after animation
    setTimeout(() => {
      setFocusPoint(null);
    }, 1500);
  };

  // Double tap to toggle 1x and 2x zoom, or single tap to focus
  const handleClickOrTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 280) {
      // Double-tap detected: toggle zoom 1x / 2x
      setZoomLevel((prev) => (prev > 1.2 ? 1 : 2));
      triggerZoomHUD();
      lastTapTimeRef.current = 0;
      return;
    }
    lastTapTimeRef.current = now;
    handleTapToFocus(e);
  };

  // Smartphone Pinch-to-Zoom handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
      triggerZoomHUD();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.hypot(dx, dy);
      const ratio = newDistance / touchDistanceRef.current;
      touchDistanceRef.current = newDistance;

      setZoomLevel((prev) => {
        const next = Math.max(1, Math.min(6, prev * (ratio > 1 ? 1.05 : 0.95)));
        return Math.round(next * 10) / 10;
      });
      triggerZoomHUD();
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  const { timeStr, dateStr } = formatStampDateTime(stampData.timestamp, stampSettings.dateStyle);
  const coordStr = formatCoordinates(stampData.latitude, stampData.longitude, stampSettings.coordFormat);
  const headingStr = formatHeading(stampData.heading);

  // Position class for live overlay
  const getPositionClasses = () => {
    switch (stampSettings.position) {
      case 'bottom-right':
        return 'bottom-28 right-4 text-right items-end';
      case 'top-left':
        return 'top-16 left-4 text-left items-start';
      case 'top-right':
        return 'top-16 right-4 text-right items-end';
      case 'bottom-full':
        return 'bottom-24 left-0 right-0 rounded-none w-full border-x-0 border-b-0';
      case 'bottom-left':
      default:
        return 'bottom-28 left-4 text-left items-start';
    }
  };

  // Transform origin based on position so scaling behaves naturally
  const getTransformOrigin = () => {
    switch (stampSettings.position) {
      case 'bottom-right':
        return 'bottom right';
      case 'top-left':
        return 'top left';
      case 'top-right':
        return 'top right';
      case 'bottom-full':
        return 'bottom center';
      case 'bottom-left':
      default:
        return 'bottom left';
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      onClick={handleClickOrTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black select-none touch-none"
    >
      {/* Live Video Element with scale & mirror */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          transform: `${!hardwareZoomApplied && zoomLevel > 1 ? `scale(${zoomLevel})` : ''} ${isMirrored ? 'scaleX(-1)' : ''}`,
          transformOrigin: 'center center',
        }}
        className="w-full h-full object-cover transition-transform duration-100 ease-out pointer-events-none"
      />

      {/* Floating HUD Zoom Multiplier Badge on Pinch/Zoom */}
      {isZooming && (
        <div className="absolute top-20 z-30 pointer-events-none flex flex-col items-center animate-in fade-in zoom-in-90 duration-150">
          <div className="px-3.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/80 shadow-2xl flex items-center gap-1.5 ring-2 ring-amber-400/20">
            <span className="text-amber-400 font-bold text-[11px] uppercase tracking-wider">ซูม</span>
            <span className="text-white font-mono-numbers font-black text-sm">{zoomLevel.toFixed(1)}×</span>
          </div>
        </div>
      )}

      {/* Shutter White Flash overlay */}
      {isShutterFlashing && (
        <div className="absolute inset-0 bg-white pointer-events-none shutter-flash-active z-30" />
      )}

      {/* 3x3 Rule-of-Thirds Grid */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-white/15">
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-r border-b border-white/20" />
          <div className="border-b border-white/20" />
          <div className="border-r border-white/20" />
          <div className="border-r border-white/20" />
          <div />
        </div>
      )}

      {/* Center electrical pole surveyor crosshair with vertical plumb alignment line */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-30">
        {/* Vertical plumb guide for checking pole tilt */}
        <div className="w-[1px] h-36 bg-amber-400/60 dashed" />
        <div className="w-10 h-10 border border-amber-400/80 rounded-full absolute flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
        </div>
      </div>

      {/* Tap-to-focus reticle with exposure sun icon */}
      {focusPoint && (
        <div
          style={{ left: focusPoint.x - 30, top: focusPoint.y - 30 }}
          className="absolute w-15 h-15 border-2 border-amber-400 rounded-sm pointer-events-none z-20 animate-pulse flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          <Sun className="w-3.5 h-3.5 text-amber-300 absolute -right-4 -top-3 animate-spin duration-1000" />
        </div>
      )}

      {/* Live Recording HUD Header */}
      {isRecording && (
        <div className="absolute top-14 left-0 right-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2.5 border border-red-500/40 shadow-lg shadow-red-950/40">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-rec" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">REC</span>
            <span className="text-sm font-mono-numbers font-bold text-white tracking-wider">
              {formatTimer(recordDurationSec)}
            </span>
          </div>
        </div>
      )}

      {/* Live On-Screen Stamp Preview (Shows user exactly what is being stamped) */}
      <div
        className={`absolute z-20 pointer-events-none transition-all duration-150 ${getPositionClasses()}`}
        style={{
          maxWidth: stampSettings.position === 'bottom-full' ? '100%' : '90%',
          transform: `scale(${stampSettings.fontSizeScale || 1})`,
          transformOrigin: getTransformOrigin(),
        }}
      >
        {stampSettings.template === 'classic' ? (
          /* Thai Official TimeMark Layout (Identical to user's uploaded reference image) */
          <div className="flex flex-col select-none">
            {/* Top row: 18:12 | 04 พ.ย. 2569 \n พ. */}
            <div className="flex items-center gap-2.5">
              <span
                className="text-5xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                style={{ fontFamily: "'Oswald', 'Plus Jakarta Sans', sans-serif" }}
              >
                {formatStampDateTime(stampData.timestamp, stampSettings.dateStyle).timeHM}
              </span>
              {/* Yellow vertical bar */}
              <div
                className="w-1.5 self-stretch rounded-full my-1 shadow-sm shrink-0"
                style={{ backgroundColor: stampSettings.accentColor }}
              />
              {/* Date & Day abbreviation */}
              <div className="flex flex-col text-white text-xs sm:text-sm font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-tight">
                <span>{formatStampDateTime(stampData.timestamp, stampSettings.dateStyle).dateFormatted}</span>
                <span className="font-bold">{formatStampDateTime(stampData.timestamp, stampSettings.dateStyle).dayShort}</span>
              </div>
            </div>

            {/* Middle row: Address lines */}
            <div className="mt-2 text-white text-xs sm:text-sm font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-relaxed">
              {(() => {
                const fullAddr = stampData.address || 'ตำบล สันทราย อำเภอ ฝาง เชียงใหม่ 50110';
                const match = fullAddr.match(/\b\d{5}\b/);
                if (match) {
                  const line1 = fullAddr.replace(match[0], '').trim().replace(/,\s*$/, '');
                  return (
                    <>
                      <div>{line1}</div>
                      <div>{match[0]}</div>
                    </>
                  );
                }
                return <div>{fullAddr}</div>;
              })()}
            </div>

            {/* Bottom row: Translucent Coordinates Box */}
            <div
              style={{
                backgroundColor: `rgba(15, 23, 42, ${Math.min(0.9, stampSettings.opacity * 0.65)})`,
              }}
              className="mt-2.5 px-3.5 py-2.5 rounded-2xl border border-white/20 backdrop-blur-sm inline-block shadow-2xl max-w-fit"
            >
              <div className="text-xs sm:text-sm text-slate-100 font-mono-numbers font-medium leading-snug">
                <div>ละติจูดและลองจิจูด: {stampData.latitude !== null ? stampData.latitude.toFixed(6) : '19.891025'},</div>
                <div>{stampData.longitude !== null ? stampData.longitude.toFixed(6) : '99.223338'}</div>
                {stampSettings.showElectricalTag && (stampData.poleId || stampData.surveyType || stampData.voltageLevel) && (
                  <div className="text-amber-300 font-bold mt-1.5 pt-1.5 border-t border-white/15 text-[11px] sm:text-xs truncate flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>
                      {[stampData.surveyType || 'งานสำรวจระบบไฟฟ้า', stampData.poleId ? `เสา ${stampData.poleId}` : '', stampData.voltageLevel].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Alternative Card Box for Other Templates */
          <div
            style={{
              backgroundColor: `rgba(15, 23, 42, ${stampSettings.opacity * 0.85})`,
              borderColor: 'rgba(255, 255, 255, 0.18)',
            }}
            className="p-3 rounded-xl border backdrop-blur-md shadow-2xl text-white text-xs max-w-md"
          >
            {/* Header row: Time & Date */}
            {stampSettings.showDateTime && (
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <span className="text-xl font-bold font-mono-numbers text-white tracking-tight">
                  {timeStr}
                </span>
                <span className="text-xs font-medium text-slate-300">
                  {dateStr}
                </span>
              </div>
            )}

            {/* GPS Coordinates line */}
            {stampSettings.showCoords && (
              <div className="flex items-center gap-1.5 my-0.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: stampSettings.accentColor }} />
                <span
                  className="font-mono-numbers font-semibold tracking-tight"
                  style={{ color: stampSettings.accentColor }}
                >
                  {coordStr}
                </span>
                {stampData.accuracy && (
                  <span className="text-[10px] text-slate-400 font-mono-numbers">
                    (±{Math.round(stampData.accuracy)}m)
                  </span>
                )}
              </div>
            )}

            {/* Telemetry row (Heading, Elevation) */}
            {(stampSettings.showElevation || stampSettings.showCompass) && (
              <div className="flex items-center gap-3 text-[11px] text-slate-300 my-0.5">
                {stampSettings.showElevation && stampData.altitude !== null && (
                  <div className="flex items-center gap-1">
                    <Mountain className="w-3 h-3 text-slate-400" />
                    <span>{Math.round(stampData.altitude)} m MSL</span>
                  </div>
                )}
                {stampSettings.showCompass && headingStr && (
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    <span>{headingStr}</span>
                  </div>
                )}
              </div>
            )}

            {/* Address Line */}
            {stampSettings.showAddress && stampData.address && (
              <div className="text-[11px] text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                📍 {stampData.address}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
