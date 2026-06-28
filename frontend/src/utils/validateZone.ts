/**
 * OmniQ mobile app - delivery zone distance helper.
 * Author: OmniQ Team
 */
export function isInsideRadiusKm(
  point: { lat: number; lng: number },
  centre: { lat: number; lng: number },
  radiusKm: number
): boolean {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRadians(centre.lat - point.lat);
  const dLng = toRadians(centre.lng - point.lng);
  const lat1 = toRadians(point.lat);
  const lat2 = toRadians(centre.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const distance = 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return distance <= radiusKm;
}
