import { useState } from "react";
import { useRoute } from "wouter";
import { useVehicle, useVehicleHistory } from "@/hooks/use-vehicles";
import { useMissions } from "@/hooks/use-missions";
import { useDrivers } from "@/hooks/use-drivers";
import Layout from "@/components/layout";
import { MapView } from "@/components/map-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Gauge, Navigation, MapPin, User, Users, Calendar, AlertCircle, CheckCircle2, XCircle, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow, intervalToDuration, formatDuration } from "date-fns";
import { fr } from "date-fns/locale";

export default function VehicleDetailsPage() {
  const [, params] = useRoute("/vehicles/:id");
  const id = parseInt(params?.id || "0");
  const { data: vehicle, isLoading } = useVehicle(id);
  const { data: history, isLoading: isHistoryLoading } = useVehicleHistory(id);
  const { data: allMissions } = useMissions();
  const { data: drivers } = useDrivers();

  const vehicleMissions = (allMissions || [])
    .filter((m: any) => m.vehicleId === id)
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const activeMission = vehicleMissions.find((m: any) => m.status === "in_progress");

  // Selected mission for the map (defaults to active, then most recent)
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null);
  const [missionPage, setMissionPage] = useState(0);
  const MISSIONS_PER_PAGE = 3;
  const selectedMission =
    vehicleMissions.find((m: any) => m.id === selectedMissionId)
    ?? activeMission
    ?? vehicleMissions[0]
    ?? null;

  // Filter GPS history to the selected mission's time window
  const missionHistory = selectedMission
    ? (history || []).filter((loc: any) => {
        const t = new Date(loc.timestamp || loc.createdAt || 0).getTime();
        const start = selectedMission.actualStart
          ? new Date(selectedMission.actualStart).getTime()
          : selectedMission.scheduledStart
          ? new Date(selectedMission.scheduledStart).getTime()
          : 0;
        const end = selectedMission.actualEnd
          ? new Date(selectedMission.actualEnd).getTime()
          : Date.now();
        return t >= start && t <= end;
      })
    : (history || []);

  const formatMissionDuration = (ms: number) => {
    const d = intervalToDuration({ start: 0, end: ms });
    return formatDuration(d, { format: ["hours", "minutes"], locale: fr }) || "< 1 min";
  };

  const driverMap = new Map((drivers || []).map((d: any) => [d.id, `${d.firstName} ${d.lastName}`]));

  const getMissionStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string; icon: any }> = {
      pending:     { label: "En attente",  className: "bg-amber-100 text-amber-700",   icon: <Clock className="w-3 h-3" /> },
      in_progress: { label: "En cours",    className: "bg-blue-100 text-blue-700",     icon: <AlertCircle className="w-3 h-3" /> },
      completed:   { label: "Terminée",    className: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      cancelled:   { label: "Annulée",     className: "bg-red-100 text-red-600",       icon: <XCircle className="w-3 h-3" /> },
    };
    const s = map[status] || { label: status, className: "bg-slate-100 text-slate-600", icon: null };
    return (
      <Badge className={`border-0 gap-1 ${s.className}`}>
        {s.icon}{s.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </Layout>
    );
  }

  if (!vehicle) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Vehicle Not Found</h2>
          <Link href="/vehicles">
            <Button className="mt-4">Return to Fleet</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/vehicles" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Fleet
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900 flex items-center gap-3">
              {vehicle.name}
              <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'} 
                      className={
                        vehicle.status === 'active' ? 'bg-emerald-500' : 
                        vehicle.status === 'maintenance' ? 'bg-amber-500' : ''
                      }>
                {vehicle.status}
              </Badge>
            </h1>
            <p className="text-slate-500 mt-1">{vehicle.model} • {vehicle.licensePlate}</p>
          </div>
          
          <div className="flex gap-4">
             {/* Future: Add Simulate Movement Button */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map with History Path */}
        <div className="lg:col-span-2">
          <Card className="h-[500px] border-none shadow-md overflow-hidden flex flex-col">
            <CardHeader className="border-b bg-white z-10 relative">
              <CardTitle>
                Historique de route
                {selectedMission && (
                  <span className="text-sm font-normal text-slate-500 ml-2">— {selectedMission.title}</span>
                )}
              </CardTitle>
            </CardHeader>
            <div className="flex-1 relative z-0">
               <MapView 
                 vehicles={[vehicle]} 
                 height="100%" 
                 history={missionHistory}
                 missions={selectedMission ? [selectedMission] : []}
               />
            </div>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Active mission — shown prominently */}
          {activeMission && (
            <Card className="border-2 border-blue-400 shadow-md bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                  Mission en cours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-semibold text-slate-900 text-base">{activeMission.title}</p>
                {activeMission.description && (
                  <p className="text-slate-600 text-xs">{activeMission.description}</p>
                )}
                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{activeMission.endLocation}</span>
                </div>
                {activeMission.driverId && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{driverMap.get(activeMission.driverId) || `Chauffeur #${activeMission.driverId}`}</span>
                  </div>
                )}
                {activeMission.coPilot && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Co-pilote : {activeMission.coPilot}</span>
                  </div>
                )}
                {activeMission.passengersCount && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{activeMission.passengersCount} passager{activeMission.passengersCount > 1 ? "s" : ""}</span>
                  </div>
                )}
                {activeMission.scheduledStart && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Prévu : {format(new Date(activeMission.scheduledStart), "PPp", { locale: fr })}</span>
                  </div>
                )}
                {activeMission.actualStart && (
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <Timer className="w-4 h-4" />
                    <span>
                      Démarrée il y a {formatDistanceToNow(new Date(activeMission.actualStart), { locale: fr })}
                    </span>
                  </div>
                )}
                {activeMission.priority && activeMission.priority !== "normal" && (
                  <Badge className={`text-xs border-0 ${activeMission.priority === "urgent" ? "bg-red-100 text-red-700" : activeMission.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                    {activeMission.priority === "urgent" ? "Urgente" : activeMission.priority === "high" ? "Haute" : activeMission.priority}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Current Speed</p>
                  <p className="text-xl font-bold">
                    {history && history.length > 0 ? history[0].speed?.toFixed(1) || 0 : 0} km/h
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Coordinates</p>
                  <p className="text-sm font-mono font-medium">
                    {vehicle.lat?.toFixed(5)}, {vehicle.lng?.toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Last Update</p>
                  <p className="text-sm font-medium">
                    {vehicle.lastUpdated ? format(new Date(vehicle.lastUpdated), "MMM d, h:mm a") : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mission selector — click to view on map */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                Missions ({vehicleMissions.length})
              </CardTitle>
              <p className="text-xs text-slate-400">Cliquez pour voir le trajet sur la carte</p>
            </CardHeader>
            <CardContent className="p-0">
              {vehicleMissions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Aucune mission pour ce véhicule.</p>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {vehicleMissions.slice(missionPage * MISSIONS_PER_PAGE, (missionPage + 1) * MISSIONS_PER_PAGE).map((m: any) => {
                      const isSelected = selectedMission?.id === m.id;
                      const durationMs =
                        m.actualStart && m.actualEnd
                          ? new Date(m.actualEnd).getTime() - new Date(m.actualStart).getTime()
                          : null;
                      return (
                        <button
                          key={m.id}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${
                            isSelected ? "bg-blue-50 border-l-4 border-blue-500" : "border-l-4 border-transparent"
                          }`}
                          onClick={() => setSelectedMissionId(m.id)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`font-medium text-sm truncate ${isSelected ? "text-blue-700" : "text-slate-900"}`}>
                              {m.title}
                            </p>
                            {getMissionStatusBadge(m.status)}
                          </div>

                          {/* A → B route summary */}
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold shrink-0">A</span>
                            <span className="truncate">{m.startLat ? `${Number(m.startLat).toFixed(4)}, ${Number(m.startLng).toFixed(4)}` : "Départ GPS"}</span>
                            <span className="mx-0.5 text-slate-300">→</span>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold shrink-0">B</span>
                            <span className="truncate">{m.endLocation}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                            {m.driverId && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {driverMap.get(m.driverId) || `#${m.driverId}`}
                              </span>
                            )}
                            {m.actualStart && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(m.actualStart), "d MMM yyyy HH:mm", { locale: fr })}
                              </span>
                            )}
                            {durationMs !== null && (
                              <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {formatMissionDuration(durationMs)}
                              </span>
                            )}
                            {m.distance && (
                              <span>{Number(m.distance).toFixed(1)} km</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {vehicleMissions.length > MISSIONS_PER_PAGE && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={missionPage === 0}
                        onClick={() => setMissionPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Précédent
                      </Button>
                      <span className="text-xs text-slate-400">
                        {missionPage + 1} / {Math.ceil(vehicleMissions.length / MISSIONS_PER_PAGE)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={(missionPage + 1) * MISSIONS_PER_PAGE >= vehicleMissions.length}
                        onClick={() => setMissionPage(p => p + 1)}
                      >
                        Suivant
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative pl-4 border-l-2 border-slate-100">
                {isHistoryLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : history?.slice(0, 5).map((point, i) => (
                  <div key={point.id} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                    <p className="text-sm font-medium text-slate-900">Position Update</p>
                    <p className="text-xs text-slate-500 mb-1">
                      {point.timestamp ? format(new Date(point.timestamp), "h:mm:ss a") : ""}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {point.lat.toFixed(4)}, {point.lng.toFixed(4)} • {point.speed?.toFixed(0)} km/h
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
