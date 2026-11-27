const KAABA = { lat: 21.4225, lng: 39.8262 };
const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Great-circle bearing clockwise from True North (0..360) to Kaaba */
export function computeQiblaBearing(lat: number, lng: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const deltaLng = toRad(KAABA.lng - lng);

  const y = Math.sin(deltaLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
  return normalizeAngle(toDeg(Math.atan2(y, x)));
}

/** Haversine distance in kilometers to Kaaba */
export function computeKaabaDistanceKm(lat: number, lng: number): number {
  const dLat = toRad(KAABA.lat - lat);
  const dLng = toRad(KAABA.lng - lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Shortest signed angle delta (-180..180): positive = turn right, negative = turn left */
export function shortestAngleDelta(heading: number, targetBearing: number): number {
  const diff = normalizeAngle(targetBearing - heading);
  return diff > 180 ? diff - 360 : diff;
}

/** Extract compass heading from DeviceOrientationEvent (iOS webkitCompassHeading or Android absolute alpha) */
export function extractCompassHeading(
  event: DeviceOrientationEvent & { webkitCompassHeading?: number },
  screenAngle = 0
): number | null {
  if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0) {
    return normalizeAngle(event.webkitCompassHeading + screenAngle);
  }
  if (event.absolute === true && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
    return normalizeAngle(360 - event.alpha + screenAngle);
  }
  return null;
}
