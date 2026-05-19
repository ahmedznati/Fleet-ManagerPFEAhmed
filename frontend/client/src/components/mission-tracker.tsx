import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup, Circle } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Map as MapIcon,
  Crosshair,
  Gauge,
  Clock,
  Route,
  Maximize2,
  Minimize2
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Google-Maps-style blue navigation arrow ───
function createNavArrowIcon(heading: number) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
    <circle cx="24" cy="24" r="20" fill="rgba(66,133,244,0.15)" />
    <circle cx="24" cy="24" r="14" fill="#4285F4" stroke="white" stroke-width="3" filter="url(#shadow)"/>
    <g transform="rotate(${heading}, 24, 24)">
      <polygon points="24,6 30,20 24,16 18,20" fill="white" opacity="0.95"/>
    </g>
  </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Blue pulsing dot (no heading)
const blueDotIcon = L.divIcon({
  className: "",
  html: `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="rgba(66,133,244,0.15)">
      <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="18" cy="18" r="8" fill="#4285F4" stroke="white" stroke-width="3"/>
  </svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// Destination red pin
const destIcon = L.divIcon({
  className: "",
  html: `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <defs>
      <filter id="ds" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <path d="M18 2C10.27 2 4 8.27 4 16c0 10.5 14 26 14 26s14-15.5 14-26C32 8.27 25.73 2 18 2z"
          fill="#EA4335" stroke="white" stroke-width="2" filter="url(#ds)"/>
    <circle cx="18" cy="16" r="5" fill="white"/>
  </svg>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -44],
});

// Start position green dot
const startPinIcon = L.divIcon({
  className: "",
  html: `
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="10" fill="#34A853" stroke="white" stroke-width="3"/>
    <circle cx="14" cy="14" r="4" fill="white"/>
  </svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Tunisia cities coordinates lookup
const cityCoordinates: Record<string, [number, number]> = {
  "tunis": [36.8065, 10.1815],
  "sfax": [34.7406, 10.7603],
  "sousse": [35.8254, 10.6084],
  "kairouan": [35.6781, 10.0963],
  "bizerte": [37.2744, 9.8739],
  "gabès": [33.8815, 10.0982],
  "gabes": [33.8815, 10.0982],
  "ariana": [36.8625, 10.1956],
  "gafsa": [34.4250, 8.7842],
  "monastir": [35.7643, 10.8113],
  "ben arous": [36.7533, 10.2189],
  "kasserine": [35.1676, 8.8365],
  "médenine": [33.3549, 10.5055],
  "medenine": [33.3549, 10.5055],
  "nabeul": [36.4513, 10.7357],
  "tataouine": [32.9297, 10.4518],
  "béja": [36.7256, 9.1817],
  "beja": [36.7256, 9.1817],
  "jendouba": [36.5011, 8.7803],
  "mahdia": [35.5047, 11.0622],
  "siliana": [36.0849, 9.3708],
  "le kef": [36.1826, 8.7148],
  "kef": [36.1826, 8.7148],
  "tozeur": [33.9197, 8.1339],
  "hammamet": [36.4000, 10.6167],
  "djerba": [33.8076, 10.8451],
  "zaghouan": [36.4029, 10.1429],
  "kébili": [33.7050, 8.9650],
  "kebili": [33.7050, 8.9650],
};

// Geocode a location name to coordinates
async function geocodeLocation(locationName: string): Promise<[number, number] | null> {
  const normalizedName = locationName.toLowerCase().trim();
  
  // Check local lookup first
  if (cityCoordinates[normalizedName]) return cityCoordinates[normalizedName];
  // Partial match
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) return coords;
  }
  
  try {
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:8000/api");
    const response = await fetch(
      `${apiBase}/geocode/search?q=${encodeURIComponent(locationName)}, Tunisia`
    );
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  
  return null;
}

/** Haversine distance in km */
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Fetch a road-following route from OSRM (free). Returns array of [lat,lng] or null. */
async function fetchRoute(from: [number, number], to: [number, number]): Promise<[number, number][] | null> {
  try {
    // OSRM uses lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // GeoJSON is [lng, lat], convert to [lat, lng]
      return data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
    }
  } catch (e) {
    console.error('OSRM routing error:', e);
  }
  return null;
}

// ─── Map sub-components ───
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (bounds && !fitted.current) {
      map.fitBounds(bounds, { padding: [60, 60] });
      fitted.current = true;
    }
  }, [bounds, map]);
  return null;
}

function FollowDriver({ position, shouldFollow }: { position: [number, number] | null; shouldFollow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (position && shouldFollow) {
      map.setView(position, Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 });
    }
  }, [position, shouldFollow, map]);
  return null;
}

interface Mission {
  id: number;
  title: string;
  description: string | null;
  endLocation: string;
  status: string;
  priority: string;
  vehicleId: number;
  driverId: number;
  coPilot?: string | null;
  passengersCount?: number | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
}

interface MissionTrackerProps {
  mission: Mission;
  onStart: () => void;
  onComplete: (completionLat?: number, completionLng?: number) => void;
  isUpdating?: boolean;
}

export function MissionTracker({ mission, onStart, onComplete, isUpdating }: MissionTrackerProps) {
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [driverPosition, setDriverPosition] = useState<[number, number] | null>(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [initialPosition, setInitialPosition] = useState<[number, number] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [traveledPath, setTraveledPath] = useState<[number, number][]>([]);
  const [isLoadingCoords, setIsLoadingCoords] = useState(true);
  const [followDriver, setFollowDriver] = useState(true);
  const [accuracy, setAccuracy] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routePoints, setRoutePoints] = useState<[number, number][] | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived values
  const distanceToDestination = useMemo(() => {
    if (!driverPosition || !endCoords) return null;
    return haversineKm(driverPosition, endCoords);
  }, [driverPosition, endCoords]);

  const distanceTraveled = useMemo(() => {
    if (traveledPath.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < traveledPath.length; i++) {
      total += haversineKm(traveledPath[i - 1], traveledPath[i]);
    }
    return total;
  }, [traveledPath]);

  const etaMinutes = useMemo(() => {
    if (!distanceToDestination || speed < 3) return null;
    return Math.round((distanceToDestination / speed) * 60);
  }, [distanceToDestination, speed]);

  // Load destination coords
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoadingCoords(true);
      const end = await geocodeLocation(mission.endLocation);
      if (!cancelled) setEndCoords(end);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled) return;
            const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            setInitialPosition(p);
            setDriverPosition(p);
            setIsLoadingCoords(false);
          },
          () => {
            if (cancelled) return;
            const def: [number, number] = [36.8065, 10.1815];
            setInitialPosition(def);
            setDriverPosition(def);
            setIsLoadingCoords(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setIsLoadingCoords(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [mission.endLocation]);

  // Fetch road route when driver position or destination changes
  useEffect(() => {
    if (!driverPosition || !endCoords) return;
    // Debounce route fetching to every 10 seconds
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(async () => {
      const route = await fetchRoute(driverPosition, endCoords);
      if (route) setRoutePoints(route);
    }, routePoints ? 10000 : 0); // Fetch immediately first time, then debounce
    return () => { if (routeTimerRef.current) clearTimeout(routeTimerRef.current); };
  }, [driverPosition, endCoords]);

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingError("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setIsTracking(true);
    setTrackingError(null);
    setTraveledPath(driverPosition ? [driverPosition] : []);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
        setDriverPosition(newPos);
        setSpeed((position.coords.speed ?? 0) * 3.6);
        setAccuracy(position.coords.accuracy ?? 0);
        if (position.coords.heading != null && position.coords.heading >= 0) {
          setHeading(position.coords.heading);
        }
        setTraveledPath((prev) => {
          // Only add if moved > 5m to avoid GPS jitter
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (haversineKm(last, newPos) < 0.005) return prev;
          }
          return [...prev, newPos];
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setTrackingError("Permission de localisation refusée.");
            break;
          case error.POSITION_UNAVAILABLE:
            setTrackingError("Position non disponible. Vérifiez votre GPS.");
            break;
          case error.TIMEOUT:
            setTrackingError("Délai d'attente GPS dépassé.");
            break;
          default:
            setTrackingError("Erreur de géolocalisation.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  }, [driverPosition]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const handleStart = () => { startTracking(); onStart(); };
  const handleComplete = () => {
    stopTracking();
    onComplete(driverPosition?.[0], driverPosition?.[1]);
  };

  // Auto-start tracking if mission is already in_progress
  useEffect(() => {
    if (mission.status === "in_progress" && !isTracking && !isLoadingCoords) {
      startTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.status, isLoadingCoords]);

  const mapBounds = useMemo(() => {
    const pts: [number, number][] = [];
    if (initialPosition) pts.push(initialPosition);
    if (endCoords) pts.push(endCoords);
    return pts.length >= 2 ? L.latLngBounds(pts) : null;
  }, [initialPosition, endCoords]);

  const isInProgress = mission.status === "in_progress";
  const isPending = mission.status === "pending";

  // Remaining route: use OSRM road route, fallback to straight line
  const remainingRoute = routePoints || (driverPosition && endCoords ? [driverPosition, endCoords] : []);

  // Choose navigation icon
  const driverIcon = useMemo(() => {
    if (isTracking && speed > 2) return createNavArrowIcon(heading);
    return blueDotIcon;
  }, [isTracking, speed, heading]);

  const formatDist = (km: number) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  const formatEta = (mins: number | null) => {
    if (mins === null) return "—";
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  };

  return (
    <div ref={containerRef} className={isFullscreen ? "fixed inset-0 z-[9999] bg-white flex flex-col" : ""}>
    <Card className={`overflow-hidden shadow-lg border-0 ${isFullscreen ? "rounded-none flex-1 flex flex-col" : ""}`}>
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              {mission.title}
            </CardTitle>
            {mission.description && (
              <p className="text-blue-100 text-sm mt-1 line-clamp-1">{mission.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={
              isInProgress ? "bg-white/20 text-white backdrop-blur" :
              isPending ? "bg-white/20 text-white backdrop-blur" :
              "bg-emerald-500 text-white"
            }>
              {isInProgress ? "🚗 Navigation" : isPending ? "En attente" : "Terminée"}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 w-8 h-8"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`p-0 ${isFullscreen ? "flex-1 flex flex-col" : ""}`}>
        {/* ── Stats bar (Google Maps-like) ── */}
        {isTracking && (
          <div className="grid grid-cols-3 divide-x bg-white border-b">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                <Route className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Distance</span>
              </div>
              <p className="text-lg font-bold text-slate-800">
                {distanceToDestination !== null ? formatDist(distanceToDestination) : "—"}
              </p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">ETA</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{formatEta(etaMinutes)}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                <Gauge className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Vitesse</span>
              </div>
              <p className="text-lg font-bold text-slate-800">{Math.round(speed)} km/h</p>
            </div>
          </div>
        )}

        {/* ── Map ── */}
        <div className={`${isFullscreen ? "flex-1" : "h-[420px]"} relative`}>
          {isLoadingCoords ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-sm text-slate-500 mt-2">Chargement de la carte...</p>
              </div>
            </div>
          ) : !endCoords ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm text-slate-600 mt-2">Impossible de localiser la destination</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={initialPosition || [36.8, 10.18]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />

              <FitBounds bounds={mapBounds} />
              <FollowDriver position={driverPosition} shouldFollow={followDriver && isTracking} />

              {/* Remaining route (road-following to destination) */}
              {remainingRoute.length >= 2 && (
                <Polyline
                  positions={remainingRoute}
                  pathOptions={
                    routePoints && routePoints.length > 0
                      ? { color: "#6B7280", weight: 5, opacity: 0.6 }
                      : { color: "#9CA3AF", weight: 4, opacity: 0.7, dashArray: "8, 12" }
                  }
                />
              )}

              {/* Traveled path — Google Maps blue trail */}
              {traveledPath.length > 1 && (
                <>
                  {/* Glow layer */}
                  <Polyline
                    positions={traveledPath}
                    pathOptions={{ color: "#93C5FD", weight: 10, opacity: 0.4, lineCap: "round", lineJoin: "round" }}
                  />
                  {/* Main blue line */}
                  <Polyline
                    positions={traveledPath}
                    pathOptions={{ color: "#4285F4", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }}
                  />
                </>
              )}

              {/* Start position (green dot) */}
              {isTracking && initialPosition && traveledPath.length > 3 && (
                <Marker position={initialPosition} icon={startPinIcon}>
                  <Popup><strong>📍 Point de départ</strong></Popup>
                </Marker>
              )}

              {/* Destination red pin */}
              <Marker position={endCoords} icon={destIcon}>
                <Popup>
                  <div className="text-center">
                    <strong className="text-red-600">🏁 Destination</strong>
                    <br />
                    <span className="text-sm">{mission.endLocation}</span>
                    {distanceToDestination !== null && (
                      <><br /><span className="text-xs text-slate-500">{formatDist(distanceToDestination)} restants</span></>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Driver blue arrow / pulsing dot */}
              {driverPosition && (
                <>
                  {accuracy > 0 && accuracy < 200 && (
                    <Circle
                      center={driverPosition}
                      radius={accuracy}
                      pathOptions={{ color: "#4285F4", fillColor: "#4285F4", fillOpacity: 0.08, weight: 1, opacity: 0.3 }}
                    />
                  )}
                  <Marker position={driverPosition} icon={driverIcon} zIndexOffset={1000}>
                    <Popup>
                      <div className="text-center">
                        <strong className="text-blue-600">📍 Votre position</strong>
                        <br />
                        <span className="text-xs text-slate-500">
                          {driverPosition[0].toFixed(5)}, {driverPosition[1].toFixed(5)}
                        </span>
                        {speed > 0 && (
                          <><br /><span className="text-xs">{Math.round(speed)} km/h</span></>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          )}

          {/* GPS status badge */}
          {isTracking && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 z-[1000]">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">GPS actif</span>
              {distanceTraveled > 0 && (
                <span className="text-xs text-slate-400">• {formatDist(distanceTraveled)} parcourus</span>
              )}
            </div>
          )}

          {/* Re-center button */}
          {isTracking && (
            <Button
              size="icon"
              variant={followDriver ? "default" : "outline"}
              className={`absolute bottom-4 right-4 z-[1000] rounded-full shadow-lg w-10 h-10 ${followDriver ? "bg-blue-600 hover:bg-blue-700" : "bg-white hover:bg-slate-50"}`}
              onClick={() => setFollowDriver(!followDriver)}
              title={followDriver ? "Suivi automatique activé" : "Recentrer sur ma position"}
            >
              <Crosshair className={`w-5 h-5 ${followDriver ? "text-white" : "text-blue-600"}`} />
            </Button>
          )}
        </div>

        {/* Destination info bar */}
        <div className="p-4 bg-white border-t flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Destination</p>
            <p className="font-medium text-slate-800 truncate">{mission.endLocation}</p>
          </div>
          {distanceToDestination !== null && (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-blue-600">{formatDist(distanceToDestination)}</p>
              {etaMinutes !== null && <p className="text-[10px] text-slate-400">{formatEta(etaMinutes)}</p>}
            </div>
          )}
        </div>

        {/* Co-pilot & Passengers */}
        {(mission.coPilot || (mission.passengersCount && mission.passengersCount > 1)) && (
          <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs text-slate-600">
            {mission.coPilot && (
              <span className="bg-slate-100 px-2 py-1 rounded-full">👤 Co-pilote : <strong>{mission.coPilot}</strong></span>
            )}
            {mission.passengersCount && mission.passengersCount > 0 && (
              <span className="bg-slate-100 px-2 py-1 rounded-full">👥 {mission.passengersCount} personne(s)</span>
            )}
          </div>
        )}

        {/* Error */}
        {trackingError && (
          <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {trackingError}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-4 border-t">
          {isPending && (
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 rounded-xl"
              onClick={handleStart}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5 mr-2" />
              )}
              Démarrer la Navigation
            </Button>
          )}

          {isInProgress && (
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6 rounded-xl"
              onClick={handleComplete}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              Terminer la Mission
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
