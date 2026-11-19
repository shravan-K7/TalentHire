import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_TILE_URL, MAP_ATTRIBUTION, MAP_MAX_ZOOM, DEFAULT_MAP_CENTER } from '../../config/mapConfig';

// Custom CSS-based map marker without external image files, icons, or emojis
function createCustomMarkerIcon() {
  return L.divIcon({
    className: 'custom-map-marker-container',
    html: '<div class="custom-map-pin"><span class="custom-map-pin-inner"></span></div>',
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -28],
  });
}

const customPinIcon = createCustomMarkerIcon();

// Internal helper to update map view when coordinates change from Photon or picker
function MapRecenter({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], zoom);
      map.invalidateSize();
    }
  }, [lat, lng, zoom, map]);

  return null;
}

export default function LocationPreview({
  latitude = null,
  longitude = null,
  areaName = '',
  venueName = '',
  onOpenPicker,
}) {
  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const displayLat = hasCoords ? latitude : DEFAULT_MAP_CENTER.lat;
  const displayLng = hasCoords ? longitude : DEFAULT_MAP_CENTER.lng;
  const zoomLevel = hasCoords ? 14 : 11;

  const displayLocationLabel =
    [venueName, areaName].filter(Boolean).join(' - ') ||
    (hasCoords ? 'Selected location' : 'Kasaragod');

  return (
    <div className="location-preview-box">
      <div className="location-preview-header">
        <span className="location-preview-title">Location preview</span>
        <button
          type="button"
          className="location-preview-pick-btn"
          onClick={onOpenPicker}
          aria-label="Pick location on map"
        >
          Pick on map
        </button>
      </div>

      <div className="location-preview-map-wrapper">
        <div className="location-preview-leaflet-container">
          <MapContainer
            center={[displayLat, displayLng]}
            zoom={zoomLevel}
            scrollWheelZoom={false}
            zoomControl={true}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url={MAP_TILE_URL}
              attribution={MAP_ATTRIBUTION}
              maxZoom={MAP_MAX_ZOOM}
            />
            <Marker
              position={[displayLat, displayLng]}
              icon={customPinIcon}
              interactive={false}
            />
            <MapRecenter lat={displayLat} lng={displayLng} zoom={zoomLevel} />
          </MapContainer>
        </div>

        {displayLocationLabel && (
          <div className="location-preview-badge">
            <span className="location-preview-pin-dot" />
            <span className="location-preview-badge-text">{displayLocationLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
