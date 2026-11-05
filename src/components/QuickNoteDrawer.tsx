import React, { useState } from 'react';
import { StampData } from '../types/camera';
import { reverseGeocode } from '../utils/geo';
import { X, Check, Zap, MapPin, Plus, RotateCcw, RotateCw, Sparkles } from 'lucide-react';

interface QuickNoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stampData: StampData;
  setStampData: React.Dispatch<React.SetStateAction<StampData>>;
  onRefreshGps: () => void;
}

const ELECTRICAL_SURVEY_TYPES = [
  'แก้ไขไฟฟ้าขัดข้อง',
  'สำรวจแนวเสาและสายไฟ',
  'ตรวจสอบหม้อแปลงไฟฟ้า',
  'งานขยายเขตไฟฟ้า',
  'ติดตั้ง/ตรวจมิเตอร์ไฟฟ้า',
  'ตรวจจุดเสี่ยงกิ่งไม้ใกล้สาย',
];

const VOLTAGE_LEVELS = [
  'แรงสูง 22 kV',
  'แรงสูง 33 kV',
  'แรงสูง 115 kV',
  'แรงต่ำ 220V/380V',
  'สายสื่อสารบนเสา',
];

export const QuickNoteDrawer: React.FC<QuickNoteDrawerProps> = ({
  isOpen,
  onClose,
  stampData,
  setStampData,
  onRefreshGps,
}) => {
  const [poleIdInput, setPoleIdInput] = useState(stampData.poleId || 'PEA-01');
  const [surveyTypeInput, setSurveyTypeInput] = useState(stampData.surveyType || 'แก้ไขไฟฟ้าขัดข้อง');
  const [voltageInput, setVoltageInput] = useState(stampData.voltageLevel || 'แรงสูง 22 kV');
  const [addressInput, setAddressInput] = useState(stampData.address);
  const [manualLat, setManualLat] = useState(stampData.latitude?.toString() || '');
  const [manualLon, setManualLon] = useState(stampData.longitude?.toString() || '');
  const [showManualGps, setShowManualGps] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressFetchSuccess, setAddressFetchSuccess] = useState(false);

  if (!isOpen) return null;

  // Auto-increment pole number (e.g. PEA-01 -> PEA-02, ต้นที่ 14 -> ต้นที่ 15)
  const handleIncrementPole = () => {
    const numMatch = poleIdInput.match(/(\d+)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const nextNum = num + 1;
      const paddedNext = String(nextNum).padStart(numMatch[1].length, '0');
      setPoleIdInput(poleIdInput.slice(0, numMatch.index) + paddedNext);
    } else {
      setPoleIdInput((prev) => (prev ? `${prev}-1` : 'เสาต้นที่ 1'));
    }
  };

  // Pull human-readable address directly from coordinates
  const handleFetchAddress = async (overrideLat?: number, overrideLon?: number) => {
    const lat = overrideLat ?? (parseFloat(manualLat) || stampData.latitude);
    const lon = overrideLon ?? (parseFloat(manualLon) || stampData.longitude);

    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      return;
    }

    setIsLoadingAddress(true);
    setAddressFetchSuccess(false);
    try {
      const addr = await reverseGeocode(lat, lon);
      if (addr) {
        setAddressInput(addr);
        setAddressFetchSuccess(true);
        setTimeout(() => setAddressFetchSuccess(false), 2500);
      }
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleSave = () => {
    let lat = stampData.latitude;
    let lon = stampData.longitude;
    if (showManualGps && manualLat && manualLon) {
      const pLat = parseFloat(manualLat);
      const pLon = parseFloat(manualLon);
      if (!isNaN(pLat) && !isNaN(pLon)) {
        lat = pLat;
        lon = pLon;
      }
    }

    setStampData((prev) => ({
      ...prev,
      poleId: poleIdInput.trim(),
      surveyType: surveyTypeInput.trim(),
      voltageLevel: voltageInput.trim(),
      address: addressInput.trim(),
      latitude: lat,
      longitude: lon,
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-100">
        {/* Grab Handle for mobile touch */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto my-3 sm:hidden" />

        {/* Header (Electrical Engineering Style) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                ข้อมูลงานสำรวจระบบไฟฟ้า
              </h2>
              <p className="text-[10px] text-slate-400">
                รหัสเสาไฟฟ้า หม้อแปลง และประเภทงานสำรวจ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. Pole / Asset ID with +1 Auto-Increment Button */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>รหัสเสาไฟฟ้า / หม้อแปลง (Asset ID)</span>
              </label>
              <button
                type="button"
                onClick={handleIncrementPole}
                className="min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold flex items-center gap-1 transition-all active:scale-95"
                title="กดเพื่อบวกหมายเลขเสาต้นถัดไป (+1)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เสาถัดไป (+1)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={poleIdInput}
                onChange={(e) => setPoleIdInput(e.target.value)}
                placeholder="เช่น PEA-01, ต้นที่ 14, TR-160kVA"
                className="flex-1 min-h-[44px] px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold font-mono-numbers text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setPoleIdInput('')}
                className="min-h-[44px] px-3 text-xs bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 border border-slate-700"
                title="ล้างค่า"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Pole Prefix Chips */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {['PEA-01', 'MEA-01', 'เสาต้นที่ 1', 'หม้อแปลง TR-01', 'ดึงสมอ/ยึดโยง'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setPoleIdInput(chip)}
                  className="min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Survey Category */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>ประเภทงานสำรวจไฟฟ้า</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {ELECTRICAL_SURVEY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSurveyTypeInput(type)}
                  className={`min-h-[40px] px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                    surveyTypeInput === type
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                      : 'bg-slate-800/60 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ⚡ {type}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Voltage Level */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>ระดับแรงดันไฟฟ้า (Voltage)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {VOLTAGE_LEVELS.map((volt) => (
                <button
                  key={volt}
                  type="button"
                  onClick={() => setVoltageInput(volt)}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    voltageInput === volt
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400 font-bold'
                      : 'bg-slate-800/60 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {volt}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Address & District */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>สถานที่ / แนวสายไฟฟ้า (ตำบล อำเภอ จังหวัด)</span>
              </label>
              <button
                type="button"
                onClick={() => handleFetchAddress()}
                disabled={isLoadingAddress}
                className="min-h-[30px] px-2.5 py-1 text-xs rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                title="ดึงชื่อตำบล อำเภอ จังหวัด จากพิกัด GPS อัตโนมัติ"
              >
                <RotateCw className={`w-3 h-3 ${isLoadingAddress ? 'animate-spin' : ''}`} />
                <span>{isLoadingAddress ? 'กำลังค้นหา...' : addressFetchSuccess ? '✓ ดึงสถานที่แล้ว' : 'ดึงจากพิกัด (Auto)'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="ตำบล สันทราย อำเภอ ฝาง เชียงใหม่ 50110"
              className="w-full min-h-[48px] p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>💡 ระบบสามารถระบุตำบล อำเภอ จังหวัด และรหัสไปรษณีย์จากพิกัด GPS อัตโนมัติ</span>
            </p>
          </div>

          {/* 5. GPS Coordinates */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>พิกัด GPS เสาไฟฟ้า</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onRefreshGps();
                  setTimeout(() => {
                    if (stampData.latitude && stampData.longitude) {
                      setManualLat(stampData.latitude.toString());
                      setManualLon(stampData.longitude.toString());
                      handleFetchAddress(stampData.latitude, stampData.longitude);
                    }
                  }, 800);
                }}
                className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-medium transition-colors flex items-center gap-1"
              >
                <span>📡 ดึงพิกัด GPS สด</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Latitude (ละติจูด)</span>
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => {
                    setManualLat(e.target.value);
                    setShowManualGps(true);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono-numbers"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Longitude (ลองจิจูด)</span>
                <input
                  type="number"
                  step="any"
                  value={manualLon}
                  onChange={(e) => {
                    setManualLon(e.target.value);
                    setShowManualGps(true);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono-numbers"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg transition-colors"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            บันทึกข้อมูลเสาไฟ
          </button>
        </div>
      </div>
    </div>
  );
};
