/**
 * Map Configuration for OpenStreetMap & Leaflet.
 *
 * Development Tile Endpoint:
 * https://tile.openstreetmap.org/{z}/{x}/{y}.png
 *
 * Attribution:
 * OpenStreetMap contributors
 *
 * The public OpenStreetMap tile service has a usage policy and is not an
 * unlimited production map-hosting service. Keep the tile provider replaceable.
 * To change providers (e.g. self-hosted OSM, Stadia Maps, MapTiler, CartoDB),
 * set VITE_MAP_TILE_URL and VITE_MAP_ATTRIBUTION in frontend/.env.
 */

export const MAP_TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const MAP_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const MAP_MAX_ZOOM = 19;

// Default center fallback (Kasaragod, Kerala, matching project reference)
export const DEFAULT_MAP_CENTER = {
  lat: 12.5102,
  lng: 74.9852,
};
