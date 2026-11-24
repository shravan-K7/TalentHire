import { useState } from 'react';
import LocationSearch from './LocationSearch';
import GoogleMapsLink from './GoogleMapsLink';
import LocationPreview from './LocationPreview';
import LocationMapPicker from './LocationMapPicker';
import { reverseGeocodeLocation } from '../../services/locationService';

export default function EventLocation({
  formData,
  setFormData,
  fieldError = { field: '', message: '' },
  onFocusField,
  travelAvailability = 'Across my state',
}) {
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  // When a user selects a Photon suggestion from the dropdown
  function handleSelectSuggestion(suggestion) {
    const title = suggestion.title || suggestion.name || '';
    const subtitle = suggestion.subtitle || '';
    const placeId = suggestion.place_id || '';
    const lat = suggestion.latitude != null ? Number(suggestion.latitude) : null;
    const lon = suggestion.longitude != null ? Number(suggestion.longitude) : null;

    setFormData((prev) => ({
      ...prev,
      event_area: title,
      event_area_place_id: placeId,
      location_source: 'autocomplete',
      event_address: suggestion.formatted_address || [title, subtitle].filter(Boolean).join(', ') || prev.event_address,
      city: suggestion.city || suggestion.district || prev.city,
      state: suggestion.state || prev.state,
      country: suggestion.country || 'India',
      ...(lat != null && lon != null
        ? {
            latitude: lat,
            longitude: lon,
            area_latitude: lat,
            area_longitude: lon,
          }
        : {}),
      event_location: [prev.venue_name, title].filter(Boolean).join(', ') || title,
    }));
  }

  // When a user verifies a Google Maps link
  function handleGoogleMapsResolved({ latitude, longitude, finalUrl }) {
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
      google_maps_url: finalUrl,
      location_source: 'maps_link',
    }));
  }

  // When a user picks/drags a location in the modal map
  async function handleConfirmMapPicker({ latitude, longitude }) {
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
      location_source: 'map_pin',
    }));
    setMapPickerOpen(false);

    // Optional reverse geocoding via Photon to assist with address if empty (never overwrites venue name)
    try {
      const rev = await reverseGeocodeLocation(latitude, longitude);
      if (rev && rev.success) {
        setFormData((prev) => ({
          ...prev,
          event_address: prev.event_address || rev.formatted_address || '',
          city: prev.city || rev.city || rev.district || '',
          state: prev.state || rev.state || '',
        }));
      }
    } catch {
      // Non-blocking
    }
  }

  return (
    <div className="booking-card" id="eventLocationCard">
      <div className="booking-card-header">
        <span className="booking-card-step-badge">2</span>
        <div>
          <h2 className="booking-card-title">Event location</h2>
          <p className="booking-card-desc">Where will the event take place?</p>
        </div>
      </div>

      {travelAvailability && (
        <div className="booking-travel-note-banner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <span>
            Performer&apos;s travel availability: <strong>{travelAvailability}</strong>
          </span>
        </div>
      )}

      <div className="booking-grid-two-col">
        {/* Location / Area Autocomplete */}
        <div id="eventAreaField">
          <LocationSearch
            id="eventAreaInput"
            value={formData.event_area}
            onChange={(val) => {
              setFormData((prev) => ({
                ...prev,
                event_area: val,
                // Fallback location string for backward compatibility
                event_location: [formData.venue_name, val].filter(Boolean).join(', ') || val,
              }));
            }}
            onSelectLocation={handleSelectSuggestion}
            error={fieldError.field === 'eventAreaField' ? fieldError.message : ''}
            onFocus={() => onFocusField && onFocusField('eventAreaField')}
          />
        </div>

        {/* Venue name / Place */}
        <div className="booking-field" id="venueNameField">
          <label htmlFor="venueNameInput" className="booking-field-label">
            Venue name / Place <span className="booking-req">*</span>
          </label>
          <input
            id="venueNameInput"
            name="venue_name"
            type="text"
            className={`booking-control ${fieldError.field === 'venueNameField' ? 'booking-control-highlight' : ''}`}
            placeholder="e.g. Grand Convention Centre"
            value={formData.venue_name || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({
                ...prev,
                venue_name: val,
                event_location: [val, prev.event_area].filter(Boolean).join(', ') || val,
              }));
            }}
            onFocus={() => onFocusField && onFocusField('venueNameField')}
            required
            autoComplete="off"
          />
          {fieldError.field === 'venueNameField' && (
            <div className="booking-field-pointer" role="alert">
              <span>{fieldError.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Google Maps link input */}
      <div className="booking-field" id="googleMapsLinkField">
        <GoogleMapsLink
          id="googleMapsLinkInput"
          value={formData.google_maps_url || ''}
          onChange={(val) => {
            setFormData((prev) => ({
              ...prev,
              google_maps_url: val,
            }));
          }}
          onResolvedCoordinates={handleGoogleMapsResolved}
        />
      </div>

      {/* Location Preview with Leaflet Map */}
      <div className="booking-field">
        <LocationPreview
          latitude={formData.latitude}
          longitude={formData.longitude}
          areaName={formData.event_area}
          venueName={formData.venue_name}
          onOpenPicker={() => setMapPickerOpen(true)}
        />
      </div>

      {/* Additional directions / instructions */}
      <div className="booking-field">
        <label htmlFor="locationInstructionsInput" className="booking-field-label">
          Additional directions / instructions <span className="booking-optional">Optional</span>
        </label>
        <textarea
          id="locationInstructionsInput"
          name="location_instructions"
          rows={3}
          className="booking-control booking-textarea"
          placeholder="e.g. Near the main road, entrance beside the church, parking available, etc."
          value={formData.location_instructions || ''}
          onChange={(e) => {
            const val = e.target.value;
            setFormData((prev) => ({
              ...prev,
              location_instructions: val,
            }));
          }}
        />
      </div>

      {/* Location Map Picker Modal */}
      <LocationMapPicker
        isOpen={mapPickerOpen}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
        areaName={formData.event_area}
        venueName={formData.venue_name}
        onConfirm={handleConfirmMapPicker}
        onClose={() => setMapPickerOpen(false)}
      />
    </div>
  );
}
