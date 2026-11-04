import { CapturedMedia, StampData, StampSettings } from '../types/camera';
import { formatDateForFileName } from './recorder';
import { drawTimestampOverlay } from './stampRenderer';

/**
 * Capture a high-resolution photo from the live video feed
 * and burn the TimeMark timestamp & GPS overlay directly into the JPEG file.
 */
export async function captureStampedPhoto(
  videoElement: HTMLVideoElement,
  stampData: StampData,
  stampSettings: StampSettings,
  isMirrored: boolean = false,
  zoomLevel: number = 1
): Promise<CapturedMedia> {
  // Use native resolution of camera stream
  const width = videoElement.videoWidth || 1920;
  const height = videoElement.videoHeight || 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create canvas 2D context for photo capture');
  }

  // Calculate source crop for digital zoom if zoomLevel > 1
  const cropW = width / Math.max(1, zoomLevel);
  const cropH = height / Math.max(1, zoomLevel);
  const cropX = (width - cropW) / 2;
  const cropY = (height - cropH) / 2;

  // Draw camera frame (mirror if front camera)
  if (isMirrored) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(videoElement, cropX, cropY, cropW, cropH, 0, 0, width, height);
  }

  // Stamp current exact timestamp & GPS metadata directly on image
  const captureData = { ...stampData, timestamp: new Date() };
  drawTimestampOverlay(ctx, width, height, captureData, stampSettings);

  // Convert to high-quality JPEG Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      0.96
    );
  });

  const url = URL.createObjectURL(blob);
  const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
  const now = new Date();
  const fileName = `TIMEMARK_PHOTO_${formatDateForFileName(now)}.jpg`;

  return {
    id: `photo_${now.getTime()}`,
    type: 'photo',
    url,
    blob,
    thumbnailUrl,
    timestamp: now,
    fileName,
    metadata: captureData,
    fileSizeBytes: blob.size,
    width,
    height,
  };
}
