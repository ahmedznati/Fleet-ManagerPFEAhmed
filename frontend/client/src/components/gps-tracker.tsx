import { useState, useEffect, useRef, useCallback } from "react";
import { useUpdateGpsPosition } from "@/hooks/use-gps-tracking";
import { useVehicles } from "@/hooks/use-vehicles";
import { useDrivers } from "@/hooks/use-drivers";
import { useMissions } from "@/hooks/use-missions";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, Gauge, Radio, RadioTower, AlertTriangle } from "lucide-react";

/**
 * GPS Tracker panel for drivers.
 * Automatically starts/stops GPS tracking when the driver starts/ends a mission.
 * No manual toggle — tracking is tied to mission status.
 */
export function GpsTracker() {
  const { user } = useUser();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: missions } = useMissions();
  const updateGps = useUpdateGpsPosition();

  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number; speed: number; heading: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const trackingRef = useRef(false);

  // Find the driver and their in-progress missions
  const currentDriver = drivers?.find((d: any) => d.email === user?.email);
  const myActiveMissions = (missions || []).filter(
    (m: any) => m.driverId === currentDriver?.id && m.status === "in_progress"
  );
  const hasActiveMission = myActiveMissions.length > 0;

  // Find the vehicle for the active mission
  const activeMission = myActiveMissions[0];
  const missionVehicle = activeMission
    ? vehicles?.find((v: any) => v.id === activeMission.vehicleId)
    : null;

  const sendPosition = useCallback(
    (position: GeolocationPosition) => {
      if (!missionVehicle) return;

      const data = {
        vehicleId: missionVehicle.id,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: (position.coords.speed ?? 0) * 3.6, // m/s → km/h
        heading: position.coords.heading ?? 0,
        engineOn: true,
      };

      setLastPosition({
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        heading: data.heading,
      });

      updateGps.mutate(data);
      setSendCount((c) => c + 1);
      setError(null);
    },
    [missionVehicle, updateGps],
  );

  // Auto-start/stop tracking based on mission status
  useEffect(() => {
    if (hasActiveMission && missionVehicle && !trackingRef.current) {
      // Start tracking
      if (!navigator.geolocation) {
        setError("La géolocalisation n'est pas supportée par votre navigateur.");
        return;
      }

      trackingRef.current = true;
      setError(null);

      navigator.geolocation.getCurrentPosition(sendPosition, (err) => {
        setError(`Erreur GPS : ${err.message}`);
      });

      watchIdRef.current = navigator.geolocation.watchPosition(
        sendPosition,
        (err) => {
          setError(`Erreur GPS : ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        },
      );
    } else if (!hasActiveMission && trackingRef.current) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      trackingRef.current = false;
    }
  }, [hasActiveMission, missionVehicle, sendPosition]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Don't render if no driver record
  if (!currentDriver) return null;

  // No active mission — show idle message
  if (!hasActiveMission) {
    return (
      <Card className="border-none shadow-md bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RadioTower className="w-4 h-4 text-slate-400" />
            Suivi GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 text-sm py-3">
            <Radio className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            <p>GPS inactif — pas de mission en cours.</p>
            <p className="text-xs mt-1">Le suivi démarre automatiquement lorsque vous lancez une mission.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RadioTower className="w-4 h-4 text-blue-600" />
            Suivi GPS — {missionVehicle?.name || "Véhicule"}
          </CardTitle>
          <Badge className="bg-emerald-500/15 text-emerald-700 border-0 animate-pulse">
            En cours
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          Mission : <strong>{activeMission?.title}</strong>
        </div>

        {/* Position info */}
        {lastPosition && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>
                {lastPosition.lat.toFixed(5)}, {lastPosition.lng.toFixed(5)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Gauge className="w-4 h-4 text-blue-500" />
              <span>{lastPosition.speed.toFixed(0)} km/h</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Navigation className="w-4 h-4 text-emerald-500" style={{ transform: `rotate(${lastPosition.heading}deg)` }} />
              <span>{lastPosition.heading.toFixed(0)}°</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Radio className="w-4 h-4 text-purple-500" />
              <span>{sendCount} envois</span>
            </div>
          </div>
        )}

        {!lastPosition && !error && (
          <div className="text-center text-slate-400 text-xs py-2">
            <Radio className="w-4 h-4 mx-auto mb-1 animate-pulse" />
            Acquisition du signal GPS...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 p-2 rounded flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
