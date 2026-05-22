import { useState } from "react";
import { useDrivers, useDeleteDriver, useUpdateDriver } from "@/hooks/use-drivers";
import { useVehicles } from "@/hooks/use-vehicles";
import { useMissions } from "@/hooks/use-missions";
import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-user";
import { DriverForm } from "@/components/driver-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit2, Trash2, Phone, Mail, MoreHorizontal, UserX, ClipboardList, MapPin, Calendar, Timer, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format, intervalToDuration, formatDuration } from "date-fns";
import { fr } from "date-fns/locale";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();
  const { data: vehicles } = useVehicles();
  const { data: allMissions } = useMissions();
  const deleteMutation = useDeleteDriver();
  const updateMutation = useUpdateDriver();
  const { isAdmin, isOperateur } = useUser();
  const [historyDriver, setHistoryDriver] = useState<any>(null);

  const driverMissions = historyDriver
    ? (allMissions || [])
        .filter((m: any) => m.driverId === historyDriver.id)
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : [];

  const handleFireDriver = (driver: any) => {
    updateMutation.mutate({
      id: driver.id,
      status: "inactive",
    });
  };

  const getMissionStatusInfo = (status: string) => {
    const map: Record<string, { label: string; className: string; icon: any }> = {
      pending:     { label: "En attente",  className: "bg-amber-100 text-amber-700",     icon: <Clock className="w-3 h-3" /> },
      in_progress: { label: "En cours",    className: "bg-blue-100 text-blue-700",       icon: <AlertCircle className="w-3 h-3" /> },
      completed:   { label: "Terminée",    className: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      cancelled:   { label: "Annulée",     className: "bg-red-100 text-red-600",         icon: <XCircle className="w-3 h-3" /> },
    };
    return map[status] || { label: status, className: "bg-slate-100 text-slate-600", icon: null };
  };

  const formatMissionDuration = (ms: number) => {
    const d = intervalToDuration({ start: 0, end: ms });
    return formatDuration(d, { format: ["hours", "minutes"], locale: fr }) || "< 1 min";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
      inactive: "bg-red-500/15 text-red-700 hover:bg-red-500/25",
      on_leave: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25",
    };
    const labels: Record<string, string> = {
      active: "Actif",
      inactive: "Inactif",
      on_leave: "En congé",
    };

    return (
      <Badge className={`border-0 font-medium ${variants[status] || "bg-slate-100 text-slate-700"}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Chauffeurs</h1>
          <p className="text-slate-500 mt-2">
            {isOperateur ? "Gérez les chauffeurs et leurs affectations." : "Consultez tous les chauffeurs."}
          </p>
        </div>
        {isOperateur && (
          <DriverForm />
        )}
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100">
          <CardTitle>Tous les Chauffeurs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Permis</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Véhicule Assigné</TableHead>
                <TableHead>Inscrit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    {isOperateur && <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : drivers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    Aucun chauffeur trouvé. Ajoutez votre premier chauffeur pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                drivers?.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-blue-100 shadow-sm">
                          <AvatarImage src={(driver as any).profileImageUrl || undefined} alt={`${driver.firstName} ${driver.lastName}`} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                            {driver.firstName[0]}{driver.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{driver.firstName} {driver.lastName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {driver.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {driver.phoneNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{driver.licenseNumber}</TableCell>
                    <TableCell>{getStatusBadge(driver.status)}</TableCell>
                    <TableCell className="text-slate-600">
                      {driver.assignedVehicleId ? (() => {
                        const v = vehicles?.find((v: any) => v.id === driver.assignedVehicleId);
                        return v ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-800">{v.name}</div>
                            <div className="text-xs text-slate-500">{v.model} • {v.licensePlate}</div>
                          </div>
                        ) : `Véhicule #${driver.assignedVehicleId}`;
                      })() : (
                        <span className="text-slate-400 italic">Non assigné</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {driver.createdAt ? formatDistanceToNow(new Date(driver.createdAt), { addSuffix: true }) : "Inconnu"}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir le menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setHistoryDriver(driver)}
                            >
                              <ClipboardList className="mr-2 h-4 w-4 text-blue-500" /> Historique des Missions
                            </DropdownMenuItem>
                            {isOperateur && (
                              <>
                                <DropdownMenuSeparator />
                                <DriverForm 
                                  driver={driver} 
                                  trigger={
                                    <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-slate-100">
                                      <Edit2 className="mr-2 h-4 w-4" /> Modifier les Détails
                                    </div>
                                  } 
                                />
                                <DropdownMenuSeparator />
                                {driver.status === 'active' && (
                                  <DropdownMenuItem 
                                    className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 cursor-pointer"
                                    onClick={() => handleFireDriver(driver)}
                                  >
                                    <UserX className="mr-2 h-4 w-4" /> Licencier le Chauffeur
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                  onClick={() => deleteMutation.mutate(driver.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer du Système
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Driver mission history sheet */}
      <Sheet open={!!historyDriver} onOpenChange={(open) => !open && setHistoryDriver(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-blue-100">
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {historyDriver?.firstName?.[0]}{historyDriver?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle>{historyDriver?.firstName} {historyDriver?.lastName}</SheetTitle>
                <SheetDescription>
                  {driverMissions.length} mission{driverMissions.length !== 1 ? "s" : ""} au total
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-3">
              {driverMissions.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Aucune mission pour ce chauffeur</p>
                </div>
              ) : (
                driverMissions.map((mission: any) => {
                  const statusInfo = getMissionStatusInfo(mission.status);
                  const vehicle = vehicles?.find((v: any) => v.id === mission.vehicleId);
                  const durationMs =
                    mission.actualStart && mission.actualEnd
                      ? new Date(mission.actualEnd).getTime() - new Date(mission.actualStart).getTime()
                      : mission.actualStart && mission.status === "in_progress"
                      ? Date.now() - new Date(mission.actualStart).getTime()
                      : null;
                  return (
                    <div key={mission.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
                      {/* Title + status */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{mission.title}</p>
                        <Badge className={`border-0 gap-1 shrink-0 ${statusInfo.className}`}>
                          {statusInfo.icon}{statusInfo.label}
                        </Badge>
                      </div>

                      {/* Description */}
                      {mission.description && (
                        <p className="text-sm text-slate-600">{mission.description}</p>
                      )}

                      {/* Destination */}
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <span>{mission.endLocation}</span>
                      </div>

                      {/* Vehicle */}
                      {vehicle && (
                        <div className="text-xs text-slate-500">
                          {vehicle.name} • {vehicle.model} • {vehicle.licensePlate}
                        </div>
                      )}

                      {/* Dates + duration */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t pt-2">
                        {mission.scheduledStart && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Prévu : {format(new Date(mission.scheduledStart), "d MMM yyyy HH:mm", { locale: fr })}
                          </span>
                        )}
                        {mission.actualStart && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            Démarré : {format(new Date(mission.actualStart), "d MMM yyyy HH:mm", { locale: fr })}
                          </span>
                        )}
                        {mission.actualEnd && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-500" />
                            Terminé : {format(new Date(mission.actualEnd), "d MMM yyyy HH:mm", { locale: fr })}
                          </span>
                        )}
                        {durationMs !== null && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            Durée : {formatMissionDuration(durationMs)}
                            {mission.status === "in_progress" && <span className="animate-pulse ml-0.5">●</span>}
                          </span>
                        )}
                        {mission.distance && (
                          <span>Distance : {Number(mission.distance).toFixed(1)} km</span>
                        )}
                      </div>

                      {/* Notes */}
                      {mission.notes && (
                        <p className="text-xs text-slate-500 italic border-t pt-2">{mission.notes}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
