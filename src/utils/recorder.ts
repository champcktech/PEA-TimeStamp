import { CapturedMedia, StampData, StampSettings } from '../types/camera';
import { drawTimestampOverlay } from './stampRenderer';

export class CanvasVideoRecorder {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private timerIntervalId: number | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private isRecording: boolean = false;
  private isMirrored: boolean = false;
  private zoomLevel: number = 1;

  constructor(videoElement: HTMLVideoElement, audioTrack: MediaStreamTrack | null, isMirrored: boolean = false, zoomLevel: number = 1) {
    this.videoElement = videoElement;
    this.audioTrack = audioTrack;
    this.isMirrored = isMirrored;
    this.zoomLevel = zoomLevel;

    this.canvas = document.createElement('canvas');
    // Ensure reasonable recording dimensions (e.g. 1280x720 or native)
    const w = videoElement.videoWidth || 1280;
    const h = videoElement.videoHeight || 720;
    this.canvas.width = w;
    this.canvas.height = h;

    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Unable to create canvas 2d context for recording');
    }
    this.ctx = context;
  }

  /**
   * Start recording with live stamped canvas stream
   */
  public start(
    getStampData: () => StampData,
    getSettings: () => StampSettings,
    onTick: (durationSec: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const w = this.videoElement.videoWidth || 1280;
        const h = this.videoElement.videoHeight || 720;
        this.canvas.width = w;
        this.canvas.height = h;

        this.recordedChunks = [];
        this.isRecording = true;
        this.startTime = Date.now();

        // Continuous composite render loop
        const renderLoop = () => {
          if (!this.isRecording) return;

          const width = this.canvas.width;
          const height = this.canvas.height;

          // Crop for zoom
          const z = Math.max(1, this.zoomLevel);
          const cropW = width / z;
          const cropH = height / z;
          const cropX = (width - cropW) / 2;
          const cropY = (height - cropH) / 2;

          // 1. Draw live camera frame
          if (this.isMirrored) {
            this.ctx.save();
            this.ctx.translate(width, 0);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.videoElement, cropX, cropY, cropW, cropH, 0, 0, width, height);
            this.ctx.restore();
          } else {
            this.ctx.drawImage(this.videoElement, cropX, cropY, cropW, cropH, 0, 0, width, height);
          }

          // 2. Draw live timestamp overlay with real-time clock
          const currentData = { ...getStampData(), timestamp: new Date() };
          const currentSettings = getSettings();
          drawTimestampOverlay(this.ctx, width, height, currentData, currentSettings);

          this.animationFrameId = requestAnimationFrame(renderLoop);
        };

        // Start render loop
        renderLoop();

        // Capture canvas stream at 30fps
        const canvasStream = (this.canvas as unknown as { captureStream: (fps: number) => MediaStream }).captureStream(30);

        // Add audio track from microphone if available
        if (this.audioTrack) {
          try {
            canvasStream.addTrack(this.audioTrack);
          } catch (e) {
            console.warn('Could not add audio track to video recording stream:', e);
          }
        }

        // Determine best supported MIME type
        const candidates = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ];
        let mimeType = '';
        for (const candidate of candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            mimeType = candidate;
            break;
          }
        }

        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        this.mediaRecorder = new MediaRecorder(canvasStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        // Duration ticker
        this.timerIntervalId = window.setInterval(() => {
          const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
          onTick(elapsedSec);
        }, 500);

        this.mediaRecorder.start(500); // 500ms chunk timeslice
        resolve();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Stop recording and return finished media item
   */
  public stop(finalMetadata: StampData): Promise<CapturedMedia> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        reject(new Error('Recorder is not active'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

          // Generate thumbnail snapshot from canvas
          const thumbnailUrl = this.canvas.toDataURL('image/jpeg', 0.85);

          const now = new Date();
          const timestampId = now.getTime();
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const fileName = `TIMEMARK_VIDEO_${formatDateForFileName(now)}.${extension}`;

          const media: CapturedMedia = {
            id: `video_${timestampId}`,
            type: 'video',
            url,
            blob,
            thumbnailUrl,
            timestamp: now,
            fileName,
            metadata: finalMetadata,
            durationSec,
            fileSizeBytes: blob.size,
            width: this.canvas.width,
            height: this.canvas.height,
          };

          this.cleanup();
          resolve(media);
        } catch (e) {
          this.cleanup();
          reject(e);
        }
      };

      this.isRecording = false;
      this.mediaRecorder.stop();
    });
  }

  public cancel(): void {
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }
}

/**
 * Helper to generate consistent readable file names: YYYYMMDD_HHMMSS
 */
export function formatDateForFileName(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}_${h}${min}${s}`;
}
