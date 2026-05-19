import { useVehicles, useDeleteVehicle } from "@/hooks/use-vehicles";
import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-user";
import { VehicleForm } from "@/components/vehicle-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, MapPin, MoreHorizontal, Car } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function VehiclesPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const deleteMutation = useDeleteVehicle();
  const { isAdmin, isOperateur } = useUser();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
      maintenance: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25",
      inactive: "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25",
    };
    
    return (
      <Badge className={`border-0 font-medium ${variants[status] || "bg-slate-100 text-slate-700"}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Flotte de Véhicules</h1>
          <p className="text-slate-500 mt-2">
            {isOperateur ? "Gérez vos véhicules et consultez leur statut actuel." : "Consultez tous les véhicules et leur statut actuel."}
          </p>
        </div>
        {isOperateur && <VehicleForm />}
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100">
          <CardTitle>Tous les Véhicules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nom du Véhicule</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Plaque d'Immatriculation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière Mise à Jour</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : vehicles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    Aucun véhicule trouvé. Ajoutez votre premier véhicule pour commencer.
                  </TableCell>
                </TableRow>
              ) : (
                vehicles?.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Car className="w-4 h-4" />
                        </div>
                        {vehicle.name}
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.model}</TableCell>
                    <TableCell className="font-mono text-xs">{vehicle.licensePlate}</TableCell>
                    <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {vehicle.lastUpdated ? formatDistanceToNow(new Date(vehicle.lastUpdated), { addSuffix: true }) : "Jamais"}
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
                          <Link href={`/vehicles/${vehicle.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <MapPin className="mr-2 h-4 w-4" /> Suivre la Position
                            </DropdownMenuItem>
                          </Link>
                          {isOperateur && (
                            <>
                              <VehicleForm 
                                vehicle={vehicle} 
                                trigger={
                                  <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-slate-100">
                                    <Edit2 className="mr-2 h-4 w-4" /> Modifier les Détails
                                  </div>
                                } 
                              />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                onClick={() => deleteMutation.mutate(vehicle.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer le Véhicule
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
    </Layout>
  );
}
