import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import { icon } from "leaflet";
import { type Vehicle, type Location } from "@shared/schema";
import { Badge } from "./ui/badge";
import { Link } from "wouter";
import { Navigation, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Fix for default marker icon in react-leaflet
const vehicleIcon = icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Simple colored dot icon
const dotIcon = (color: string) => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
  </svg>`;
  
  return icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

// Green flag for mission start
const missionStartIcon = icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#22c55e" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="white" font-weight="bold">A</text></svg>`)}`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Red pin for mission destination
const missionEndIcon = icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="white" font-weight="bold">B</text></svg>`)}`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Catmull-Rom spline: adds interpolated points between GPS waypoints for a smooth curve
function interpolatePath(pts: [number, number][], steps = 24): [number, number][] {
  if (pts.length < 2) return pts;
  const ext: [number, number][] = [pts[0], ...pts, pts[pts.length - 1]];
  const result: [number, number][] = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]];
    for (let t = 0; t < steps; t++) {
      const s = t / steps, s2 = s * s, s3 = s2 * s;
      const lat = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3);
      const lng = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);
      result.push([lat, lng]);
    }
  }
  result.push(pts[pts.length - 1]);
  return result;
}

// Flies to the selected vehicle whenever selectedVehicleId changes
function MapController({ vehicles, selectedVehicleId }: { vehicles: any[]; selectedVehicleId?: number }) {
  const map = useMap();

  // Fix Leaflet sizing when the container gets its height after React render
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (!selectedVehicleId) return;
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle?.lat && vehicle?.lng) {
      map.flyTo([vehicle.lat, vehicle.lng], 16, { duration: 1.2 });
    }
  }, [selectedVehicleId, map, vehicles]);

  return null;
}

interface MapViewProps {
  vehicles?: Vehicle[];
  selectedVehicleId?: number;
  height?: string;
  history?: Location[];
  missions?: any[];
}

export function MapView({ vehicles = [], selectedVehicleId, height = "500px", history = [], missions = [] }: MapViewProps) {
  // Default center or center on first vehicle with GPS
  const firstWithGps = vehicles.find((v) => v.lat && v.lng);
  const center = firstWithGps
    ? [firstWithGps.lat, firstWithGps.lng] as [number, number]
    : [48.8566, 2.3522] as [number, number];

  // Green if on an active mission, gray otherwise
  const getDotColor = (vehicle: any) =>
    vehicle.isOnMission ? "#10b981" : "#94a3b8";

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg" style={{ height }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapController vehicles={vehicles} selectedVehicleId={selectedVehicleId} />

        {vehicles.map((vehicle) => (
          vehicle.lat && vehicle.lng && (
            <Marker 
              key={vehicle.id} 
              position={[vehicle.lat, vehicle.lng]}
              icon={dotIcon(getDotColor(vehicle))}
            >
              <Popup className="min-w-[220px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{vehicle.name}</h3>
                    <Badge
                      className={
                        (vehicle as any).isOnMission
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-slate-400 text-white"
                      }
                    >
                      {(vehicle as any).isOnMission ? "En ligne" : "Hors ligne"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{vehicle.model} • {vehicle.licensePlate}</p>
                  
                  {/* Active mission info */}
                  {(() => {
                    const activeMission = missions.find((m: any) => m.vehicleId === vehicle.id && m.status === "in_progress");
                    if (!activeMission) return null;
                    return (
                      <div className="border-t pt-2 mt-1 space-y-1">
                        <p className="text-xs font-semibold text-slate-700">{activeMission.title}</p>
                        {activeMission.startLat && activeMission.startLng && (
                          <div className="flex items-start gap-1 text-xs text-slate-500">
                            <span className="text-emerald-500 font-bold shrink-0">A</span>
                            <span>Départ enregistré</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                          <span>{activeMission.endLocation}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t mt-2">
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
                    </div>
                    {vehicle.lastUpdated && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(vehicle.lastUpdated), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/vehicles/${vehicle.id}`} className="block mt-2 text-center text-sm bg-slate-900 text-white py-1.5 rounded-md hover:bg-slate-800 transition-colors">
                    Voir détails
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Mission start (A) and destination (B) markers */}
        {missions.map((mission: any) => (
          <span key={`mission-markers-${mission.id}`}>
            {mission.startLat && mission.startLng && (
              <Marker position={[mission.startLat, mission.startLng]} icon={missionStartIcon}>
                <Popup>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-emerald-700">Départ</p>
                    <p className="text-slate-600">{mission.title}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {mission.endLat && mission.endLng && (
              <Marker position={[mission.endLat, mission.endLng]} icon={missionEndIcon}>
                <Popup>
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-red-700">Destination</p>
                    <p className="text-slate-600">{mission.endLocation}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </span>
        ))}

        {history.length > 0 && (
          <>
            {/* Smooth curved path via Catmull-Rom spline */}
            <Polyline
              positions={interpolatePath(history.map(loc => [loc.lat, loc.lng] as [number, number]))}
              pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }}
            />
            {/* Actual recorded GPS waypoints */}
            {history.map((loc, idx) => (
              <CircleMarker
                key={idx}
                center={[loc.lat, loc.lng]}
                radius={idx === 0 || idx === history.length - 1 ? 6 : 4}
                pathOptions={{
                  color: idx === history.length - 1 ? '#1d4ed8' : '#3b82f6',
                  weight: 2,
                  fillColor: idx === 0 ? '#22c55e' : idx === history.length - 1 ? '#1d4ed8' : '#93c5fd',
                  fillOpacity: 1,
                }}
              />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}
