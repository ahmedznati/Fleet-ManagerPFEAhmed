import { useRoute } from "wouter";
import { useVehicle, useVehicleHistory } from "@/hooks/use-vehicles";
import Layout from "@/components/layout";
import { MapView } from "@/components/map-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Gauge, Navigation } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function VehicleDetailsPage() {
  const [, params] = useRoute("/vehicles/:id");
  const id = parseInt(params?.id || "0");
  const { data: vehicle, isLoading } = useVehicle(id);
  const { data: history, isLoading: isHistoryLoading } = useVehicleHistory(id);

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
              <CardTitle>Route History</CardTitle>
            </CardHeader>
            <div className="flex-1 relative z-0">
               <MapView 
                 vehicles={[vehicle]} 
                 height="100%" 
                 history={history || []} 
               />
            </div>
          </Card>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
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
