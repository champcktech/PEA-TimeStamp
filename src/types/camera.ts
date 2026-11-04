export type StampTemplate = 'classic' | 'survey' | 'security' | 'minimal' | 'hud';
export type StampPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-full';
export type DateStyle = 'thai' | 'western';
export type CoordFormat = 'dms' | 'decimal';

export interface StampData {
  timestamp: Date;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  address: string;
  note: string;
  project: string;
  inspector: string;
  poleId?: string; // เช่น PEA-0421, ต้นที่ 14
  voltageLevel?: string; // เช่น 22 kV, 33 kV, 220V/380V
  surveyType?: string; // เช่น สำรวจแนวเสา-สายไฟ, ตรวจสอบหม้อแปลง
}

export interface StampSettings {
  template: StampTemplate;
  position: StampPosition;
  dateStyle: DateStyle;
  coordFormat: CoordFormat;
  showLogo: boolean;
  logoText: string;
  showAddress: boolean;
  showCoords: boolean;
  showDateTime: boolean;
  showNote: boolean;
  showElevation: boolean;
  showCompass: boolean;
  showElectricalTag: boolean; // แสดงแท็กงานสำรวจไฟฟ้า/รหัสเสา
  accentColor: string;
  opacity: number;
  fontSizeScale: number;
}

export interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  blob: Blob;
  thumbnailUrl: string;
  timestamp: Date;
  fileName: string;
  metadata: StampData;
  durationSec?: number;
  fileSizeBytes: number;
  width: number;
  height: number;
}
