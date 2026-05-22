import { useState } from "react";
import { useVehicles } from "@/hooks/use-vehicles";
import { useGpsPositions, useGpsWebSocket } from "@/hooks/use-gps-tracking";
import { useMissions } from "@/hooks/use-missions";
import { useUser } from "@/hooks/use-user";
import Layout from "@/components/layout";
import { MapView } from "@/components/map-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Car, Navigation, Gauge, Power, RefreshCw, MapPin, Satellite, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function LiveMapPage() {
  const { data: vehicles } = useVehicles();
  // Open a WebSocket so GPS updates are pushed in real time
  const { status: wsStatus } = useGpsWebSocket();
  // Enable polling fallback when WebSocket is disconnected
  const { data: gpsPositions } = useGpsPositions(wsStatus !== "connected");
  const { data: missions } = useMissions();
  const { isSuperAdmin } = useUser();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  // Set of vehicleIds that have an in-progress mission
  const onMissionVehicleIds = new Set(
    (missions || [])
      .filter((m: any) => m.status === "in_progress")
      .map((m: any) => m.vehicleId)
  );

  // Merge GPS positions into vehicles for map rendering
  const vehiclesWithGps = (vehicles || []).map((v: any) => {
    const gps = (gpsPositions || []).find((g: any) => g.vehicleId === v.id);
    const isOnMission = onMissionVehicleIds.has(v.id);
    if (gps) {
      return {
        ...v,
        lat: gps.lat,
        lng: gps.lng,
        speed: gps.speed,
        heading: gps.heading,
        engineOn: gps.engineOn,
        lastUpdated: gps.updatedAt,
        isOnMission,
      };
    }
    return { ...v, isOnMission };
  });

  const trackedCount = vehiclesWithGps.filter((v: any) => v.isOnMission).length;
  const enginesOn = (gpsPositions || []).filter((g: any) => g.engineOn).length;

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900 flex items-center gap-3">
              <Satellite className="w-8 h-8 text-crimson-500" />
              Suivi GPS en Direct
            </h1>
            <p className="text-slate-500 mt-1">
              {isSuperAdmin ? "Consultation en temps réel de la flotte." : "Suivez vos véhicules en temps réel."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2 py-1.5 px-3">
              <MapPin className="w-4 h-4 text-emerald-500" />
              {trackedCount} véhicule(s) suivi(s)
            </Badge>
            <Badge variant="outline" className="gap-2 py-1.5 px-3">
              <Power className="w-4 h-4 text-blue-500" />
              {enginesOn} moteur(s) en marche
            </Badge>
            <div className="flex items-center gap-1 text-xs">
              {wsStatus === "connected" ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Temps réel</span>
                </>
              ) : wsStatus === "connecting" ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                  <span className="text-amber-600">Connexion…</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-red-500">Hors ligne</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Map + Vehicle Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "calc(100vh - 14rem)" }}>
          {/* Vehicle List Panel */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
          <Card className="border-0 shadow-lg overflow-hidden flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-xl shrink-0">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Car className="w-4 h-4 text-gold-400" />
                Véhicules ({vehiclesWithGps.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="divide-y divide-slate-100">
                  {vehiclesWithGps.map((vehicle: any) => {
                    const gps = (gpsPositions || []).find((g: any) => g.vehicleId === vehicle.id);
                    const isSelected = selectedVehicleId === vehicle.id;
                    const isOnMission = vehicle.isOnMission;
                    
                    return (
                      <button
                        key={vehicle.id}
                        className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${isSelected ? "bg-crimson-50 border-l-4 border-crimson-500" : ""}`}
                        onClick={() => setSelectedVehicleId(vehicle.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-slate-900 truncate pr-2">{vehicle.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isOnMission && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            )}
                            {isOnMission ? (
                              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-0 whitespace-nowrap">
                                En ligne
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] bg-slate-200 text-slate-500 border-0 whitespace-nowrap">
                                Hors ligne
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{vehicle.licensePlate}</p>
                        
                        {gps && (
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              {gps.speed?.toFixed(0) || 0} km/h
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="w-3 h-3" style={{ transform: `rotate(${gps.heading || 0}deg)` }} />
                              {gps.heading?.toFixed(0) || 0}°
                            </span>
                            <span className={`flex items-center gap-1 ${gps.engineOn ? "text-emerald-600" : "text-red-500"}`}>
                              <Power className="w-3 h-3" />
                              {gps.engineOn ? "ON" : "OFF"}
                            </span>
                          </div>
                        )}
                        
                        {gps && gps.updatedAt && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Mis à jour {formatDistanceToNow(new Date(gps.updatedAt), { addSuffix: true })}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {vehiclesWithGps.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Aucun véhicule
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          </div>

          {/* Map */}
          <div className="lg:col-span-3 rounded-xl overflow-hidden shadow-2xl border border-slate-200">
            <MapView 
              vehicles={vehiclesWithGps} 
              selectedVehicleId={selectedVehicleId || undefined}
              height="100%" 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

