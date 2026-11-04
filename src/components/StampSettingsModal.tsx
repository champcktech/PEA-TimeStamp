import React from 'react';
import {
  StampPosition,
  StampSettings,
  StampTemplate,
} from '../types/camera';
import { X, Check, Sliders, Palette, Layout, Type } from 'lucide-react';

interface StampSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StampSettings;
  setSettings: React.Dispatch<React.SetStateAction<StampSettings>>;
}

const TEMPLATES: { id: StampTemplate; name: string; desc: string }[] = [
  { id: 'classic', name: 'TimeMark Classic', desc: 'ป้ายมาตรฐาน ปรับใช้ได้ทุกงาน บันทึกเวลา พิกัด ที่อยู่ ชัดเจน' },
  { id: 'survey', name: 'งานตรวจไซต์ & ก่อสร้าง', desc: 'ตารางวิศวกรรม ระบุชื่อโครงการ ผู้ตรวจ ระดับความสูง และทิศทาง' },
  { id: 'security', name: 'หลักฐาน & ส่งมอบพัสดุ', desc: 'ตราประทับรับรอง Verified Proof ป้องกันการแก้ไข' },
  { id: 'minimal', name: 'มินิมอล คลีน', desc: 'ลายน้ำมุมภาพ เรียบหรู ไม่บดบังรายละเอียดภาพ' },
  { id: 'hud', name: 'ไซเบอร์ HUD แทคติคอล', desc: 'เส้นกรอบไฮเทค แสดงข้อมูลโทรมาตรแบบละเอียด' },
];

const POSITIONS: { id: StampPosition; label: string }[] = [
  { id: 'bottom-left', label: 'มุมซ้ายล่าง' },
  { id: 'bottom-right', label: 'มุมขวาล่าง' },
  { id: 'top-left', label: 'มุมซ้ายบน' },
  { id: 'top-right', label: 'มุมขวาบน' },
  { id: 'bottom-full', label: 'แถบยาวเต็มจอด้านล่าง' },
];

const ACCENT_COLORS = [
  { name: 'เหลือง TimeMark', value: '#FFB800' },
  { name: 'ส้มสะท้อนแสง', value: '#F97316' },
  { name: 'ฟ้าไฮเทค', value: '#00E5FF' },
  { name: 'เขียวเซฟตี้', value: '#22C55E' },
  { name: 'ขาวสว่าง', value: '#FFFFFF' },
];

export const StampSettingsModal: React.FC<StampSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              ตั้งค่าตราประทับ TimeMark
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Form */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Template Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-amber-400" />
              รูปแบบตราประทับ (Template)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSettings((s) => ({ ...s, template: tmpl.id }))}
                  className={`min-h-[44px] w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between ${
                    settings.template === tmpl.id
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-slate-800/50 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{tmpl.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{tmpl.desc}</div>
                  </div>
                  {settings.template === tmpl.id && (
                    <Check className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Position */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              ตำแหน่งบนภาพ/วิดีโอ
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => setSettings((s) => ({ ...s, position: pos.id }))}
                  className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border text-center transition-colors ${
                    settings.position === pos.id
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Accent Color */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-amber-400" />
              สีไฮไลต์พิกัดและหัวข้อ
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSettings((s) => ({ ...s, accentColor: c.value }))}
                  className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                    settings.accentColor === c.value
                      ? 'border-white bg-slate-800 text-white shadow'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/30"
                    style={{ backgroundColor: c.value }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Formats (Date & GPS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                รูปแบบวันที่
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings((s) => ({ ...s, dateStyle: 'thai' }))}
                  className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border ${
                    settings.dateStyle === 'thai'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  ไทย (พ.ศ. 2569)
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, dateStyle: 'western' }))}
                  className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border ${
                    settings.dateStyle === 'western'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  ค.ศ. (2026)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                รูปแบบพิกัด GPS
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettings((s) => ({ ...s, coordFormat: 'dms' }))}
                  className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border ${
                    settings.coordFormat === 'dms'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  DMS (องศา ลิปดา)
                </button>
                <button
                  onClick={() => setSettings((s) => ({ ...s, coordFormat: 'decimal' }))}
                  className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border ${
                    settings.coordFormat === 'decimal'
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  ทศนิยม (Decimal)
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Elements to show/hide */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 block">
              องค์ประกอบที่ประทับลงไฟล์
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showDateTime}
                  onChange={(e) => setSettings((s) => ({ ...s, showDateTime: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>วันและเวลา (Date & Time)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showCoords}
                  onChange={(e) => setSettings((s) => ({ ...s, showCoords: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>พิกัด GPS (Lat / Long)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showAddress}
                  onChange={(e) => setSettings((s) => ({ ...s, showAddress: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>ที่อยู่ / ตำแหน่งสถานที่</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showElevation}
                  onChange={(e) => setSettings((s) => ({ ...s, showElevation: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>ระดับความสูง (Altitude MSL)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showCompass}
                  onChange={(e) => setSettings((s) => ({ ...s, showCompass: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>ทิศทางเข็มทิศ (Heading)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showNote}
                  onChange={(e) => setSettings((s) => ({ ...s, showNote: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>โครงการ / หมายเหตุหน้างาน</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showLogo}
                  onChange={(e) => setSettings((s) => ({ ...s, showLogo: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>ลายน้ำข้อความแบรนด์</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showElectricalTag}
                  onChange={(e) => setSettings((s) => ({ ...s, showElectricalTag: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                />
                <span>⚡ ข้อมูลสำรวจไฟฟ้า / รหัสเสา</span>
              </label>
            </div>
          </div>

          {/* Section 6: Sliders for Opacity & Scale */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Type className="w-4 h-4 text-amber-400" />
                  ขนาดตัวหนังสือและตราประทับ
                </span>
                <span className="font-mono-numbers font-bold text-amber-400">{Math.round(settings.fontSizeScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.75"
                step="0.05"
                value={settings.fontSizeScale}
                onChange={(e) => setSettings((s) => ({ ...s, fontSizeScale: parseFloat(e.target.value) }))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex items-center gap-2 mt-2">
                {[
                  { label: 'ปกติ (100%)', val: 1.0 },
                  { label: 'ใหญ่ (125%)', val: 1.25 },
                  { label: 'ใหญ่พิเศษ (150%)', val: 1.5 },
                  { label: 'จัมโบ้ (175%)', val: 1.75 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, fontSizeScale: preset.val }))}
                    className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-medium transition-colors border ${
                      Math.abs(settings.fontSizeScale - preset.val) < 0.03
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>ความทึบของพื้นหลังตราประทับ (Opacity)</span>
                <span className="font-mono-numbers">{Math.round(settings.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.05"
                value={settings.opacity}
                onChange={(e) => setSettings((s) => ({ ...s, opacity: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
          >
            เสร็จสิ้น & บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
};
