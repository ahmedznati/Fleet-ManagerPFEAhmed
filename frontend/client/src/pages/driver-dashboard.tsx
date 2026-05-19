import { useMissions } from "@/hooks/use-missions";
import { useDrivers } from "@/hooks/use-drivers";
import { useUser } from "@/hooks/use-user";
import UserLayout from "@/components/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MissionTracker } from "@/components/mission-tracker";
import { GpsTracker } from "@/components/gps-tracker";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, Play, MapPin, Calendar, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useUpdateMissionStatus } from "@/hooks/use-missions";
import { useState } from "react";

export default function DriverDashboard() {
  const { data: missions, isLoading } = useMissions();
  const { data: drivers } = useDrivers();
  const { user } = useUser();
  const updateStatusMutation = useUpdateMissionStatus();
  const [expandedMissionId, setExpandedMissionId] = useState<number | null>(null);

  // Find current driver by matching email
  const currentDriver = drivers?.find(d => d.email === user?.email);
  
  // Debug logging
  console.log('[DRIVER DASHBOARD] Current user:', user);
  console.log('[DRIVER DASHBOARD] All drivers:', drivers);
  console.log('[DRIVER DASHBOARD] Current driver:', currentDriver);
  console.log('[DRIVER DASHBOARD] All missions:', missions);
  
  // Filter missions for current driver
  const myMissions = missions?.filter(m => m.driverId === currentDriver?.id) || [];
  console.log('[DRIVER DASHBOARD] My missions:', myMissions);
  
  const pendingMissions = myMissions.filter(m => m.status === 'pending');
  const inProgressMissions = myMissions.filter(m => m.status === 'in_progress');
  const completedMissions = myMissions.filter(m => m.status === 'completed');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gold-500/15 text-gold-700 border-0",
      in_progress: "bg-amber-500/15 text-amber-700 border-0",
      completed: "bg-emerald-500/15 text-emerald-700 border-0",
      cancelled: "bg-rose-500/15 text-rose-700 border-0",
    };
    
    const labels: Record<string, string> = {
      pending: "En attente",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    
    return (
      <Badge className={variants[status] || "bg-slate-100 text-slate-700 border-0"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-crimson-600 to-crimson-800 rounded-xl p-6 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, {user?.firstName} !
          </h1>
          <p className="text-crimson-100">
            Vous avez {pendingMissions.length} mission{pendingMissions.length !== 1 ? 's' : ''} en attente
            {inProgressMissions.length > 0 && ` et ${inProgressMissions.length} en cours`}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md bg-gradient-to-br from-gold-50 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">En Attente</CardTitle>
                <Clock className="w-5 h-5 text-gold-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gold-600">{pendingMissions.length}</div>
              <p className="text-xs text-slate-500 mt-1">À démarrer</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">En Cours</CardTitle>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{inProgressMissions.length}</div>
              <p className="text-xs text-slate-500 mt-1">Actuellement actives</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Terminées</CardTitle>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{completedMissions.length}</div>
              <p className="text-xs text-slate-500 mt-1">Total complétées</p>
            </CardContent>
          </Card>
        </div>

        {/* GPS Tracker */}
        <GpsTracker />

        {/* Active Missions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Vos Missions Actives</h2>
          
          {isLoading ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">Chargement de vos missions...</p>
              </CardContent>
            </Card>
          ) : myMissions.length === 0 ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center text-slate-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Aucune mission assignée.</p>
                <p className="text-sm mt-2">Revenez plus tard pour de nouvelles affectations.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* In Progress Missions - Show with full tracker */}
              {inProgressMissions.map((mission) => (
                <MissionTracker
                  key={mission.id}
                  mission={{ ...mission, priority: mission.priority || 'normal' }}
                  onStart={() => {}}
                  onComplete={(completionLat, completionLng) => updateStatusMutation.mutate({ id: mission.id, status: 'completed', completionLat, completionLng })}
                  isUpdating={updateStatusMutation.isPending}
                />
              ))}

              {/* Pending Missions - Expandable */}
              {pendingMissions.map((mission) => (
                <div key={mission.id}>
                  {expandedMissionId === mission.id ? (
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between text-slate-600 hover:bg-slate-100"
                        onClick={() => setExpandedMissionId(null)}
                      >
                        <span>Réduire la carte</span>
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <MissionTracker
                        mission={{ ...mission, priority: mission.priority || 'normal' }}
                        onStart={() => updateStatusMutation.mutate({ id: mission.id, status: 'in_progress' })}
                        onComplete={(completionLat, completionLng) => updateStatusMutation.mutate({ id: mission.id, status: 'completed', completionLat, completionLng })}
                        isUpdating={updateStatusMutation.isPending}
                      />
                    </div>
                  ) : (
                    <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{mission.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(mission.status)}
                              {mission.priority && (
                                <Badge variant="outline" className={
                                  mission.priority === 'urgent' ? 'bg-red-100 text-red-600 border-red-200' :
                                  mission.priority === 'high' ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200'
                                }>
                                  {mission.priority === 'urgent' ? 'Urgente' : 
                                   mission.priority === 'high' ? 'Haute' : 
                                   mission.priority === 'low' ? 'Basse' : 'Normale'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {mission.description && (
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                            {mission.description}
                          </p>
                        )}
                        
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-slate-700">Destination :</div>
                            <div className="text-slate-600">{mission.endLocation}</div>
                          </div>
                        </div>

                        {mission.scheduledStart && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 bg-gold-50 p-2 rounded">
                            <Calendar className="w-4 h-4 text-gold-600" />
                            <span>Début prévu : {format(new Date(mission.scheduledStart), "PPp")}</span>
                          </div>
                        )}

                        {/* Co-pilot & Passengers info */}
                        {((mission as any).coPilot || ((mission as any).passengersCount && (mission as any).passengersCount > 1)) && (
                          <div className="flex flex-wrap gap-3 text-xs text-slate-600 bg-blue-50 p-2 rounded">
                            {(mission as any).coPilot && (
                              <span>👤 Co-pilote : <strong>{(mission as any).coPilot}</strong></span>
                            )}
                            {(mission as any).passengersCount > 0 && (
                              <span>👥 {(mission as any).passengersCount} personne(s)</span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={() => setExpandedMissionId(mission.id)}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Voir le Trajet
                          </Button>
                          <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => updateStatusMutation.mutate({ id: mission.id, status: 'in_progress' })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Démarrer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed Missions */}
        {completedMissions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Récemment Terminées</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {completedMissions.slice(0, 4).map((mission) => (
                <Card key={mission.id} className="border-l-4 border-l-emerald-500 shadow-md opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{mission.title}</CardTitle>
                        {getStatusBadge(mission.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-red-400 mt-0.5" />
                      <span className="text-slate-600">Destination: {mission.endLocation}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
