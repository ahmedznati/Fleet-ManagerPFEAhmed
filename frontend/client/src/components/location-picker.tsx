import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation } from "lucide-react";
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
  };

  const handleConfirm = () => {
    onChange(selectedName);
    setOpen(false);
  };

  const filteredCities = tunisiaCities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {/* City list */}
            <div className="col-span-1 space-y-2">
              <Input
                placeholder="Rechercher une ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <div className="h-[400px] overflow-y-auto space-y-1 pr-2">
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
                  minZoom={6}
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
              
              {/* Selected location display */}
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Lieu sélectionné:</span>{" "}
                  {selectedName || "Cliquez sur la carte ou choisissez une ville"}
                </p>
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
