import { StampData, StampSettings } from '../types/camera';
import { formatCoordinates, formatHeading } from './geo';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const THAI_DAYS = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
];

const THAI_DAYS_SHORT = [
  'อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'
];

/**
 * Format timestamp into display date & time
 */
export function formatStampDateTime(date: Date, style: 'thai' | 'western') {
  const d = date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const timeHM = `${hours}:${minutes}`;
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const day = d.getDate();
  const dayPadded = String(day).padStart(2, '0');
  const dayIndex = d.getDay();
  const dayName = THAI_DAYS[dayIndex];
  const dayShort = THAI_DAYS_SHORT[dayIndex];

  if (style === 'thai') {
    const month = THAI_MONTHS_SHORT[d.getMonth()];
    const yearBE = d.getFullYear() + 543;
    const dateFormatted = `${dayPadded} ${month} ${yearBE}`;
    const dateStr = `${dayPadded} ${month} ${yearBE} (วัน${dayName})`;
    const shortDateStr = `${dayPadded} ${month} ${yearBE}`;
    return { timeStr, timeHM, dateStr, shortDateStr, dateFormatted, dayShort };
  } else {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateFormatted = `${dayPadded}/${month}/${year}`;
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { timeStr, timeHM, dateStr: dateFormatted, shortDateStr: dateFormatted, dateFormatted, dayShort: shortDayNames[dayIndex] };
  }
}

/**
 * Draw a clean rounded rectangle path
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Core Stamp Drawing Function
 * Renders the chosen TimeMark stamp directly onto any 2D canvas context.
 */
export function drawTimestampOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: StampData,
  settings: StampSettings
) {
  ctx.save();

  // Baseline scale relative to standard 1080p canvas short dimension (minDim)
  // Ensures consistent relative size whether portrait (1080x1920) or landscape (1920x1080)
  // and properly scales up for 4K / 12MP (3000x4000) smartphone photos without artificial small caps
  const minDim = Math.min(width, height);
  const baseScale = Math.max(0.45, minDim / 1080) * (settings.fontSizeScale || 1.0);
  const dt = formatStampDateTime(data.timestamp, settings.dateStyle);
  const coordStr = formatCoordinates(data.latitude, data.longitude, settings.coordFormat);
  const accent = settings.accentColor || '#FFB800';

  // Extract telemetry info
  const accuracyStr = data.accuracy ? `±${Math.round(data.accuracy)}m` : '';
  const elevationStr = data.altitude !== null ? `${Math.round(data.altitude)} m MSL` : '';
  const headingStr = formatHeading(data.heading);

  // Switch based on template
  switch (settings.template) {
    case 'survey':
      drawSurveyTemplate(ctx, width, height, baseScale, data, settings, dt.timeStr, dt.dateStr, coordStr, accent, elevationStr, headingStr, accuracyStr);
      break;
    case 'security':
      drawSecurityTemplate(ctx, width, height, baseScale, data, settings, dt.timeStr, dt.dateStr, coordStr, accent, accuracyStr);
      break;
    case 'minimal':
      drawMinimalTemplate(ctx, width, height, baseScale, data, settings, dt.timeStr, dt.dateStr, coordStr, accent);
      break;
    case 'hud':
      drawHudTemplate(ctx, width, height, baseScale, data, settings, dt.timeStr, dt.dateStr, coordStr, accent, elevationStr, headingStr);
      break;
    case 'classic':
    default:
      drawThaiTimeMarkTemplate(ctx, width, height, baseScale, data, settings, dt, accent);
      break;
  }

  ctx.restore();
}

/**
 * Template: Thai Official TimeMark Layout (Identical to user's sample image)
 * Features:
 * - 18:12 (Condensed Bold White Time)
 * - Yellow vertical line |
 * - 04 พ.ย. 2569 (Thai Date)
 * - พ. (Thai Day of week)
 * - ตำบล ... อำเภอ ... เชียงใหม่ 50110 (Clean address lines)
 * - Translucent box: "ละติจูดและลองจิจูด: 19.891025, \n 99.223338"
 */
function drawThaiTimeMarkTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  data: StampData,
  settings: StampSettings,
  dt: { timeHM: string; dateFormatted: string; dayShort: string },
  accent: string
) {
  const margin = Math.round(44 * scale);
  const timeSize = Math.round(116 * scale);
  const dateSize = Math.round(36 * scale);
  const addrSize = Math.round(34 * scale);
  const coordSize = Math.round(30 * scale);

  // Parse Address into two clean lines if needed (road/subdistrict/district on line 1, postcode on line 2)
  let addrLine1 = data.address || 'ตำบล สันทราย อำเภอ ฝาง เชียงใหม่';
  let addrLine2 = '';

  // Extract 5-digit postcode if present
  const postcodeMatch = addrLine1.match(/\b\d{5}\b/);
  if (postcodeMatch) {
    addrLine2 = postcodeMatch[0];
    addrLine1 = addrLine1.replace(postcodeMatch[0], '').trim().replace(/,\s*$/, '');
  } else if (addrLine1.includes('\n')) {
    const parts = addrLine1.split('\n');
    addrLine1 = parts[0].trim();
    addrLine2 = parts.slice(1).join(' ').trim();
  }

  // Format coordinates to 6 decimal places as in the reference image
  const latStr = data.latitude !== null ? data.latitude.toFixed(6) : '19.891025';
  const lonStr = data.longitude !== null ? data.longitude.toFixed(6) : '99.223338';
  const coordLine1 = `ละติจูดและลองจิจูด: ${latStr},`;
  const coordLine2 = `${lonStr}`;

  // Electrical survey info line
  const hasElectricalTag = Boolean(
    settings.showElectricalTag && (data.poleId || data.surveyType || data.voltageLevel)
  );
  const electricalLine = hasElectricalTag
    ? `⚡ ${[data.surveyType || 'งานสำรวจระบบไฟฟ้า', data.poleId ? `เสา ${data.poleId}` : '', data.voltageLevel].filter(Boolean).join(' · ')}`
    : '';

  // Measure coordinate box dimensions
  ctx.font = `600 ${coordSize}px 'Prompt', 'JetBrains Mono', sans-serif`;
  let maxTextW = Math.max(ctx.measureText(coordLine1).width, ctx.measureText(coordLine2).width);
  if (hasElectricalTag) {
    ctx.font = `700 ${Math.round(coordSize * 0.94)}px 'Prompt', sans-serif`;
    maxTextW = Math.max(maxTextW, ctx.measureText(electricalLine).width);
  }

  const boxPadX = Math.round(24 * scale);
  const boxPadY = Math.round(20 * scale);
  const boxWidth = Math.min(width - margin * 2, maxTextW + boxPadX * 2 + Math.round(16 * scale));
  const linesCount = hasElectricalTag ? 3.4 : 2.35;
  const boxHeight = Math.round(coordSize * linesCount + boxPadY * 2);

  // Calculate layout heights
  const timeHeight = timeSize * 0.85;
  const addrLineHeight = addrSize * 1.38;
  const totalAddressHeight = addrLine2 ? addrLineHeight * 2 : addrLineHeight;
  const gap1 = Math.round(26 * scale); // gap between time and address
  const gap2 = Math.round(24 * scale); // gap between address and coord box
  const totalHeight = timeHeight + gap1 + totalAddressHeight + gap2 + boxHeight;

  // Position calculation
  let startX = margin;
  let startY = Math.max(20 * scale, height - totalHeight - margin);

  if (settings.position === 'bottom-right') {
    startX = width - boxWidth - margin;
    startY = Math.max(20 * scale, height - totalHeight - margin);
  } else if (settings.position === 'top-left') {
    startX = margin;
    startY = margin;
  } else if (settings.position === 'top-right') {
    startX = width - boxWidth - margin;
    startY = margin;
  } else if (settings.position === 'bottom-full') {
    startX = margin;
    startY = Math.max(20 * scale, height - totalHeight - margin);
  }

  // --- 1. Top Section: Big Time + Yellow Bar + Date/Day ---
  // Baseline for Time
  const timeBaseline = startY + timeSize * 0.82;

  ctx.font = `700 ${timeSize}px 'Oswald', 'Plus Jakarta Sans', 'Prompt', sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = Math.round(8 * scale);
  ctx.shadowOffsetX = Math.round(1 * scale);
  ctx.shadowOffsetY = Math.round(2 * scale);
  ctx.fillText(dt.timeHM, startX, timeBaseline);

  const timeWidth = ctx.measureText(dt.timeHM).width;

  // Yellow Vertical Divider Bar: "|"
  const barX = startX + timeWidth + Math.round(18 * scale);
  const barHeight = Math.round(timeSize * 0.72);
  const barY = timeBaseline - barHeight + Math.round(4 * scale);
  const barWidth = Math.max(4, Math.round(7 * scale));

  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = accent; // Yellow '#FFB800'
  roundRect(ctx, barX, barY, barWidth, barHeight, Math.round(3.5 * scale));
  ctx.fill();

  // Date & Day: "04 พ.ย. 2569" and "พ."
  const dateX = barX + barWidth + Math.round(16 * scale);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = Math.round(7 * scale);
  ctx.shadowOffsetX = 1 * scale;
  ctx.shadowOffsetY = 2 * scale;

  ctx.font = `600 ${dateSize}px 'Prompt', 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(dt.dateFormatted, dateX, barY + dateSize * 0.82);

  ctx.font = `700 ${dateSize}px 'Prompt', 'Plus Jakarta Sans', sans-serif`;
  ctx.fillText(dt.dayShort, dateX, barY + dateSize * 0.82 + dateSize * 1.32);

  // --- 2. Middle Section: Address Lines ---
  let curY = startY + timeHeight + gap1;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
  ctx.shadowBlur = Math.round(7 * scale);
  ctx.shadowOffsetX = 1 * scale;
  ctx.shadowOffsetY = 2 * scale;
  ctx.font = `600 ${addrSize}px 'Prompt', 'Plus Jakarta Sans', sans-serif`;
  ctx.fillStyle = '#FFFFFF';

  truncateDrawText(ctx, addrLine1, startX, curY + addrSize * 0.85, width - margin * 2);
  curY += addrLineHeight;

  if (addrLine2) {
    ctx.fillText(addrLine2, startX, curY + addrSize * 0.85);
    curY += addrLineHeight;
  }

  // --- 3. Bottom Section: Translucent Coordinates & Electrical Box ---
  const boxY = curY + gap2 - addrLineHeight * 0.35;

  // Draw translucent rounded glass box
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.9, settings.opacity * 0.65)})`;
  roundRect(ctx, startX, boxY, boxWidth, boxHeight, Math.round(16 * scale));
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = Math.max(1.5, Math.round(2 * scale));
  ctx.stroke();

  // Draw Coordinates text inside box
  const textX = startX + boxPadX;
  const textY1 = boxY + boxPadY + coordSize * 0.88;
  const textY2 = textY1 + Math.round(coordSize * 1.36);

  ctx.font = `600 ${coordSize}px 'Prompt', 'JetBrains Mono', sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = Math.round(4 * scale);
  ctx.fillText(coordLine1, textX, textY1);
  ctx.fillText(coordLine2, textX, textY2);

  if (hasElectricalTag) {
    const textY3 = textY2 + Math.round(coordSize * 1.36);
    ctx.font = `700 ${Math.round(coordSize * 0.94)}px 'Prompt', sans-serif`;
    ctx.fillStyle = '#FDE047'; // Electric yellow highlight
    truncateDrawText(ctx, electricalLine, textX, textY3, boxWidth - boxPadX * 2);
  }
}

/**
 * Template 2: Construction & Field Survey Sheet
 */
function drawSurveyTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  data: StampData,
  settings: StampSettings,
  timeStr: string,
  dateStr: string,
  coordStr: string,
  accent: string,
  elevationStr: string,
  headingStr: string,
  accuracyStr: string
) {
  const pad = Math.round(20 * scale);
  const boxWidth = Math.min(width * 0.94, Math.round(960 * scale));
  const boxHeight = Math.round(230 * scale);
  const boxX = (width - boxWidth) / 2;
  const boxY = height - boxHeight - Math.round(36 * scale);

  // Outer border & background
  ctx.fillStyle = `rgba(10, 15, 28, ${settings.opacity * 0.92})`;
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, Math.round(12 * scale));
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, Math.round(3 * scale));
  ctx.stroke();

  // Top header banner
  ctx.fillStyle = accent;
  ctx.fillRect(boxX, boxY, boxWidth, Math.round(38 * scale));

  ctx.font = `700 ${Math.round(20 * scale)}px 'Prompt', sans-serif`;
  ctx.fillStyle = '#0F172A';
  ctx.fillText('📋 บันทึกการตรวจงานภาคสนาม (FIELD INSPECTION RECORD)', boxX + Math.round(18 * scale), boxY + Math.round(26 * scale));

  // Two-column grid inside
  const col1X = boxX + pad;
  const col2X = boxX + boxWidth * 0.52;
  const row1Y = boxY + Math.round(70 * scale);
  const row2Y = boxY + Math.round(108 * scale);
  const row3Y = boxY + Math.round(146 * scale);
  const row4Y = boxY + Math.round(184 * scale);

  const labelFont = `600 ${Math.round(18 * scale)}px 'Prompt', sans-serif`;
  const valFont = `700 ${Math.round(19 * scale)}px 'Prompt', 'JetBrains Mono', sans-serif`;

  // Col 1: Date/Time & Coordinates
  ctx.font = labelFont;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('วัน-เวลา:', col1X, row1Y);
  ctx.font = valFont;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${dateStr}  ${timeStr}`, col1X + Math.round(85 * scale), row1Y);

  ctx.font = labelFont;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('พิกัด GPS:', col1X, row2Y);
  ctx.font = valFont;
  ctx.fillStyle = accent;
  ctx.fillText(coordStr, col1X + Math.round(85 * scale), row2Y);

  ctx.font = labelFont;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('ความแม่นยำ:', col1X, row3Y);
  ctx.font = valFont;
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(`${accuracyStr || 'N/A'} | ระดับความสูง: ${elevationStr || 'N/A'}`, col1X + Math.round(105 * scale), row3Y);

  // Col 2: Project & Inspector
  ctx.font = labelFont;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('โครงการ:', col2X, row1Y);
  ctx.font = valFont;
  ctx.fillStyle = '#FDE047';
  truncateDrawText(ctx, data.project || 'งานสำรวจระบบไฟฟ้า', col2X + Math.round(75 * scale), row1Y, boxWidth * 0.42);

  ctx.font = labelFont;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('ผู้ตรวจ:', col2X, row2Y);
  ctx.font = valFont;
  ctx.fillStyle = '#FFFFFF';
  truncateDrawText(ctx, data.inspector || 'เจ้าหน้าที่ประจำไซต์', col2X + Math.round(75 * scale), row2Y, boxWidth * 0.42);

  if (headingStr) {
    ctx.font = labelFont;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('ทิศทาง:', col2X, row3Y);
    ctx.font = valFont;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(headingStr, col2X + Math.round(75 * scale), row3Y);
  }

  // Bottom row: Address
  if (data.address) {
    ctx.font = labelFont;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('สถานที่:', col1X, row4Y);
    ctx.font = `600 ${Math.round(18 * scale)}px 'Prompt', sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    truncateDrawText(ctx, data.address, col1X + Math.round(85 * scale), row4Y, boxWidth - Math.round(110 * scale));
  }
}

/**
 * Template 3: Security & Official Evidence Stamp
 */
function drawSecurityTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  data: StampData,
  settings: StampSettings,
  timeStr: string,
  dateStr: string,
  coordStr: string,
  accent: string,
  accuracyStr: string
) {
  const pad = Math.round(20 * scale);
  const boxWidth = Math.min(width * 0.92, Math.round(820 * scale));
  const boxHeight = Math.round(170 * scale);
  const boxX = Math.round(36 * scale);
  const boxY = height - boxHeight - Math.round(36 * scale);

  // Background
  ctx.fillStyle = `rgba(15, 23, 42, ${settings.opacity * 0.9})`;
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, Math.round(14 * scale));
  ctx.fill();

  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = Math.max(2, Math.round(2.5 * scale));
  ctx.stroke();

  // Watermark seal badge
  ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
  roundRect(ctx, boxX + pad, boxY + pad, Math.round(170 * scale), Math.round(32 * scale), Math.round(6 * scale));
  ctx.fill();

  ctx.font = `700 ${Math.round(15 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#22C55E';
  ctx.fillText('VERIFIED PROOF', boxX + pad + Math.round(14 * scale), boxY + pad + Math.round(22 * scale));

  // Time & Date
  ctx.font = `700 ${Math.round(32 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${timeStr}  ${dateStr}`, boxX + pad, boxY + pad + Math.round(72 * scale));

  // GPS Coordinates
  ctx.font = `600 ${Math.round(22 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = accent;
  ctx.fillText(`${coordStr}  ${accuracyStr}`, boxX + pad, boxY + pad + Math.round(102 * scale));

  // Address
  if (data.address) {
    ctx.font = `600 ${Math.round(19 * scale)}px 'Prompt', sans-serif`;
    ctx.fillStyle = '#CBD5E1';
    truncateDrawText(ctx, data.address, boxX + pad, boxY + pad + Math.round(130 * scale), boxWidth - pad * 2);
  }
}

/**
 * Template 4: Minimalist Clean Watermark
 */
function drawMinimalTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  data: StampData,
  settings: StampSettings,
  timeStr: string,
  dateStr: string,
  coordStr: string,
  accent: string
) {
  const margin = Math.round(36 * scale);
  const x = margin;
  const y = height - margin;

  ctx.font = `700 ${Math.round(32 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = Math.round(8 * scale);
  ctx.fillText(`${timeStr} · ${dateStr}`, x, y - Math.round(42 * scale));

  ctx.font = `700 ${Math.round(24 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = accent;
  ctx.fillText(coordStr, x, y - Math.round(10 * scale));

  if (data.address) {
    ctx.font = `600 ${Math.round(20 * scale)}px 'Prompt', sans-serif`;
    ctx.fillStyle = '#E2E8F0';
    truncateDrawText(ctx, data.address, x, y + Math.round(24 * scale), width * 0.88);
  }
}

/**
 * Template 5: Cyber HUD / Tactical View
 */
function drawHudTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  data: StampData,
  settings: StampSettings,
  timeStr: string,
  dateStr: string,
  coordStr: string,
  accent: string,
  elevationStr: string,
  headingStr: string
) {
  const pad = Math.round(24 * scale);
  const boxWidth = Math.min(width * 0.94, Math.round(880 * scale));
  const boxHeight = Math.round(170 * scale);
  const boxX = Math.round(36 * scale);
  const boxY = height - boxHeight - Math.round(36 * scale);

  ctx.fillStyle = `rgba(6, 12, 24, ${settings.opacity * 0.88})`;
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  // HUD Corner Brackets
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, Math.round(3 * scale));
  const cornerLen = Math.round(22 * scale);

  // Top-left bracket
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + cornerLen);
  ctx.lineTo(boxX, boxY);
  ctx.lineTo(boxX + cornerLen, boxY);
  ctx.stroke();

  // Top-right bracket
  ctx.beginPath();
  ctx.moveTo(boxX + boxWidth - cornerLen, boxY);
  ctx.lineTo(boxX + boxWidth, boxY);
  ctx.lineTo(boxX + boxWidth, boxY + cornerLen);
  ctx.stroke();

  // Bottom-left bracket
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + boxHeight - cornerLen);
  ctx.lineTo(boxX, boxY + boxHeight);
  ctx.lineTo(boxX + cornerLen, boxY + boxHeight);
  ctx.stroke();

  // Bottom-right bracket
  ctx.beginPath();
  ctx.moveTo(boxX + boxWidth - cornerLen, boxY + boxHeight);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - cornerLen);
  ctx.stroke();

  // Data text
  ctx.font = `700 ${Math.round(34 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#38BDF8';
  ctx.fillText(timeStr, boxX + pad, boxY + Math.round(48 * scale));

  ctx.font = `700 ${Math.round(22 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(dateStr, boxX + pad + Math.round(220 * scale), boxY + Math.round(48 * scale));

  ctx.font = `600 ${Math.round(22 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = accent;
  ctx.fillText(`GEO: ${coordStr}`, boxX + pad, boxY + Math.round(88 * scale));

  ctx.font = `600 ${Math.round(18 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`ALT: ${elevationStr || '0m'} | HDG: ${headingStr || '0°'} | SYS: GPS-ACTIVE`, boxX + pad, boxY + Math.round(122 * scale));

  if (data.address) {
    ctx.font = `600 ${Math.round(18 * scale)}px 'Prompt', sans-serif`;
    ctx.fillStyle = '#CBD5E1';
    truncateDrawText(ctx, `LOC: ${data.address}`, boxX + pad, boxY + Math.round(150 * scale), boxWidth - pad * 2);
  }
}

/**
 * Truncate text with ellipsis if it exceeds maxWidth
 */
function truncateDrawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  ctx.fillText(truncated + '...', x, y);
}
