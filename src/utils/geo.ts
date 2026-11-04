/**
 * Convert decimal degrees to Degrees, Minutes, Seconds (DMS) string
 * Example: 13.7563 -> 13°45'22.7" N
 */
export function formatDMS(deg: number, isLat: boolean): string {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

  let direction = '';
  if (isLat) {
    direction = deg >= 0 ? 'N' : 'S';
  } else {
    direction = deg >= 0 ? 'E' : 'W';
  }

  return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

/**
 * Format coordinates based on user preference
 */
export function formatCoordinates(lat: number | null, lon: number | null, format: 'dms' | 'decimal'): string {
  if (lat === null || lon === null) {
    return 'กำลังค้นหาพิกัด GPS...';
  }

  if (format === 'decimal') {
    const latPrefix = lat >= 0 ? 'N' : 'S';
    const lonPrefix = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}° ${latPrefix}, ${Math.abs(lon).toFixed(6)}° ${lonPrefix}`;
  }

  return `${formatDMS(lat, true)}  ${formatDMS(lon, false)}`;
}

/**
 * Convert heading degrees (0-360) to cardinal direction
 */
export function formatHeading(deg: number | null): string {
  if (deg === null || isNaN(deg)) return '';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
  return `${Math.round(deg)}° ${directions[index]}`;
}

// In-memory cache for reverse geocoding to avoid rate-limiting Nominatim
/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// In-memory cache for reverse geocoding to prevent excessive network requests
const geoCache = new Map<string, string>();

/**
 * Clean and standardize Thai address parts into official administrative format:
 * "ตำบล [ชื่อตำบล] อำเภอ [ชื่ออำเภอ] [ชื่อจังหวัด] [รหัสไปรษณีย์]"
 */
export function formatThaiAddressParts(params: {
  road?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postcode?: string;
}): string {
  const { road, subdistrict, district, province, postcode } = params;

  // Clean province name
  let prov = (province || '').replace(/^จังหวัด\s*/, '').trim();
  const isBangkok = /กรุงเทพ|Bangkok/i.test(prov);
  if (isBangkok) {
    prov = 'กรุงเทพมหานคร';
  }

  // Clean subdistrict (ตำบล / แขวง)
  let sub = (subdistrict || '').trim();
  if (sub) {
    sub = sub.replace(/^(ตำบล|แขวง)\s*/, '');
    sub = isBangkok ? `แขวง ${sub}` : `ตำบล ${sub}`;
  }

  // Clean district (อำเภอ / เขต)
  let dist = (district || '').trim();
  if (dist) {
    dist = dist.replace(/^(อำเภอ|เขต)\s*/, '');
    dist = isBangkok ? `เขต ${dist}` : `อำเภอ ${dist}`;
  }

  // Road if present
  let rd = (road || '').trim();
  if (rd && !rd.startsWith('ถนน') && !rd.startsWith('ซอย') && !rd.startsWith('ถ.')) {
    rd = `ถนน ${rd}`;
  }

  const parts: string[] = [];
  if (rd) parts.push(rd);
  if (sub) parts.push(sub);
  if (dist) parts.push(dist);
  if (prov) parts.push(prov);
  if (postcode && /^\d{5}$/.test(postcode.trim())) parts.push(postcode.trim());

  if (parts.length > 0) {
    return parts.join(' ');
  }
  return '';
}

/**
 * Fetch human-readable Thai address automatically from coordinates (Lat, Lon)
 * Uses high-speed client-friendly BigDataCloud API with OpenStreetMap Nominatim fallback.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (geoCache.has(key)) {
    return geoCache.get(key)!;
  }

  // 1. Primary Provider: BigDataCloud Reverse Geocoding (Client-side CORS enabled, high reliability)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`;
    const res = await fetch(bdcUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      let subdistrict = data.locality || '';
      let district = data.city || '';
      let province = data.principalSubdivision || '';
      const postcode = data.postcode || '';

      // Check localityInfo administrative order levels if available
      if (Array.isArray(data.localityInfo?.administrative)) {
        for (const item of data.localityInfo.administrative) {
          const order = item.order;
          if (order === 7 || /subdistrict|tambon/i.test(item.description || '')) {
            subdistrict = subdistrict || item.name;
          } else if (order === 6 || /district|amphoe/i.test(item.description || '')) {
            district = district || item.name;
          } else if (order === 4 || /province|changwat/i.test(item.description || '')) {
            province = province || item.name;
          }
        }
      }

      const formatted = formatThaiAddressParts({
        subdistrict,
        district,
        province,
        postcode,
      });

      if (formatted) {
        geoCache.set(key, formatted);
        return formatted;
      }
    }
  } catch (e) {
    // Failover to secondary provider silently
  }

  // 2. Secondary Provider: OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=th,en&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const subdistrict =
          addr.subdistrict || addr.suburb || addr.quarter || addr.neighbourhood || addr.village || '';
        const district = addr.district || addr.city_district || addr.county || addr.town || addr.city || '';
        const province = addr.province || addr.state || '';
        const postcode = addr.postcode || '';
        const road = addr.road || addr.street || '';

        const formatted = formatThaiAddressParts({
          road,
          subdistrict,
          district,
          province,
          postcode,
        });

        if (formatted) {
          geoCache.set(key, formatted);
          return formatted;
        }

        if (data.display_name) {
          const fallback = data.display_name.split(',').slice(0, 3).join(' ').trim();
          geoCache.set(key, fallback);
          return fallback;
        }
      }
    }
  } catch (err) {
    // Failover to coordinate representation
  }

  // 3. Fallback: formatted coordinate representation
  const fallbackStr = `ละติจูด ${lat.toFixed(5)} ลองจิจูด ${lon.toFixed(5)}`;
  return fallbackStr;
}
