/**
 * LocationPicker
 *
 * Location picker using:
 *  - Leaflet + OpenStreetMap tiles (free, no API key)
 *  - Nominatim for address autocomplete + reverse geocoding
 *  - Browser Geolocation API for GPS
 */

import "leaflet/dist/leaflet.css";
import * as L from "leaflet";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
  type KeyboardEvent,
} from "react";
import {
  MapPin,
  Search,
  LocateFixed,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPlaces, reverseGeocode, type PlaceSuggestion } from "@/lib/mappls";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SelectedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  value?: SelectedLocation;
  onChange: (loc: SelectedLocation) => void;
  error?: string;
}

// ── Custom map pin (avoids Leaflet's bundler icon issues) ─────────────────────

const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path fill="#7c3aed" stroke="#fff" stroke-width="2"
          d="M14 1C7.373 1 2 6.373 2 13c0 10.5 12 26 12 26S26 23.5 26 13C26 6.373 20.627 1 14 1z"/>
    <circle cx="14" cy="13" r="5" fill="#fff"/>
  </svg>`,
  className: "",
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
});

// ── Component ─────────────────────────────────────────────────────────────────

export function LocationPicker({ value, onChange, error }: LocationPickerProps) {
  const uid = useId();
  const mapId = `osm-map-${uid.replace(/[^a-zA-Z0-9]/g, "")}`;

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Keep latest onChange in a ref so Leaflet event listeners never go stale
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value?.address ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ── Init Leaflet map once ─────────────────────────────────────────────────

  useEffect(() => {
    if (mapRef.current) return; // already initialised

    // Defer one frame so the container div has real pixel dimensions
    const frame = requestAnimationFrame(() => {
      const container = document.getElementById(mapId);
      if (!container) return;

      const initialCenter: L.LatLngExpression = value
        ? [value.lat, value.lng]
        : [20.5937, 78.9629]; // India centre
      const initialZoom = value ? 14 : 5;

      const map = L.map(mapId, { zoomControl: true }).setView(initialCenter, initialZoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Map click → move pin + reverse geocode
      map.on("click", async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        placeMarker(map, lat, lng);
        const geo = await reverseGeocode(lat, lng);
        setSearchQuery(geo.formattedAddress);
        onChangeRef.current({ lat, lng, address: geo.formattedAddress });
      });

      // Place initial marker if a value was provided
      if (value && value.lat !== 0) {
        placeMarker(map, value.lat, value.lng);
      }

      setMapReady(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      // Clean up map on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: place / move draggable marker ─────────────────────────────────

  const placeMarker = useCallback((map: L.Map, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { icon: PIN_ICON, draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        const geo = await reverseGeocode(pos.lat, pos.lng);
        setSearchQuery(geo.formattedAddress);
        onChangeRef.current({ lat: pos.lat, lng: pos.lng, address: geo.formattedAddress });
      });
    }
  }, []);

  // ── Fly map to coords ─────────────────────────────────────────────────────

  const flyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo([lat, lng], 15, { duration: 0.8 });
  }, []);

  // ── Select location from suggestion / GPS ─────────────────────────────────

  const selectLocation = useCallback(
    (lat: number, lng: number, address: string) => {
      setSearchQuery(address);
      setSuggestions([]);
      setGpsError(null);
      if (mapRef.current) {
        placeMarker(mapRef.current, lat, lng);
        flyTo(lat, lng);
      }
      onChangeRef.current({ lat, lng, address });
    },
    [placeMarker, flyTo],
  );

  // ── Debounced Nominatim autocomplete ─────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    // Nominatim rate limit: 1 req/s — 420ms debounce is safe
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(searchQuery);
      setSuggestions(results);
      setIsSearching(false);
    }, 420);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── GPS handler ───────────────────────────────────────────────────────────

  const handleGPS = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsError("GPS is not supported by your browser.");
      return;
    }
    setIsGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const geo = await reverseGeocode(lat, lng);
          selectLocation(lat, lng, geo.formattedAddress);
        } finally {
          setIsGpsLoading(false);
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Location access denied. Please allow location in your browser.",
          2: "Could not determine your location. Try searching manually.",
          3: "Location request timed out. Try searching manually.",
        };
        setGpsError(msgs[err.code] ?? "GPS error. Try searching manually.");
        setIsGpsLoading(false);
      },
      { timeout: 12_000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  }, [selectLocation]);

  // ── Enter key selects first suggestion ───────────────────────────────────

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && suggestions[0]) {
      e.preventDefault();
      selectLocation(
        suggestions[0].lat,
        suggestions[0].lng,
        suggestions[0].displayName,
      );
    }
  };

  const hasSelection = !!value && value.lat !== 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Location
        </span>
        {hasSelection && (
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
            onClick={() => {
              setSearchQuery("");
              markerRef.current?.remove();
              markerRef.current = null;
              onChangeRef.current({ lat: 0, lng: 0, address: "" });
            }}
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Search + GPS row */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search address, area or landmark…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => setTimeout(() => setSuggestions([]), 200)}
            onKeyDown={handleSearchKeyDown}
            className={`h-10 pl-9 pr-3 ${error ? "border-red-500" : ""}`}
            autoComplete="off"
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 shrink-0 text-xs font-medium"
          onClick={handleGPS}
          disabled={isGpsLoading}
          title="Use current GPS location"
        >
          {isGpsLoading ? (
            <span className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          {isGpsLoading ? "Locating…" : "GPS"}
        </Button>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-12 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors flex items-start gap-3 group"
                onMouseDown={() => selectLocation(s.lat, s.lng, s.displayName)}
              >
                <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary shrink-0 mt-1" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {s.shortName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{s.displayName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS error */}
      {gpsError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {gpsError}
        </p>
      )}

      {/* Map container */}
      <div
        className={`relative rounded-xl overflow-hidden border transition-all ${
          mapReady
            ? "border-slate-200 dark:border-slate-700"
            : "border-dashed border-slate-200 dark:border-slate-700"
        }`}
        style={{ height: 260 }}
      >
        <div id={mapId} className="w-full h-full" />

        {/* Loading overlay — shown until Leaflet finishes init */}
        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900/80 z-10">
            <span className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading map…</p>
          </div>
        )}

        {/* Hint when no pin placed yet */}
        {mapReady && !hasSelection && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm py-1.5 text-xs text-slate-500 pointer-events-none">
            <MapPin className="h-3 w-3" />
            Click the map or drag the pin to fine-tune your location
          </div>
        )}
      </div>

      {/* Form validation error */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Selected location chip */}
      {hasSelection && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 leading-tight">
              {value!.address}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              {value!.lat.toFixed(5)}° N · {value!.lng.toFixed(5)}° E
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
