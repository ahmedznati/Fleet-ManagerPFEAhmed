import { useMissions, useUpdateMissionStatus, useDeleteMission } from "@/hooks/use-missions";
import { useDrivers } from "@/hooks/use-drivers";
import { useVehicles } from "@/hooks/use-vehicles";
import Layout from "@/components/layout";
import UserLayout from "@/components/user-layout";
import { useUser } from "@/hooks/use-user";
import { MissionForm } from "@/components/mission-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, MapPin, Calendar, AlertCircle, CheckCircle2, Clock, XCircle, Play, Users, User, Edit2, Trash2, MoreHorizontal, History, Filter, X, ShieldCheck, ShieldAlert, Navigation2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Format a duration in ms to a human-readable string
function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}j ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min ${seconds}s`;
  return `${minutes}min ${seconds}s`;
}

// Hook that ticks every second so in-progress durations stay live
function useNow(enabled: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

// Complete a mission by first capturing the driver's current GPS position
function completeMissionWithGps(
  missionId: number,
  mutate: (args: { id: number; status: string; completionLat?: number; completionLng?: number }) => void
) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mutate({ id: missionId, status: 'completed', completionLat: pos.coords.latitude, completionLng: pos.coords.longitude });
      },
      () => {
        // If GPS unavailable, still complete but without coordinates (will be unconfirmed)
        mutate({ id: missionId, status: 'completed' });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    mutate({ id: missionId, status: 'completed' });
  }
}

export default function MissionsPage() {
  const { data: missions, isLoading } = useMissions();
  const { data: drivers } = useDrivers();
  const { data: vehicles } = useVehicles();
  const updateStatusMutation = useUpdateMissionStatus();
  const deleteMutation = useDeleteMission();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [, navigate] = useLocation();

  // Build lookup maps for names
  const driverMap = new Map(drivers?.map(d => [d.id, `${d.firstName} ${d.lastName}`]) || []);
  const vehicleMap = new Map(vehicles?.map(v => [v.id, `${v.name} - ${v.licensePlate} (${v.model})`]) || []);
  const { user, isAdmin, isOperateur, isChauffeur } = useUser();

  const { toast } = useToast();
  const previousMissionsCount = useRef<number>(0);
  
  // Find current driver by matching email
  const currentDriver = drivers?.find(d => d.email === user?.email);
  
  // Filter missions: admin sees all, driver sees only theirs
  const displayMissions = isAdmin 
    ? missions 
    : missions?.filter(m => m.driverId === currentDriver?.id);

  // Tick every second when any mission is in_progress (for live duration)
  const hasInProgress = displayMissions?.some(m => m.status === 'in_progress') ?? (missions?.some(m => m.status === 'in_progress') ?? false);
  const now = useNow(hasInProgress);

  // Driver-specific splits
  const activeMissions = displayMissions?.filter(m => m.status === 'pending' || m.status === 'in_progress') || [];
  const historyMissions = displayMissions?.filter(m => m.status === 'completed' || m.status === 'cancelled') || [];

  // Date + priority filter helper
  const applyDateFilter = (list: typeof historyMissions) => {
    return list.filter(m => {
      const dateRef = m.scheduledStart ? new Date(m.scheduledStart) : null;
      if (dateRef) {
        if (dateFrom && dateRef < new Date(dateFrom)) return false;
        if (dateTo && dateRef > new Date(dateTo + "T23:59:59")) return false;
      }
      if (priorityFilter !== "all" && m.priority !== priorityFilter) return false;
      return true;
    });
  };

  const filteredActiveMissions = applyDateFilter(activeMissions);
  const filteredHistoryMissions = applyDateFilter(historyMissions);

  const clearFilter = () => { setDateFrom(""); setDateTo(""); setPriorityFilter("all"); };
  const hasFilter = dateFrom || dateTo || priorityFilter !== "all";

  // Notification system for new missions assigned to driver
  useEffect(() => {
    if (!isAdmin && displayMissions && currentDriver) {
      const currentCount = displayMissions.length;
      if (previousMissionsCount.current > 0 && currentCount > previousMissionsCount.current) {
        const newMissions = currentCount - previousMissionsCount.current;
        toast({
          title: "🎯 Nouvelle Mission Assignée !",
          description: `Vous avez ${newMissions} nouvelle${newMissions > 1 ? 's' : ''} mission${newMissions > 1 ? 's' : ''} assignée${newMissions > 1 ? 's' : ''}.`,
          duration: 5000,
        });
      }
      previousMissionsCount.current = currentCount;
    }
  }, [displayMissions, isAdmin, currentDriver, toast]);

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: <Clock className="w-4 h-4" />,
      in_progress: <AlertCircle className="w-4 h-4" />,
      completed: <CheckCircle2 className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
    };
    return icons[status];
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gold-500/15 text-gold-700 hover:bg-gold-500/25",
      in_progress: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25",
      completed: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
      cancelled: "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    return (
      <Badge className={`border-0 font-medium flex items-center gap-1 ${variants[status] || "bg-slate-100 text-slate-700"}`}>
        {getStatusIcon(status)}
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: "bg-slate-100 text-slate-600",
      normal: "bg-gold-100 text-gold-600",
      high: "bg-orange-100 text-orange-600",
      urgent: "bg-red-100 text-red-600",
    };
    const labels: Record<string, string> = {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente",
    };
    return (
      <Badge variant="outline" className={variants[priority] || "bg-slate-100"}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const getConfirmationBadge = (mission: any) => {
    if (mission.status !== 'completed') return null;
    if (mission.confirmedCompletion) {
      return (
        <Badge className="border-0 font-medium flex items-center gap-1 bg-emerald-500/15 text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5" />
          Confirmée
        </Badge>
      );
    }
    return (
      <Badge className="border-0 font-medium flex items-center gap-1 bg-amber-500/15 text-amber-700">
        <ShieldAlert className="w-3.5 h-3.5" />
        Non confirmée
      </Badge>
    );
  };

  // Reusable mission card for driver view
  const DriverMissionCard = ({ mission, showActions = true }: { mission: any; showActions?: boolean }) => (
    <Card key={mission.id} className={`border-none shadow-md hover:shadow-lg transition-shadow ${mission.status === 'completed' ? 'opacity-80' : ''} ${mission.status === 'cancelled' ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{mission.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(mission.status)}
              {mission.priority && getPriorityBadge(mission.priority)}
              {getConfirmationBadge(mission)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mission.description && (
          <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">{mission.description}</p>
        )}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-slate-700">Destination :</div>
            <div className="text-slate-600">{mission.endLocation}</div>
          </div>
        </div>
        {mission.scheduledStart && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{format(new Date(mission.scheduledStart), "PPp", { locale: fr })}</span>
          </div>
        )}
        {/* Mission duration */}
        {(mission.status === 'in_progress' || mission.status === 'completed' || mission.status === 'cancelled') && (mission as any).actualStart && (
          <div className={`flex items-center gap-2 text-sm font-medium ${
            mission.status === 'in_progress' ? 'text-amber-700' : 'text-slate-600'
          }`}>
            <Timer className="w-4 h-4" />
            <span>
              Durée : {formatDuration(
                (mission as any).actualEnd
                  ? new Date((mission as any).actualEnd).getTime() - new Date((mission as any).actualStart).getTime()
                  : now - new Date((mission as any).actualStart).getTime()
              )}
              {mission.status === 'in_progress' && <span className="ml-1 animate-pulse">●</span>}
            </span>
          </div>
        )}
        {((mission as any).coPilot || (mission as any).passengersCount) && (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            {(mission as any).coPilot && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Co-pilote : {(mission as any).coPilot}
              </span>
            )}
            {(mission as any).passengersCount && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {(mission as any).passengersCount} passager{(mission as any).passengersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-slate-500">
            {vehicleMap.get(mission.vehicleId) || `Véhicule #${mission.vehicleId}`}
          </div>
          {showActions && isChauffeur && (
            <div className="flex gap-2">
              {mission.status === 'pending' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'in_progress' })}
                  disabled={updateStatusMutation.isPending}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Démarrer
                </Button>
              )}
              {mission.status === 'in_progress' && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => completeMissionWithGps(mission.id, updateStatusMutation.mutate)}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Terminer
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const LayoutWrapper = isAdmin ? Layout : UserLayout;

  // ─── ADMIN / OPERATEUR VIEW (unchanged) ──────────────────────────────────
  if (isAdmin || isOperateur) {
    return (
      <LayoutWrapper>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900">Missions</h1>
            <p className="text-slate-500 mt-2">Gérez et suivez toutes les missions.</p>
          </div>
          {isOperateur && (
            <MissionForm trigger={
              <Button>
                <ClipboardList className="w-4 h-4 mr-2" />
                Créer une Mission
              </Button>
            } />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="border-none shadow-md">
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent><Skeleton className="h-32 w-full" /></CardContent>
              </Card>
            ))
          ) : missions?.length === 0 ? (
            <Card className="border-none shadow-md col-span-2">
              <CardContent className="py-12 text-center text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Aucune mission trouvée. Créez votre première mission pour commencer.</p>
              </CardContent>
            </Card>
          ) : (
            displayMissions?.map((mission) => (
              <Card key={mission.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{mission.title}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(mission.status)}
                        {mission.priority && getPriorityBadge(mission.priority)}
                        {getConfirmationBadge(mission)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mission.description && (
                    <p className="text-sm text-slate-600">{mission.description}</p>
                  )}
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-700">Destination :</div>
                      <div className="text-slate-600">{mission.endLocation}</div>
                    </div>
                  </div>
                  {mission.scheduledStart && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Prévu : {format(new Date(mission.scheduledStart), "PPp", { locale: fr })}</span>
                    </div>
                  )}
                  {/* Mission duration */}
                  {(mission.status === 'in_progress' || mission.status === 'completed' || mission.status === 'cancelled') && (mission as any).actualStart && (
                    <div className={`flex items-center gap-2 text-sm font-medium ${
                      mission.status === 'in_progress' ? 'text-amber-700' : 'text-slate-600'
                    }`}>
                      <Timer className="w-4 h-4" />
                      <span>
                        Durée : {formatDuration(
                          (mission as any).actualEnd
                            ? new Date((mission as any).actualEnd).getTime() - new Date((mission as any).actualStart).getTime()
                            : now - new Date((mission as any).actualStart).getTime()
                        )}
                        {mission.status === 'in_progress' && <span className="ml-1 animate-pulse">●</span>}
                      </span>
                    </div>
                  )}
                  {((mission as any).coPilot || (mission as any).passengersCount) && (
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      {(mission as any).coPilot && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Co-pilote : {(mission as any).coPilot}
                        </span>
                      )}
                      {(mission as any).passengersCount && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {(mission as any).passengersCount} passager{(mission as any).passengersCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-xs text-slate-500">
                      {vehicleMap.get(mission.vehicleId) || `Véhicule #${mission.vehicleId}`} • {driverMap.get(mission.driverId) || `Chauffeur #${mission.driverId}`}
                    </div>
                    <div className="flex gap-2 items-center">
                      {mission.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={(e) => { e.stopPropagation(); navigate(`/live-map?vehicleId=${mission.vehicleId}`); }}
                        >
                          <Navigation2 className="w-3 h-3 mr-1" />
                          Voir en direct
                        </Button>
                      )}
                      {isChauffeur && mission.status === 'pending' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'in_progress' })}>
                          <Play className="w-3 h-3 mr-1" />Démarrer
                        </Button>
                      )}
                      {isChauffeur && mission.status === 'in_progress' && (
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => completeMissionWithGps(mission.id, updateStatusMutation.mutate)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />Terminer
                        </Button>
                      )}
                      {isOperateur && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(mission.status === 'pending' || mission.status === 'in_progress') && (
                              <MissionForm mission={mission as any} trigger={
                                <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100">
                                  <Edit2 className="mr-2 h-4 w-4" /> Modifier
                                </div>
                              } />
                            )}
                            {mission.status === 'pending' && (
                              <DropdownMenuItem className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 cursor-pointer"
                                onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'cancelled' })}>
                                <XCircle className="mr-2 h-4 w-4" /> Annuler la mission
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onClick={() => setDeleteTarget({ id: mission.id, title: mission.title })}>
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la mission</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer la mission « {deleteTarget?.title} » ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                onClick={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } }}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </LayoutWrapper>
    );
  }

  // ─── DRIVER VIEW (new tabbed layout) ─────────────────────────────────────
  return (
    <UserLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Missions</h1>
          <p className="text-slate-500 mt-1">Consultez et mettez à jour vos missions assignées.</p>
        </div>
        {/* Date filter toggle */}
        <Button
          variant={showFilter ? "default" : "outline"}
          size="sm"
          className="gap-2 self-start md:self-auto"
          onClick={() => setShowFilter(v => !v)}
        >
          <Filter className="w-4 h-4" />
          Filtrer par date
          {hasFilter && <span className="ml-1 bg-crimson-600 text-white text-xs rounded-full px-1.5 py-0.5">•</span>}
        </Button>
      </div>

      {/* Date filter panel */}
      {showFilter && (
        <Card className="border border-slate-200 shadow-sm mb-6">
          <CardContent className="py-4 space-y-4">
            {/* Date range */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-slate-500">Date de début</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-slate-500">Date de fin</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
              {hasFilter && (
                <Button variant="ghost" size="sm" className="text-slate-500 gap-1" onClick={clearFilter}>
                  <X className="w-4 h-4" />
                  Effacer tout
                </Button>
              )}
            </div>

            {/* Priority filter */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Priorité</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "Toutes", className: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200" },
                  { value: "urgent", label: "🔴 Urgente", className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
                  { value: "high", label: "🟠 Haute", className: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200" },
                  { value: "normal", label: "🟡 Normale", className: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200" },
                  { value: "low", label: "⚪ Basse", className: "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPriorityFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${opt.className} ${
                      priorityFilter === opt.value ? "ring-2 ring-offset-1 ring-slate-400 font-bold" : "opacity-70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {hasFilter && (
              <p className="text-xs text-slate-400">
                Filtre actif :{" "}
                {dateFrom ? format(new Date(dateFrom), "dd/MM/yyyy") : "—"} → {dateTo ? format(new Date(dateTo), "dd/MM/yyyy") : "—"}
                {priorityFilter !== "all" && ` · Priorité : ${priorityFilter === "urgent" ? "Urgente" : priorityFilter === "high" ? "Haute" : priorityFilter === "normal" ? "Normale" : "Basse"}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="active" className="flex items-center gap-2 flex-1 sm:flex-none">
            <ClipboardList className="w-4 h-4" />
            Mes Missions
            {activeMissions.length > 0 && (
              <span className="ml-1 bg-crimson-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {activeMissions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 flex-1 sm:flex-none">
            <History className="w-4 h-4" />
            Historique
            {historyMissions.length > 0 && (
              <span className="ml-1 bg-slate-400 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {historyMissions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Onglet Mes Missions (pending + in_progress) ── */}
        <TabsContent value="active">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="border-none shadow-md">
                  <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                  <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : filteredActiveMissions.length === 0 ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-16 text-center text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="font-medium">
                  {hasFilter ? "Aucune mission ne correspond à ce filtre." : "Aucune mission active pour le moment."}
                </p>
                <p className="text-sm mt-2 text-slate-400">
                  {!hasFilter && "Revenez plus tard pour de nouvelles affectations."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* In progress first */}
              {filteredActiveMissions.filter(m => m.status === 'in_progress').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> En cours
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredActiveMissions.filter(m => m.status === 'in_progress').map(m => (
                      <div key={m.id}><DriverMissionCard mission={m} /></div>
                    ))}
                  </div>
                </div>
              )}
              {/* Pending */}
              {filteredActiveMissions.filter(m => m.status === 'pending').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gold-700 uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-4 h-4" /> En attente
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredActiveMissions.filter(m => m.status === 'pending').map(m => (
                      <div key={m.id}><DriverMissionCard mission={m} /></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Onglet Historique (completed + cancelled) ── */}
        <TabsContent value="history">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="border-none shadow-md">
                  <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                  <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : filteredHistoryMissions.length === 0 ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-16 text-center text-slate-500">
                <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="font-medium">
                  {hasFilter ? "Aucune mission ne correspond à ce filtre." : "Aucun historique de missions."}
                </p>
                <p className="text-sm mt-2 text-slate-400">
                  {!hasFilter && "Les missions terminées ou annulées apparaîtront ici."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Completed */}
              {filteredHistoryMissions.filter(m => m.status === 'completed').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Terminées ({filteredHistoryMissions.filter(m => m.status === 'completed').length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredHistoryMissions.filter(m => m.status === 'completed').map(m => (
                      <div key={m.id}><DriverMissionCard mission={m} showActions={false} /></div>
                    ))}
                  </div>
                </div>
              )}
              {/* Cancelled */}
              {filteredHistoryMissions.filter(m => m.status === 'cancelled').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-rose-700 uppercase tracking-wide flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Annulées ({filteredHistoryMissions.filter(m => m.status === 'cancelled').length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredHistoryMissions.filter(m => m.status === 'cancelled').map(m => (
                      <div key={m.id}><DriverMissionCard mission={m} showActions={false} /></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </UserLayout>
  );
}
