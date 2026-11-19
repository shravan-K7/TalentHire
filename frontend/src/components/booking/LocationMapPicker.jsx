import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
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

// Internal helper for click events to update marker position
function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onLocationChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Internal helper to invalidate size on modal mount and programmatically pan when needed
function MapViewController({ lat, lng, viewVersion }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, viewVersion, map]);

  return null;
}

// Draggable Marker component with dragend listener
function DraggablePin({ position, onDragEnd }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const pos = marker.getLatLng();
          onDragEnd(pos.lat, pos.lng);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customPinIcon}
    />
  );
}

export default function LocationMapPicker({
  isOpen = false,
  initialLat = null,
  initialLng = null,
  areaName = '',
  venueName = '',
  onConfirm,
  onClose,
}) {
  const fallbackLat = initialLat || DEFAULT_MAP_CENTER.lat;
  const fallbackLng = initialLng || DEFAULT_MAP_CENTER.lng;

  const [currentLat, setCurrentLat] = useState(fallbackLat);
  const [currentLng, setCurrentLng] = useState(fallbackLng);
  const [viewVersion, setViewVersion] = useState(0);
  const [prevInitial, setPrevInitial] = useState({ lat: initialLat, lng: initialLng });

  // Update current coordinates when initial props change
  if (initialLat !== prevInitial.lat || initialLng !== prevInitial.lng) {
    setPrevInitial({ lat: initialLat, lng: initialLng });
    if (initialLat != null && initialLng != null) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      setViewVersion((v) => v + 1);
    }
  }

  function handleMapClick(lat, lng) {
    setCurrentLat(lat);
    setCurrentLng(lng);
  }

  function handleMarkerDrag(lat, lng) {
    setCurrentLat(lat);
    setCurrentLng(lng);
  }

  function handleConfirm() {
    if (onConfirm) {
      onConfirm({
        latitude: currentLat,
        longitude: currentLng,
      });
    }
  }

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="mapPickerTitle">
      <div className="location-modal-box">
        <div className="location-modal-header">
          <div>
            <h3 id="mapPickerTitle" className="location-modal-title">Pick Event Location</h3>
            <p className="location-modal-subtitle">
              Click anywhere on the map or drag the pin to set the exact venue location.
            </p>
          </div>
          <button
            type="button"
            className="location-modal-close-btn"
            onClick={onClose}
            aria-label="Close map picker"
          >
            Close
          </button>
        </div>

        <div className="location-modal-toolbar">
          <div className="location-modal-coords">
            <span>Coordinates:</span>
            <strong>
              {typeof currentLat === 'number' ? currentLat.toFixed(6) : ''},{' '}
              {typeof currentLng === 'number' ? currentLng.toFixed(6) : ''}
            </strong>
            {(venueName || areaName) && (
              <span className="location-modal-target-name">
                ({[venueName, areaName].filter(Boolean).join(', ')})
              </span>
            )}
          </div>
        </div>

        <div className="location-modal-map-view">
          <MapContainer
            center={[currentLat, currentLng]}
            zoom={15}
            scrollWheelZoom={true}
            zoomControl={true}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url={MAP_TILE_URL}
              attribution={MAP_ATTRIBUTION}
              maxZoom={MAP_MAX_ZOOM}
            />
            <DraggablePin
              position={[currentLat, currentLng]}
              onDragEnd={handleMarkerDrag}
            />
            <MapClickHandler onLocationChange={handleMapClick} />
            <MapViewController lat={currentLat} lng={currentLng} viewVersion={viewVersion} />
          </MapContainer>
        </div>

        <div className="location-modal-footer">
          <button
            type="button"
            className="location-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="location-btn-primary"
            onClick={handleConfirm}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
