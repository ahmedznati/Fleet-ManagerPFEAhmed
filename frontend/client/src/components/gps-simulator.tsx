import { useState, useRef, useCallback, useEffect } from "react";
import { useUpdateGpsPosition } from "@/hooks/use-gps-tracking";
import { useVehicles } from "@/hooks/use-vehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Radio, Zap } from "lucide-react";

interface SimulatedVehicle {
  vehicleId: number;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  engineOn: boolean;
}

// Some starting positions around Tunisia (Tunis area) for demo
const START_POSITIONS = [
  { lat: 36.8065, lng: 10.1815 }, // Tunis center
  { lat: 36.8500, lng: 10.1648 }, // Ariana
  { lat: 36.7443, lng: 10.2562 }, // L'Ariana
  { lat: 36.7964, lng: 10.1300 }, // Bardo
  { lat: 36.8400, lng: 10.2300 }, // Carthage
];

/**
 * GPS Simulator for testing real-time tracking.
 * Visible only to superadmin/operateur on the live map page.
 * Simulates vehicle movement by sending periodic GPS updates.
 */
export function GpsSimulator() {
  const { data: vehicles } = useVehicles();
  const updateGps = useUpdateGpsPosition();
  const [simulating, setSimulating] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [simVehicles, setSimVehicles] = useState<SimulatedVehicle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<SimulatedVehicle[]>([]);

  // Update ref when state changes
  useEffect(() => {
    simRef.current = simVehicles;
  }, [simVehicles]);

  const startSimulation = useCallback(() => {
    if (!vehicles || vehicles.length === 0) return;

    // Pick vehicles to simulate
    const vehiclesToSim = selectedVehicleId
      ? vehicles.filter((v: any) => v.id === Number(selectedVehicleId))
      : vehicles.slice(0, Math.min(5, vehicles.length));

    const initial: SimulatedVehicle[] = vehiclesToSim.map((v: any, i: number) => {
      const pos = START_POSITIONS[i % START_POSITIONS.length];
      return {
        vehicleId: v.id,
        lat: pos.lat + (Math.random() - 0.5) * 0.01,
        lng: pos.lng + (Math.random() - 0.5) * 0.01,
        speed: 30 + Math.random() * 60,
        heading: Math.random() * 360,
        engineOn: true,
      };
    });

    setSimVehicles(initial);
    simRef.current = initial;
    setSimulating(true);

    // Send initial positions
    initial.forEach((sv) => updateGps.mutate(sv));

    // Move vehicles every 3 seconds
    intervalRef.current = setInterval(() => {
      const updated = simRef.current.map((sv) => {
        // Random slight changes to simulate movement
        const headingChange = (Math.random() - 0.5) * 30;
        const newHeading = (sv.heading + headingChange + 360) % 360;
        const speedKmh = 20 + Math.random() * 80;
        // Distance in 3 seconds at speedKmh
        const distKm = (speedKmh / 3600) * 3;
        const distDeg = distKm / 111; // approx km to deg
        const rad = (newHeading * Math.PI) / 180;

        return {
          ...sv,
          lat: sv.lat + Math.cos(rad) * distDeg,
          lng: sv.lng + Math.sin(rad) * distDeg,
          speed: speedKmh,
          heading: newHeading,
          engineOn: true,
        };
      });

      setSimVehicles(updated);
      simRef.current = updated;
      updated.forEach((sv) => updateGps.mutate(sv));
    }, 3000);
  }, [vehicles, selectedVehicleId, updateGps]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSimulating(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-xl">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-300" />
          Simulateur GPS (Test)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Select value={selectedVehicleId} onValueChange={(v) => setSelectedVehicleId(v === "all" ? "" : v)}>
            <SelectTrigger className="flex-1 text-xs">
              <SelectValue placeholder="Tous les véhicules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les véhicules</SelectItem>
              {(vehicles || []).map((v: any) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name} ({v.licensePlate})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={simulating ? stopSimulation : startSimulation}
          className={`w-full ${simulating ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}
          disabled={!vehicles || vehicles.length === 0}
        >
          {simulating ? (
            <>
              <Square className="w-4 h-4 mr-2" /> Arrêter
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" /> Simuler
            </>
          )}
        </Button>

        {simulating && (
          <div className="text-xs space-y-1">
            <Badge className="bg-emerald-500/15 text-emerald-700 border-0 animate-pulse gap-1">
              <Radio className="w-3 h-3" />
              {simVehicles.length} véhicule(s) en simulation
            </Badge>
            {simVehicles.map((sv) => {
              const v = vehicles?.find((v: any) => v.id === sv.vehicleId);
              return (
                <div key={sv.vehicleId} className="flex justify-between text-slate-500 bg-slate-50 px-2 py-1 rounded">
                  <span className="font-medium">{v ? (v as any).name : `#${sv.vehicleId}`}</span>
                  <span>{sv.speed.toFixed(0)} km/h</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
