import { useState } from 'react';
import { resolveGoogleMapsLink } from '../../services/locationService';

export default function GoogleMapsLink({
  value = '',
  onChange,
  onResolvedCoordinates,
  disabled = false,
  id = 'googleMapsLinkInput',
}) {
  const [url, setUrl] = useState(value);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'error' | ''

  function handleInputChange(e) {
    const nextVal = e.target.value;
    setUrl(nextVal);
    setStatusMessage('');
    setStatusType('');
    if (onChange) {
      onChange(nextVal);
    }
  }

  async function handleVerifyLink() {
    const clean = url.trim();
    if (!clean) {
      setStatusType('error');
      setStatusMessage('Please enter a Google Maps URL first.');
      return;
    }

    setLoading(true);
    setStatusType('');
    setStatusMessage('Verifying link and extracting location coordinates...');

    const res = await resolveGoogleMapsLink(clean);
    setLoading(false);

    if (res.success && res.latitude && res.longitude) {
      setStatusType('success');
      setStatusMessage(`Verified: Location coordinates [${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}] extracted.`);
      if (onResolvedCoordinates) {
        onResolvedCoordinates({
          latitude: res.latitude,
          longitude: res.longitude,
          finalUrl: res.final_url || clean,
        });
      }
    } else {
      setStatusType('error');
      setStatusMessage(res.error || 'Could not verify link or extract coordinates. You can pick the location on the map.');
    }
  }

  return (
    <div className="google-maps-link-field">
      <div className="google-maps-label-row">
        <label htmlFor={id} className="booking-field-label">
          Google Maps link <span className="booking-optional">Optional</span>
        </label>
      </div>

      <div className="google-maps-input-row">
        <input
          id={id}
          type="url"
          className="booking-control google-maps-control"
          placeholder="Paste Google Maps link (e.g. https://maps.app.goo.gl/...)"
          value={url}
          onChange={handleInputChange}
          disabled={disabled || loading}
          autoComplete="off"
        />
        <button
          type="button"
          className="google-maps-verify-btn"
          onClick={handleVerifyLink}
          disabled={disabled || loading || !url.trim()}
        >
          {loading ? 'Verifying...' : 'Verify Link'}
        </button>
      </div>

      {statusMessage && (
        <div className={`google-maps-status-text is-${statusType}`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}
