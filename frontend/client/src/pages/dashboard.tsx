import { useVehicles } from "@/hooks/use-vehicles";
import { useUser } from "@/hooks/use-user";
import { MapView } from "@/components/map-view";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Car, Shield, User, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: vehicles, isLoading } = useVehicles();
  const { user, isAdmin, isSuperAdmin, isOperateur } = useUser();

  const roleLabel = isSuperAdmin ? "Super Admin" : isOperateur ? "Opérateur" : "Chauffeur";

  const activeVehicles = vehicles?.filter(v => v.status === "active").length || 0;
  const maintenanceVehicles = vehicles?.filter(v => v.status === "maintenance").length || 0;
  const totalVehicles = vehicles?.length || 0;

  const stats = [
    { title: "Flotte Totale", value: totalVehicles, icon: Car, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Véhicules Actifs", value: activeVehicles, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "En Maintenance", value: maintenanceVehicles, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  const pieData = [
    { name: 'Actif', value: activeVehicles, color: '#10b981' },
    { name: 'Maintenance', value: maintenanceVehicles, color: '#f59e0b' },
    { name: 'Inactif', value: totalVehicles - activeVehicles - maintenanceVehicles, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold font-display text-slate-900">Tableau de Bord</h1>
            {user && (
              <Badge variant={isAdmin ? "default" : "secondary"} className="flex items-center gap-1">
                {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {roleLabel}
              </Badge>
            )}
          </div>
          <p className="text-slate-500">
            {isAdmin 
              ? "Aperçu en temps réel de l'état et de la position de votre flotte. Accès complet à la gestion."
              : "Suivez les véhicules et consultez l'état de la flotte."}
          </p>
        </div>
      </div>

      {isSuperAdmin && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Vous êtes connecté en tant que Super Admin. Vous pouvez consulter la flotte et gérer les utilisateurs.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center p-6">
              <div className={`p-4 rounded-xl ${stat.bg} mr-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-md h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle>Carte de la Flotte en Direct</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              {isLoading ? (
                <Skeleton className="w-full h-full rounded-b-xl" />
              ) : (
                <div className="absolute inset-0">
                  <MapView vehicles={vehicles} height="100%" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fleet Status */}
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Distribution du Statut de la Flotte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-slate-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 text-white border-none shadow-md">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Besoin d'Aide ?</h3>
              <p className="text-slate-400 text-sm mb-4">
                Contactez notre équipe de support pour toute assistance concernant le suivi des véhicules ou la planification de maintenance.
              </p>
              <button className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-white font-medium transition-colors">
                Contacter le Support
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
