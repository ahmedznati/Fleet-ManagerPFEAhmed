import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { icon } from "leaflet";
import { type Vehicle, type Location } from "@shared/schema";
import { Badge } from "./ui/badge";
import { Link } from "wouter";
import { Navigation, Clock } from "lucide-react";
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

interface MapViewProps {
  vehicles?: Vehicle[];
  selectedVehicleId?: number;
  height?: string;
  history?: Location[];
}

export function MapView({ vehicles = [], selectedVehicleId, height = "500px", history = [] }: MapViewProps) {
  // Default center (e.g., Paris) or center on first vehicle
  const center = vehicles.length > 0 && vehicles[0].lat && vehicles[0].lng
    ? [vehicles[0].lat, vehicles[0].lng] as [number, number]
    : [48.8566, 2.3522] as [number, number];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981'; // emerald-500
      case 'maintenance': return '#f59e0b'; // amber-500
      case 'inactive': return '#ef4444'; // rose-500
      default: return '#64748b'; // slate-500
    }
  };

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

        {vehicles.map((vehicle) => (
          vehicle.lat && vehicle.lng && (
            <Marker 
              key={vehicle.id} 
              position={[vehicle.lat, vehicle.lng]}
              icon={dotIcon(getStatusColor(vehicle.status))}
            >
              <Popup className="min-w-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{vehicle.name}</h3>
                    <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'} 
                           className={
                             vehicle.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                             vehicle.status === 'maintenance' ? 'bg-amber-500 hover:bg-amber-600' : ''
                           }>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{vehicle.model} • {vehicle.licensePlate}</p>
                  
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
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {history.length > 0 && (
          <Polyline 
            positions={history.map(loc => [loc.lat, loc.lng])}
            pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
