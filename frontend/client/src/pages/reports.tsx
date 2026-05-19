import { useVehicles } from "@/hooks/use-vehicles";
import { useMissions } from "@/hooks/use-missions";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: missions, isLoading: missionsLoading } = useMissions();

  const isLoading = vehiclesLoading || missionsLoading;

  // Calculate vehicle statistics
  const getVehicleStats = () => {
    if (!vehicles || !missions) return [];

    return vehicles.map(vehicle => {
      const vehicleMissions = missions.filter(m => m.vehicleId === vehicle.id);
      const completedMissions = vehicleMissions.filter(m => m.status === 'completed');
      const inProgressMissions = vehicleMissions.filter(m => m.status === 'in_progress');
      // Calculate utilization (missions / total time)
      const utilizationRate = vehicleMissions.length > 0 
        ? Math.round((completedMissions.length / vehicleMissions.length) * 100) 
        : 0;

      return {
        ...vehicle,
        totalMissions: vehicleMissions.length,
        completedMissions: completedMissions.length,
        inProgressMissions: inProgressMissions.length,
        utilizationRate,
      };
    });
  };

  const vehicleStats = getVehicleStats();

  // Calculate overall fleet statistics
  const fleetStats = {
    totalVehicles: vehicles?.length || 0,
    activeVehicles: vehicles?.filter(v => v.status === 'active').length || 0,
    maintenanceVehicles: vehicles?.filter(v => v.status === 'maintenance').length || 0,
    totalMissions: missions?.length || 0,
    completedMissions: missions?.filter(m => m.status === 'completed').length || 0,
    avgUtilization: vehicleStats.length > 0 
      ? Math.round(vehicleStats.reduce((sum, v) => sum + v.utilizationRate, 0) / vehicleStats.length)
      : 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-700",
      maintenance: "bg-amber-500/15 text-amber-700",
      on_mission: "bg-blue-500/15 text-blue-700",
    };
    
    return (
      <Badge className={`border-0 ${variants[status] || "bg-slate-100 text-slate-700"}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 font-semibold";
    if (rate >= 50) return "text-blue-600 font-medium";
    if (rate >= 30) return "text-amber-600";
    return "text-slate-500";
  };


  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Rapports & Analyses</h1>
          <p className="text-slate-500 mt-2">
            Statistiques d'utilisation et de performance des véhicules
          </p>
        </div>

        {/* Fleet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Total Véhicules</CardTitle>
                <BarChart3 className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleetStats.totalVehicles}</div>
              <p className="text-xs text-slate-500 mt-1">
                {fleetStats.activeVehicles} actif(s), {fleetStats.maintenanceVehicles} en maintenance
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Total Missions</CardTitle>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleetStats.totalMissions}</div>
              <p className="text-xs text-slate-500 mt-1">
                {fleetStats.completedMissions} terminée(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Utilisation de la Flotte</CardTitle>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleetStats.avgUtilization}%</div>
              <p className="text-xs text-slate-500 mt-1">
                Taux d'achèvement moyen
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Taux de Réussite</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fleetStats.totalMissions > 0 
                  ? Math.round((fleetStats.completedMissions / fleetStats.totalMissions) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Taux d'achèvement des missions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Performance Table */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Détails des Performances des Véhicules</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-center">Total Missions</TableHead>
                    <TableHead className="text-center">Terminées</TableHead>
                    <TableHead className="text-center">En Cours</TableHead>
                    <TableHead className="text-center">Utilisation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Aucune donnée de véhicule disponible
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicleStats.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{vehicle.name}</div>
                            <div className="text-xs text-slate-500">{vehicle.licensePlate}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                        <TableCell className="text-center">{vehicle.totalMissions}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {vehicle.completedMissions}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3 text-blue-600" />
                            {vehicle.inProgressMissions}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={getUtilizationColor(vehicle.utilizationRate)}>
                            {vehicle.utilizationRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
