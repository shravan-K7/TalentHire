"""
Location Service for TalentHire.
Handles:
1. Photon Geocoding API by Komoot (Free, OpenStreetMap-based, no API key required).
2. Photon Reverse Geocoding API (lon, lat to readable address components).
3. Safe SSRF-protected Google Maps URL resolution and coordinate extraction.
"""

import ipaddress
import logging
import re
import socket
import time
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Simple in-memory cache for autocomplete queries
_AUTOCOMPLETE_CACHE: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes

# Allowed Google Maps hosts for sharing link resolver
ALLOWED_GOOGLE_MAPS_HOSTS = {
    "maps.app.goo.gl",
    "goo.gl",
    "maps.google.com",
    "www.google.com",
    "google.com",
    "maps.google.co.in",
    "www.google.co.in",
    "google.co.in",
    "share.google",
}

# India bounding box (minLon, minLat, maxLon, maxLat) for geographic relevance
INDIA_BBOX = "68.1,6.7,97.4,35.5"
INDIA_CENTER_LAT = 20.5937
INDIA_CENTER_LON = 78.9629


def _is_safe_host_and_ip(hostname: str) -> bool:
    """
    Validates that the host belongs to an allowed Google domain and
    does NOT resolve to private, loopback, link-local, or reserved IPs.
    """
    if not hostname:
        return False

    hostname = hostname.lower().strip()

    is_allowed_domain = any(
        hostname == allowed or hostname.endswith("." + allowed)
        for allowed in ALLOWED_GOOGLE_MAPS_HOSTS
    )
    if not is_allowed_domain:
        return False

    try:
        addr_info = socket.getaddrinfo(hostname, 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_reserved
                or ip_obj.is_unspecified
            ):
                logger.warning("SSRF blocked attempt to access non-public IP: %s (%s)", ip_str, hostname)
                return False
    except Exception as e:
        logger.warning("DNS resolution failed for %s: %s", hostname, e)
        return False

    return True


def get_location_service_status() -> Dict[str, Any]:
    """
    Diagnostic status dictionary reporting configuration state safely.
    """
    api_url = getattr(settings, "PHOTON_API_URL", "https://photon.komoot.io").rstrip("/")
    return {
        "status": "active",
        "provider": "Photon Geocoding API (OpenStreetMap)",
        "requires_api_key": False,
        "configured": True,
        "api_url": api_url,
    }


def _normalize_photon_feature(feature: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Converts a single Photon GeoJSON feature into a standardized suggestion dict.
    Converts GeoJSON [longitude, latitude] into [latitude, longitude] for Leaflet.
    """
    if not isinstance(feature, dict):
        return None

    props = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates") or []

    # GeoJSON coordinates order is [longitude, latitude]
    lat: Optional[float] = None
    lon: Optional[float] = None
    if isinstance(coords, (list, tuple)) and len(coords) >= 2:
        try:
            lon = float(coords[0])
            lat = float(coords[1])
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                lat, lon = None, None
        except (ValueError, TypeError):
            lat, lon = None, None

    name = props.get("name") or props.get("street") or props.get("city") or ""
    if not name and not props:
        return None

    locality = props.get("locality") or props.get("district") or ""
    district = props.get("district") or props.get("county") or ""
    city = props.get("city") or props.get("town") or props.get("municipality") or ""
    state = props.get("state") or ""
    country = props.get("country") or "India"
    country_code = (props.get("countrycode") or "IN").upper()
    postcode = props.get("postcode") or ""
    street = props.get("street") or ""
    housenumber = props.get("housenumber") or ""
    osm_key = props.get("osm_key") or ""
    osm_value = props.get("osm_value") or ""
    osm_id = props.get("osm_id") or ""
    osm_type = props.get("osm_type") or "N"

    # Build meaningful subtitle hierarchy
    hierarchy_parts = []
    for part in [locality, city, district, state, country]:
        if part and part != name and part not in hierarchy_parts:
            hierarchy_parts.append(part)
    subtitle = ", ".join(hierarchy_parts) if hierarchy_parts else country

    # Formatted full address
    addr_parts = []
    if housenumber and street:
        addr_parts.append(f"{housenumber} {street}")
    elif street:
        addr_parts.append(street)
    elif name:
        addr_parts.append(name)

    for part in [locality, city, district, state, postcode, country]:
        if part and part not in addr_parts:
            addr_parts.append(part)
    formatted_address = ", ".join(addr_parts)

    place_id = f"osm_{osm_type}_{osm_id}" if osm_id else f"coords_{lat}_{lon}"
    feature_type = osm_value or osm_key or props.get("type") or "area"

    return {
        "place_id": str(place_id),
        "title": name or city or locality or "Location",
        "name": name or city or locality or "Location",
        "subtitle": subtitle,
        "locality": locality,
        "district": district or city,
        "city": city or district,
        "state": state,
        "country": country,
        "countrycode": country_code,
        "postcode": postcode,
        "street": street,
        "formatted_address": formatted_address,
        "latitude": lat,
        "longitude": lon,
        "osm_key": osm_key,
        "osm_value": osm_value,
        "type": feature_type,
        "area_type": feature_type,
    }


def autocomplete_places(query: str, max_results: int = 8) -> Dict[str, Any]:
    """
    Calls Photon Geocoding API by Komoot for location search.
    Enforces minimum 2 chars, debounced client-side, cached server-side.
    Applies India bounding box and location bias for geographic relevance.
    """
    query = (query or "").strip()
    if len(query) < 2:
        return {"suggestions": [], "error": "Query must contain at least 2 characters."}

    # Cache lookup
    cache_key = query.lower()
    now = time.time()
    if cache_key in _AUTOCOMPLETE_CACHE:
        cached_time, cached_data = _AUTOCOMPLETE_CACHE[cache_key]
        if now - cached_time < _CACHE_TTL_SECONDS:
            return {"suggestions": cached_data}

    base_url = getattr(settings, "PHOTON_API_URL", "https://photon.komoot.io").rstrip("/")
    endpoint = f"{base_url}/api/"

    limit = max(1, min(max_results, 15))
    headers = {"User-Agent": "TalentHire/1.0"}

    # 1. Primary request: use India bounding box and center bias for high relevance
    params = {
        "q": query,
        "limit": limit,
        "lang": "en",
        "bbox": INDIA_BBOX,
        "lat": INDIA_CENTER_LAT,
        "lon": INDIA_CENTER_LON,
    }

    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=5.0)
    except requests.Timeout:
        logger.warning("Photon API timed out for query: %s", query)
        return {
            "suggestions": [],
            "error": "Location search timed out. You can enter your location manually.",
            "provider_unavailable": True,
        }
    except Exception as exc:
        logger.error("Photon API connection error: %s", exc)
        return {
            "suggestions": [],
            "error": "Unable to connect to location service. You can enter your location manually.",
            "provider_unavailable": True,
        }

    if response.status_code == 429:
        logger.warning("Photon rate limit reached (HTTP 429).")
        return {
            "suggestions": [],
            "error": "Location service is temporarily busy. You can enter your location manually.",
            "provider_unavailable": True,
        }

    if not response.ok:
        logger.warning("Photon error HTTP %s: %s", response.status_code, response.text[:200])
        return {
            "suggestions": [],
            "error": "Location suggestions currently unavailable. You can enter your location manually.",
            "provider_unavailable": True,
        }

    try:
        data = response.json()
    except Exception:
        return {"suggestions": []}

    features = data.get("features") or []

    # 2. Fallback: if bbox returned 0 results, retry without bbox constraint
    if not features:
        try:
            fallback_params = {
                "q": query,
                "limit": limit,
                "lang": "en",
                "lat": INDIA_CENTER_LAT,
                "lon": INDIA_CENTER_LON,
            }
            fb_resp = requests.get(endpoint, params=fallback_params, headers=headers, timeout=4.0)
            if fb_resp.ok:
                features = fb_resp.json().get("features") or []
        except Exception:
            pass

    suggestions: List[Dict[str, Any]] = []
    seen_keys = set()

    for feat in features:
        normalized = _normalize_photon_feature(feat)
        if not normalized:
            continue

        # De-duplicate by title + subtitle
        dedup_key = f"{normalized['title'].lower()}|{normalized['subtitle'].lower()}"
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        suggestions.append(normalized)

    # Sort to prioritize Indian results if mixed
    suggestions.sort(key=lambda s: 0 if s.get("countrycode") == "IN" or s.get("country") == "India" else 1)
    suggestions = suggestions[:limit]

    # Cache successful suggestions
    if len(_AUTOCOMPLETE_CACHE) > 300:
        _AUTOCOMPLETE_CACHE.clear()
    _AUTOCOMPLETE_CACHE[cache_key] = (now, suggestions)

    return {"suggestions": suggestions}


def reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    """
    Reverse geocodes coordinates (lat, lon) to readable address information via Photon.
    GET https://photon.komoot.io/reverse?lon=...&lat=...&lang=en
    """
    try:
        lat = float(lat)
        lon = float(lon)
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return {"success": False, "error": "Invalid coordinates provided."}
    except (ValueError, TypeError):
        return {"success": False, "error": "Invalid coordinate format."}

    base_url = getattr(settings, "PHOTON_API_URL", "https://photon.komoot.io").rstrip("/")
    endpoint = f"{base_url}/reverse"
    headers = {"User-Agent": "TalentHire/1.0"}
    params = {"lon": lon, "lat": lat, "lang": "en"}

    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=5.0)
        if not response.ok:
            return {"success": False, "error": f"Reverse geocoding failed (HTTP {response.status_code})."}
        data = response.json()
        features = data.get("features") or []
        if not features:
            return {"success": False, "error": "No address found for coordinates."}

        normalized = _normalize_photon_feature(features[0])
        if not normalized:
            return {"success": False, "error": "Unable to parse address components."}

        return {
            "success": True,
            "place_name": normalized["title"],
            "formatted_address": normalized["formatted_address"],
            "city": normalized["city"],
            "state": normalized["state"],
            "district": normalized["district"],
            "country": normalized["country"],
            "postcode": normalized["postcode"],
            "latitude": lat,
            "longitude": lon,
        }
    except Exception as exc:
        logger.warning("Photon reverse geocode error: %s", exc)
        return {"success": False, "error": "Unable to reverse geocode location."}


def get_place_details(place_id: str, more_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Backwards-compatibility helper for any callers expecting a details lookup.
    With Photon, coordinates and address components are already provided in the autocomplete response.
    """
    place_id = (place_id or "").strip()
    if not place_id:
        return {"error": "Place ID is required."}

    # If coordinates are encoded in place_id (e.g. coords_12.600687_75.045062)
    m = re.match(r"coords_(-?\d+\.\d+)_(-?\d+\.\d+)", place_id)
    if m:
        try:
            lat = float(m.group(1))
            lon = float(m.group(2))
            rev = reverse_geocode(lat, lon)
            if rev.get("success"):
                return {
                    "place_id": place_id,
                    "title": rev.get("place_name", ""),
                    "country": rev.get("country", "India"),
                    "state": rev.get("state", ""),
                    "district": rev.get("district", ""),
                    "municipality_subdivision": rev.get("place_name", ""),
                    "formatted_address": rev.get("formatted_address", ""),
                    "latitude": lat,
                    "longitude": lon,
                }
        except Exception:
            pass

    return {
        "place_id": place_id,
        "title": "",
        "country": "India",
        "state": "",
        "district": "",
        "formatted_address": "",
        "latitude": None,
        "longitude": None,
    }


def resolve_google_maps_link(url: str) -> Dict[str, Any]:
    """
    Safely resolves a Google Maps sharing or shortened URL.
    Enforces SSRF prevention, strict domain whitelist, redirect limits, and timeouts.
    Extracts coordinates from the final resolved URL if available.
    """
    url = (url or "").strip()
    if not url:
        return {"success": False, "error": "Please enter a Google Maps URL."}

    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return {"success": False, "error": "Invalid URL format."}

    if parsed.scheme != "https":
        return {
            "success": False,
            "error": "Only secure HTTPS Google Maps links are supported.",
        }

    hostname = (parsed.hostname or "").lower()
    if not _is_safe_host_and_ip(hostname):
        return {
            "success": False,
            "error": "URL domain is not a recognized Google Maps domain.",
        }

    if hostname in ("google.com", "www.google.com", "google.co.in", "www.google.co.in"):
        if not parsed.path.startswith("/maps") and not parsed.path.startswith("/search"):
            return {
                "success": False,
                "error": "Google URL must be a Google Maps link.",
            }

    current_url = url
    resolved_url = url
    max_redirects = 4
    redirect_count = 0

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })

    while redirect_count < max_redirects:
        try:
            resp = session.head(current_url, allow_redirects=False, timeout=4.0)
            if resp.status_code == 405 or resp.status_code >= 400:
                resp = session.get(current_url, allow_redirects=False, stream=True, timeout=4.0)
        except Exception as exc:
            logger.warning("Error fetching Google Maps URL %s: %s", current_url, exc)
            break

        if resp.is_redirect or resp.status_code in (301, 302, 303, 307, 308):
            redirect_count += 1
            location = resp.headers.get("Location")
            if not location:
                break

            next_url = urllib.parse.urljoin(current_url, location)
            next_parsed = urllib.parse.urlparse(next_url)

            if next_parsed.scheme != "https":
                return {
                    "success": False,
                    "error": "Redirect to non-HTTPS URL blocked.",
                }

            if not _is_safe_host_and_ip(next_parsed.hostname or ""):
                return {
                    "success": False,
                    "error": "Redirect to untrusted destination blocked.",
                }

            current_url = next_url
            resolved_url = next_url
        else:
            resolved_url = current_url
            break

    lat: Optional[float] = None
    lon: Optional[float] = None

    patterns = [
        r"/@(-?\d+\.\d+),(-?\d+\.\d+)",
        r"[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)",
        r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)",
        r"[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)",
    ]

    for pat in patterns:
        match = re.search(pat, resolved_url)
        if match:
            try:
                candidate_lat = float(match.group(1))
                candidate_lon = float(match.group(2))
                if -90.0 <= candidate_lat <= 90.0 and -180.0 <= candidate_lon <= 180.0:
                    lat = candidate_lat
                    lon = candidate_lon
                    break
            except (ValueError, TypeError):
                continue

    if lat is not None and lon is not None:
        return {
            "success": True,
            "resolved_url": resolved_url,
            "original_url": url,
            "latitude": lat,
            "longitude": lon,
        }

    if "share.google" in url or "/search" in resolved_url:
        return {
            "success": False,
            "resolved_url": resolved_url,
            "original_url": url,
            "error": "This link is a Google Search result, not a Google Maps link with coordinates. Please paste a direct Google Maps link (e.g. https://maps.app.goo.gl/... or https://www.google.com/maps?q=lat,lng) or use 'Pick on map'.",
        }

    return {
        "success": False,
        "resolved_url": resolved_url,
        "original_url": url,
        "error": "Could not extract coordinates from the verified Google Maps link. You can pick the location on the map.",
    }
