import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Search, Loader2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Tunisia cities for quick selection
const tunisiaCities = [
  { name: "Tunis", lat: 36.8065, lng: 10.1815 },
  { name: "Sfax", lat: 34.7406, lng: 10.7603 },
  { name: "Sousse", lat: 35.8254, lng: 10.6084 },
  { name: "Kairouan", lat: 35.6781, lng: 10.0963 },
  { name: "Bizerte", lat: 37.2744, lng: 9.8739 },
  { name: "Gabès", lat: 33.8815, lng: 10.0982 },
  { name: "Ariana", lat: 36.8625, lng: 10.1956 },
  { name: "Gafsa", lat: 34.4250, lng: 8.7842 },
  { name: "Monastir", lat: 35.7643, lng: 10.8113 },
  { name: "Ben Arous", lat: 36.7533, lng: 10.2189 },
  { name: "Kasserine", lat: 35.1676, lng: 8.8365 },
  { name: "Médenine", lat: 33.3549, lng: 10.5055 },
  { name: "Nabeul", lat: 36.4513, lng: 10.7357 },
  { name: "Tataouine", lat: 32.9297, lng: 10.4518 },
  { name: "Béja", lat: 36.7256, lng: 9.1817 },
  { name: "Jendouba", lat: 36.5011, lng: 8.7803 },
  { name: "Mahdia", lat: 35.5047, lng: 11.0622 },
  { name: "Siliana", lat: 36.0849, lng: 9.3708 },
  { name: "Le Kef", lat: 36.1826, lng: 8.7148 },
  { name: "Tozeur", lat: 33.9197, lng: 8.1339 },
  { name: "Hammamet", lat: 36.4000, lng: 10.6167 },
  { name: "Djerba", lat: 33.8076, lng: 10.8451 },
  { name: "Zaghouan", lat: 36.4029, lng: 10.1429 },
  { name: "Kébili", lat: 33.7050, lng: 8.9650 },
];

// Tunisia bounds
const tunisiaBounds: L.LatLngBoundsExpression = [
  [30.2, 7.5], // Southwest
  [37.5, 11.6], // Northeast
];

// ── Open Location Code (Plus Code) decoder ─────────────────────────────────
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';
const OLC_BASE = 20;

/** Encode lat/lng to the first `length` OLC chars (no separator). */
function olcEncodePrefix(lat: number, lng: number, length: number): string {
  let adjLat = lat + 90;
  let adjLng = lng + 180;
  let code = '';
  let latPlace = 180.0;
  let lngPlace = 360.0;
  for (let i = 0; i < 8 && code.length < length; i += 2) {
    latPlace /= OLC_BASE;
    lngPlace /= OLC_BASE;
    const latIdx = Math.min(Math.floor(adjLat / latPlace), OLC_BASE - 1);
    const lngIdx = Math.min(Math.floor(adjLng / lngPlace), OLC_BASE - 1);
    code += OLC_ALPHABET[latIdx];
    if (code.length < length) code += OLC_ALPHABET[lngIdx];
    adjLat -= latIdx * latPlace;
    adjLng -= lngIdx * lngPlace;
  }
  return code;
}

/** Decode raw OLC digit string (no separator) to centre lat/lng. */
function olcDecodeDigits(digits: string): { lat: number; lng: number } {
  let lat = -90.0, lng = -180.0;
  let latPlace = 180.0, lngPlace = 360.0;
  for (let i = 0; i < Math.min(digits.length, 8); i += 2) {
    latPlace /= OLC_BASE;
    lngPlace /= OLC_BASE;
    lat += OLC_ALPHABET.indexOf(digits[i]) * latPlace;
    if (i + 1 < digits.length) lng += OLC_ALPHABET.indexOf(digits[i + 1]) * lngPlace;
  }
  for (let i = 8; i < digits.length; i++) {
    latPlace /= 5; lngPlace /= 4;
    const idx = OLC_ALPHABET.indexOf(digits[i]);
    if (idx < 0) break;
    lat += Math.floor(idx / 4) * latPlace;
    lng += (idx % 4) * lngPlace;
  }
  return { lat: lat + latPlace / 2, lng: lng + lngPlace / 2 };
}

/**
 * Parse a Plus Code (full or short code) and return lat/lng.
 * Short codes (< 8 chars before '+') require refLat/refLng reference.
 */
function parsePlusCode(code: string, refLat?: number, refLng?: number): { lat: number; lng: number } | null {
  const clean = code.toUpperCase().replace(/\s/g, '');
  const plusIdx = clean.indexOf('+');
  if (plusIdx < 0) return null;
  const before = clean.substring(0, plusIdx);
  const after  = clean.substring(plusIdx + 1);
  if (!before.split('').every(c => OLC_ALPHABET.includes(c))) return null;
  if (!after.split('').every(c => OLC_ALPHABET.includes(c))) return null;
  const digits = before + after;

  // Full code — decode directly
  if (plusIdx >= 8) return olcDecodeDigits(digits);

  // Short code — need reference
  if (refLat === undefined || refLng === undefined) return null;
  const paddingLen = 8 - plusIdx;
  const prefix = olcEncodePrefix(refLat, refLng, paddingLen);
  const result = olcDecodeDigits(prefix + digits);

  // Adjust if decoded location is > half a resolution away from reference
  const resolution = Math.pow(OLC_BASE, 2 - paddingLen / 2);
  const half = resolution / 2;
  let aLat = refLat, aLng = refLng;
  if (refLat + half < result.lat) aLat = refLat - resolution;
  else if (refLat - half > result.lat) aLat = refLat + resolution;
  if (refLng + half < result.lng) aLng = refLng - resolution;
  else if (refLng - half > result.lng) aLng = refLng + resolution;
  if (aLat !== refLat || aLng !== refLng)
    return olcDecodeDigits(olcEncodePrefix(aLat, aLng, paddingLen) + digits);
  return result;
}

// ── Helper regexes ──────────────────────────────────────────────────────────
// Plus Code: "XXXX+XX" or "XXXX+XX, City"
const PLUS_CODE_REGEX = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}([\s,].*)?$/i;
const isPlusCode = (s: string) => PLUS_CODE_REGEX.test(s.trim());

// Raw "lat, lng"
const LATLNG_REGEX = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
const isLatLng = (s: string) => LATLNG_REGEX.test(s.trim());

async function geocodeQuery(query: string): Promise<Array<{ lat: number; lng: number; name: string }>> {
  const encoded = encodeURIComponent(query.trim());
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&accept-language=fr`;
  const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: any) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    name: item.display_name?.split(",").slice(0, 2).join(", ") || query,
  }));
}

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

function MapClickHandler({ 
  onLocationSelect 
}: { 
  onLocationSelect: (lat: number, lng: number, name: string) => void 
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      // Try to get location name via reverse geocoding
      try {
        const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:8000/api");
        const response = await fetch(
          `${apiBase}/geocode/reverse?lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        const locationName = data.address?.city || 
                            data.address?.town || 
                            data.address?.village || 
                            data.address?.municipality ||
                            data.display_name?.split(',')[0] ||
                            `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect(lat, lng, locationName);
      } catch {
        onLocationSelect(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    },
  });
  return null;
}

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 12, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

export function LocationPicker({ value, onChange, placeholder, label }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedName, setSelectedName] = useState(value || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedName(value || "");
  }, [value]);

  const handleLocationSelect = (lat: number, lng: number, name: string) => {
    setSelectedPosition([lat, lng]);
    setSelectedName(name);
  };

  const handleCitySelect = (city: typeof tunisiaCities[0]) => {
    setSelectedPosition([city.lat, city.lng]);
    setSelectedName(city.name);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleResultSelect = (result: { lat: number; lng: number; name: string }) => {
    setSelectedPosition([result.lat, result.lng]);
    setSelectedName(result.name);
    setSearchResults([]);
    setSearchQuery(result.name);
  };

  // Live geocoding search with debounce
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }

    // 1. Raw lat,lng → parse immediately
    if (isLatLng(q)) {
      const [lat, lng] = q.split(",").map((s) => parseFloat(s.trim()));
      setSelectedPosition([lat, lng]);
      setSelectedName(q.trim());
      setSearchResults([]);
      return;
    }

    // 2. Plus Code (e.g. "V46W+2W4, Ariana") → OLC decode
    if (isPlusCode(q)) {
      const commaIdx = q.indexOf(',');
      const codeOnly  = (commaIdx > 0 ? q.substring(0, commaIdx) : q).trim();
      const cityPart  = commaIdx > 0 ? q.substring(commaIdx + 1).trim() : '';
      const isFull    = codeOnly.indexOf('+') >= 8;

      if (isFull) {
        // Full code — no reference needed
        const decoded = parsePlusCode(codeOnly);
        if (decoded) {
          setSelectedPosition([decoded.lat, decoded.lng]);
          setSelectedName(q.trim());
          setSearchResults([]);
          return;
        }
      } else if (cityPart) {
        // Short code — find reference city
        const refCity = tunisiaCities.find(
          (c) =>
            c.name.toLowerCase() === cityPart.toLowerCase() ||
            cityPart.toLowerCase().includes(c.name.toLowerCase())
        );
        if (refCity) {
          const decoded = parsePlusCode(codeOnly, refCity.lat, refCity.lng);
          if (decoded) {
            setSelectedPosition([decoded.lat, decoded.lng]);
            setSelectedName(`${codeOnly}, ${refCity.name}`);
            setSearchResults([]);
            return;
          }
        } else {
          // Reference city not in our list — geocode it first
          searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            try {
              const cityResults = await geocodeQuery(cityPart + ', Tunisie');
              if (cityResults.length > 0) {
                const ref = cityResults[0];
                const decoded = parsePlusCode(codeOnly, ref.lat, ref.lng);
                if (decoded) {
                  setSelectedPosition([decoded.lat, decoded.lng]);
                  setSelectedName(`${codeOnly}, ${cityPart}`);
                  setSearchResults([]);
                }
              }
            } finally {
              setIsSearching(false);
            }
          }, 400);
          return;
        }
      }
    }

    // 3. Regular address text → Nominatim
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await geocodeQuery(q);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  const handleConfirm = () => {
    onChange(selectedName);
    setOpen(false);
  };

  const filteredCities = searchQuery
    ? tunisiaCities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : tunisiaCities;

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="icon" title="Choisir sur la carte">
            <MapPin className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              {label || "Sélectionner un lieu"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Search + city list */}
            <div className="col-span-1 space-y-2">
              {/* Geocoding / Plus Code input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Adresse, code Plus (V46W+2W4)…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 text-sm"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 px-1">
                Tapez une adresse, un code Plus Google Maps, ou des coordonnées (lat, lng)
              </p>

              <div className="h-[340px] overflow-y-auto space-y-1 pr-1">
                {/* Geocoding results */}
                {searchResults.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-slate-500 px-2 py-1 uppercase tracking-wide">Résultats</p>
                    {searchResults.map((r, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant={selectedName === r.name ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start text-left h-auto py-1.5 text-xs"
                        onClick={() => handleResultSelect(r)}
                      >
                        <MapPin className="h-3 w-3 mr-2 flex-shrink-0 text-red-400" />
                        <span className="truncate">{r.name}</span>
                      </Button>
                    ))}
                    <div className="border-t my-2" />
                  </div>
                )}

                {/* City shortcuts */}
                <p className="text-[10px] font-semibold text-slate-500 px-2 py-1 uppercase tracking-wide">Villes principales</p>
                {filteredCities.map((city) => (
                  <Button
                    key={city.name}
                    type="button"
                    variant={selectedName === city.name ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => handleCitySelect(city)}
                  >
                    <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                    {city.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="col-span-2">
              <div className="h-[400px] rounded-lg overflow-hidden border">
                <MapContainer
                  center={[34.0, 9.5]}
                  zoom={6}
                  style={{ height: "100%", width: "100%" }}
                  maxBounds={tunisiaBounds}
                  minZoom={5}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onLocationSelect={handleLocationSelect} />
                  <FlyToLocation position={selectedPosition} />
                  {selectedPosition && (
                    <Marker position={selectedPosition} icon={defaultIcon} />
                  )}
                </MapContainer>
              </div>
              
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Lieu sélectionné:</span>{" "}
                  {selectedName || "Cliquez sur la carte, choisissez une ville ou tapez une adresse"}
                </p>
                {selectedPosition && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm}
              disabled={!selectedName}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
