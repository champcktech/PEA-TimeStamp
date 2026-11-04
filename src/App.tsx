import { useState, useEffect, useRef, useCallback } from 'react';
import { CapturedMedia, StampData, StampSettings } from './types/camera';
import { reverseGeocode, calculateDistanceMeters } from './utils/geo';
import { soundManager } from './utils/audio';
import { captureStampedPhoto } from './utils/photoCapture';
import { CanvasVideoRecorder } from './utils/recorder';
import { SimulatedCameraStream } from './utils/simulatedCamera';
import { CameraViewfinder } from './components/CameraViewfinder';
import { CameraControls } from './components/CameraControls';
import { StampSettingsModal } from './components/StampSettingsModal';
import { QuickNoteDrawer } from './components/QuickNoteDrawer';
import { GalleryModal } from './components/GalleryModal';
import { CheckCircle2, AlertCircle, Share2, Eye } from 'lucide-react';

const DEFAULT_STAMP_SETTINGS: StampSettings = {
  template: 'classic',
  position: 'bottom-left',
  dateStyle: 'thai',
  coordFormat: 'decimal',
  showLogo: false,
  logoText: '',
  showAddress: true,
  showCoords: true,
  showDateTime: true,
  showNote: false,
  showElevation: false,
  showCompass: false,
  showElectricalTag: true,
  accentColor: '#FFB800',
  opacity: 0.88,
  fontSizeScale: 1.0,
};

export default function App() {
  // Video element ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Active camera stream & recorder instances
  const streamRef = useRef<MediaStream | null>(null);
  const simStreamRef = useRef<SimulatedCameraStream | null>(null);
  const recorderRef = useRef<CanvasVideoRecorder | null>(null);
  const wakeLockRef = useRef<unknown>(null);

  // Mode: Photo or Video
  const [mode, setMode] = useState<'photo' | 'video'>('photo');

  // Camera hardware state
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [orientationAngle, setOrientationAngle] = useState<number>(0);

  // Video Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationSec, setRecordDurationSec] = useState(0);

  // Flash animation trigger
  const [isShutterFlashing, setIsShutterFlashing] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error'; action?: { label: string; onClick: () => void } } | null>(null);

  // Stamp Data (GPS, Clock, Address, Electrical Asset Info)
  const [stampData, setStampData] = useState<StampData>({
    timestamp: new Date(),
    latitude: 19.891025, // Coords matching user's photo sample
    longitude: 99.223338,
    accuracy: 3,
    altitude: 460,
    heading: 180,
    address: 'ตำบล สันทราย อำเภอ ฝาง เชียงใหม่ 50110',
    note: '',
    project: 'งานสำรวจระบบจำหน่ายไฟฟ้า',
    inspector: 'ช่างสำรวจ กฟภ.',
    poleId: 'PEA-01',
    voltageLevel: '22 kV',
    surveyType: 'สำรวจแนวเสาและสายไฟ',
  });

  // Stamp Customization Settings
  const [stampSettings, setStampSettings] = useState<StampSettings>(DEFAULT_STAMP_SETTINGS);

  // Gallery of captured media
  const [mediaList, setMediaList] = useState<CapturedMedia[]>([]);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickNotesOpen, setIsQuickNotesOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Toast trigger helper
  const showToast = (
    text: string,
    type: 'success' | 'info' | 'error' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    setToastMessage({ text, type, action });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Screen Wake Lock API for smartphones (keeps screen awake during camera use & recording)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          wakeLockRef.current = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<unknown> } }).wakeLock.request('screen');
        }
      } catch {}
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current && typeof (wakeLockRef.current as { release?: () => Promise<void> }).release === 'function') {
        (wakeLockRef.current as { release: () => Promise<void> }).release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Screen Orientation detection
  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window !== 'undefined') {
        const angle = window.screen?.orientation?.angle ?? (window.innerWidth > window.innerHeight ? 90 : 0);
        setOrientationAngle(angle);
      }
    };
    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Live real-time clock update (every 1 second)
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setStampData((prev) => ({
        ...prev,
        timestamp: new Date(),
      }));
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Track last reverse-geocoded coordinates to prevent redundant network calls
  const lastGeocodedCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const isGeocodingRef = useRef(false);

  // Automatically fetch human-readable Thai address from GPS coordinates
  const updateAddressFromCoords = useCallback(async (lat: number | null, lon: number | null, force: boolean = false) => {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return;

    if (!force && lastGeocodedCoordsRef.current) {
      const dist = calculateDistanceMeters(
        lastGeocodedCoordsRef.current.lat,
        lastGeocodedCoordsRef.current.lon,
        lat,
        lon
      );
      // Only re-query if moved more than 35 meters
      if (dist < 35) return;
    }

    if (isGeocodingRef.current && !force) return;
    isGeocodingRef.current = true;

    try {
      const addr = await reverseGeocode(lat, lon);
      if (addr) {
        lastGeocodedCoordsRef.current = { lat, lon };
        setStampData((prev) => ({ ...prev, address: addr }));
      }
    } catch (e) {
      console.warn('Auto reverse geocoding error:', e);
    } finally {
      isGeocodingRef.current = false;
    }
  }, []);

  // Geolocation & Device Sensors watcher
  const requestGeolocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const acc = position.coords.accuracy;
          const alt = position.coords.altitude;
          const hdg = position.coords.heading;

          setStampData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
            accuracy: acc,
            altitude: alt !== null ? alt : prev.altitude,
            heading: hdg !== null ? hdg : prev.heading,
          }));

          // Automatically derive place / address from fresh coordinates
          updateAddressFromCoords(lat, lon, true);
        },
        (err) => {
          console.warn('Geolocation initial query error:', err.message);
          // If browser GPS is denied or unavailable, resolve location for fallback coords
          if (stampData.latitude && stampData.longitude) {
            updateAddressFromCoords(stampData.latitude, stampData.longitude, false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );

      // Continuous watcher for moving surveyors
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setStampData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude ?? prev.altitude,
            heading: position.coords.heading ?? prev.heading,
          }));

          // Automatically re-geocode whenever inspector moves to a new pole (>35m)
          updateAddressFromCoords(lat, lon, false);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [updateAddressFromCoords, stampData.latitude, stampData.longitude]);

  useEffect(() => {
    requestGeolocation();
  }, [requestGeolocation]);

  // Compass heading from device orientation sensor if available
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && !isNaN(e.alpha)) {
        // alpha: 0 is north on iOS if webkitCompassHeading exists
        const heading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading ?? (360 - e.alpha);
        setStampData((prev) => ({ ...prev, heading: Math.round(heading) }));
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  // Initialize camera stream (Physical smartphone camera or fallback to simulated)
  const initCamera = useCallback(async (facing: 'environment' | 'user', forceSimulated: boolean = false) => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (simStreamRef.current) {
      simStreamRef.current.stop();
      simStreamRef.current = null;
    }

    if (forceSimulated) {
      // Create simulated camera stream
      const sim = new SimulatedCameraStream(1280, 720);
      const stream = sim.start();
      simStreamRef.current = sim;
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsSimulatedCamera(true);
      setIsTorchSupported(false);
      setTorchEnabled(false);
      showToast('เปิดโหมดจำลองกล้อง (Simulated Camera)', 'info');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported');
      }

      // Check available devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {}

      // Smartphone optimized video constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: true, // For video recording
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsSimulatedCamera(false);

      // Check torch capability on smartphones
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities?.();
        setIsTorchSupported(Boolean(capabilities?.torch));
      }
    } catch (err) {
      console.warn('Physical camera unavailable, activating simulated camera:', err);
      // Auto fallback to simulated camera so user never gets stuck
      initCamera(facing, true);
    }
  }, []);

  // Run camera initialization on mount
  useEffect(() => {
    initCamera(facingMode, false);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (simStreamRef.current) {
        simStreamRef.current.stop();
      }
    };
  }, [facingMode, initCamera]);

  // Camera switch (Front / Back)
  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setZoomLevel(1); // Reset zoom on camera switch
    initCamera(nextFacing, isSimulatedCamera);
  };

  // Toggle Simulated Camera
  const handleToggleSimulatedCamera = () => {
    const nextSim = !isSimulatedCamera;
    initCamera(facingMode, nextSim);
  };

  // Torch / Flashlight toggle
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextTorch = !torchEnabled;
      await (videoTrack as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchEnabled(nextTorch);
    } catch (e) {
      console.warn('Failed to toggle torch:', e);
    }
  };

  // Sound Mute Toggle
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundManager.muted = nextMute;
  };

  // Quick Share helper for smartphone
  const handleQuickShare = async (media: CapturedMedia) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File(
          [media.blob],
          media.fileName,
          { type: media.type === 'video' ? 'video/webm' : 'image/jpeg' }
        );
        await navigator.share({
          title: 'TimeMark GPS Record',
          text: `บันทึกเมื่อ ${media.timestamp.toLocaleTimeString()} พิกัด: ${media.metadata.latitude}, ${media.metadata.longitude}`,
          files: [file],
        });
      } catch {
        // Fallback to gallery
        setIsGalleryOpen(true);
      }
    } else {
      setIsGalleryOpen(true);
    }
  };

  // Capture Photo Handler
  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;

    // Trigger tactile shutter click and vibration
    soundManager.playShutter();
    soundManager.vibrate([20, 60, 20]);

    // Visual shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 240);

    try {
      const isMirrored = facingMode === 'user';
      const captured = await captureStampedPhoto(
        videoRef.current,
        stampData,
        stampSettings,
        isMirrored,
        zoomLevel
      );

      setMediaList((prev) => [captured, ...prev]);
      showToast(
        '📸 บันทึกภาพถ่ายประทับเวลาแล้ว!',
        'success',
        {
          label: 'ดูภาพ / ส่ง LINE',
          onClick: () => handleQuickShare(captured),
        }
      );
    } catch (err) {
      console.error('Error capturing photo:', err);
      showToast('ไม่สามารถบันทึกภาพได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  // Start Video Recording Handler
  const handleStartVideoRecord = async () => {
    if (!videoRef.current || isRecording) return;

    try {
      soundManager.playRecordStart();
      soundManager.vibrate([40, 80, 40]);

      const audioTrack = streamRef.current?.getAudioTracks()[0] || null;
      const isMirrored = facingMode === 'user';

      const recorder = new CanvasVideoRecorder(videoRef.current, audioTrack, isMirrored, zoomLevel);
      recorderRef.current = recorder;

      setRecordDurationSec(0);
      setIsRecording(true);

      // Start recording with continuous stamped overlay loop
      await recorder.start(
        () => stampData,
        () => stampSettings,
        (durationSec) => setRecordDurationSec(durationSec)
      );
    } catch (err) {
      console.error('Failed to start video recording:', err);
      setIsRecording(false);
      showToast('ไม่สามารถเริ่มบันทึกวิดีโอได้', 'error');
    }
  };

  // Stop Video Recording Handler
  const handleStopVideoRecord = async () => {
    if (!recorderRef.current || !isRecording) return;

    try {
      soundManager.playRecordStop();
      soundManager.vibrate(80);

      const capturedVideo = await recorderRef.current.stop(stampData);
      recorderRef.current = null;
      setIsRecording(false);
      setRecordDurationSec(0);

      setMediaList((prev) => [capturedVideo, ...prev]);
      showToast(
        '🎥 บันทึกวิดีโอประทับเวลาสำเร็จ!',
        'success',
        {
          label: 'ดูวิดีโอ / ส่งแชร์',
          onClick: () => handleQuickShare(capturedVideo),
        }
      );
    } catch (err) {
      console.error('Failed to stop video recording:', err);
      setIsRecording(false);
      showToast('เกิดข้อผิดพลาดในการบันทึกวิดีโอ', 'error');
    }
  };

  // Hardware / Bluetooth selfie stick / Keyboard shutter trigger
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (mode === 'photo') {
          handleCapturePhoto();
        } else {
          if (isRecording) handleStopVideoRecord();
          else handleStartVideoRecord();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode, isRecording, zoomLevel, stampData, stampSettings]);

  // Delete media item from gallery
  const handleDeleteMedia = (id: string) => {
    setMediaList((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((m) => m.id !== id);
    });
    showToast('ลบไฟล์เรียบร้อยแล้ว', 'info');
  };

  const lastThumbnail = mediaList.length > 0 ? mediaList[0].thumbnailUrl : null;
  const isMirrored = facingMode === 'user';

  return (
    <div className="relative w-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-slate-100 flex flex-col font-sans select-none touch-none">
      {/* Toast Notification Banner (Mobile optimized pill) */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 max-w-[92vw]">
          <div
            className={`px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2.5 backdrop-blur-md border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 text-rose-200 border-rose-500/50'
                : 'bg-slate-900/95 text-slate-200 border-slate-700/70'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="truncate">{toastMessage.text}</span>
            {toastMessage.action && (
              <button
                onClick={toastMessage.action.onClick}
                className="ml-1 min-h-[32px] px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 shrink-0 flex items-center gap-1 shadow"
              >
                <Share2 className="w-3 h-3" />
                <span>{toastMessage.action.label}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Fullscreen Camera Viewfinder */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        <CameraViewfinder
          videoRef={videoRef}
          showGrid={showGrid}
          isMirrored={isMirrored}
          stampData={stampData}
          stampSettings={stampSettings}
          isRecording={isRecording}
          recordDurationSec={recordDurationSec}
          isShutterFlashing={isShutterFlashing}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          orientationAngle={orientationAngle}
        />

        {/* Camera Controls Layer (Thumb Ergonomics) */}
        <CameraControls
          mode={mode}
          setMode={setMode}
          onCapturePhoto={handleCapturePhoto}
          onStartVideoRecord={handleStartVideoRecord}
          onStopVideoRecord={handleStopVideoRecord}
          isRecording={isRecording}
          recordDurationSec={recordDurationSec}
          onSwitchCamera={handleSwitchCamera}
          hasMultipleCameras={hasMultipleCameras}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          torchEnabled={torchEnabled}
          onToggleTorch={handleToggleTorch}
          isTorchSupported={isTorchSupported}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onOpenQuickNotes={() => setIsQuickNotesOpen(true)}
          galleryCount={mediaList.length}
          lastMediaThumbnail={lastThumbnail}
          gpsAccuracy={stampData.accuracy}
          isSimulatedCamera={isSimulatedCamera}
          onToggleSimulatedCamera={handleToggleSimulatedCamera}
          currentProject={stampData.project}
          poleId={stampData.poleId}
        />
      </main>

      {/* Stamp Customization Settings Modal */}
      <StampSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={stampSettings}
        setSettings={setStampSettings}
      />

      {/* Quick Notes & Project Drawer */}
      <QuickNoteDrawer
        isOpen={isQuickNotesOpen}
        onClose={() => setIsQuickNotesOpen(false)}
        stampData={stampData}
        setStampData={setStampData}
        onRefreshGps={requestGeolocation}
      />

      {/* Media Gallery & Stamped File Viewer */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        mediaList={mediaList}
        onDeleteMedia={handleDeleteMedia}
      />
    </div>
  );
}
