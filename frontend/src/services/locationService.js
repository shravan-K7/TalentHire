/**
 * Location API Client for TalentHire.
 * Interfaces with Photon Geocoding API (OpenStreetMap-based, no API key required),
 * Photon Reverse Geocoding, and safe backend Google Maps link resolver.
 */

import { getCsrfToken } from '../js/auth';

/**
 * Autocompletes Indian locations (areas, villages, towns, cities, districts, streets)
 * using the Photon Geocoding API via the TalentHire backend.
 * Returns coordinates directly in each suggestion.
 * @param {string} query
 * @returns {Promise<{suggestions: Array, error?: string, provider_unavailable?: boolean}>}
 */
export async function autocompleteLocations(query) {
  const clean = (query || '').trim();
  if (clean.length < 2) {
    return { suggestions: [] };
  }

  try {
    const res = await fetch(`/api/locations/autocomplete/?query=${encodeURIComponent(clean)}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        suggestions: [],
        error: data.error || 'Failed to search locations.',
        provider_unavailable: Boolean(data.provider_unavailable),
      };
    }
    return data;
  } catch {
    return {
      suggestions: [],
      error: 'Unable to reach location service. You can enter your location manually.',
      provider_unavailable: true,
    };
  }
}

/**
 * Reverse geocodes coordinates (lat, lon) to a readable address via Photon.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{success: boolean, place_name?: string, formatted_address?: string, city?: string, state?: string, district?: string, error?: string}>}
 */
export async function reverseGeocodeLocation(lat, lon) {
  if (lat == null || lon == null) {
    return { success: false, error: 'Coordinates are required.' };
  }

  try {
    const res = await fetch(`/api/locations/reverse/?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    return data;
  } catch {
    return { success: false, error: 'Network error performing reverse geocode.' };
  }
}

/**
 * Retrieves coordinates and detailed address for backwards-compatibility.
 * @param {string} placeId
 * @param {object} [moreData]
 * @returns {Promise<object>}
 */
export async function fetchLocationDetails(placeId, moreData) {
  if (!placeId) {
    return { error: 'Place ID is required' };
  }

  try {
    let url = `/api/locations/details/?place_id=${encodeURIComponent(placeId)}`;
    if (moreData && typeof moreData === 'object') {
      url += `&more=${encodeURIComponent(JSON.stringify(moreData))}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { error: errData.error || 'Failed to retrieve place details.' };
    }
    return await res.json();
  } catch {
    return { error: 'Unable to retrieve location details.' };
  }
}

/**
 * Safely resolves a pasted Google Maps sharing link (e.g. maps.app.goo.gl)
 * to extract coordinates via SSRF-protected backend.
 * @param {string} mapUrl
 * @returns {Promise<{success: boolean, latitude?: number, longitude?: number, error?: string}>}
 */
export async function resolveGoogleMapsLink(mapUrl) {
  const clean = (mapUrl || '').trim();
  if (!clean) {
    return { success: false, error: 'Please enter a Google Maps link.' };
  }

  try {
    const token = await getCsrfToken();
    const res = await fetch('/api/locations/resolve-map-link/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': token,
      },
      body: JSON.stringify({ url: clean }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Could not extract location from link.',
      };
    }
    return data;
  } catch {
    return {
      success: false,
      error: 'Network error verifying Google Maps link.',
    };
  }
}
