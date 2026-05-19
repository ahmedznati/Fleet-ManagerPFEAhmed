import { useDrivers, useDeleteDriver, useUpdateDriver } from "@/hooks/use-drivers";
import { useVehicles } from "@/hooks/use-vehicles";
import Layout from "@/components/layout";
import { useUser } from "@/hooks/use-user";
import { DriverForm } from "@/components/driver-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit2, Trash2, Phone, Mail, MoreHorizontal, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function DriversPage() {
  const { data: drivers, isLoading } = useDrivers();
  const { data: vehicles } = useVehicles();
  const deleteMutation = useDeleteDriver();
  const updateMutation = useUpdateDriver();
  const { isAdmin, isOperateur } = useUser();
  
  const handleFireDriver = (driver: any) => {
    updateMutation.mutate({
      id: driver.id,
      status: "inactive",
    });
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
                {isOperateur && <TableHead className="text-right">Actions</TableHead>}
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
                    {isOperateur && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Ouvrir le menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
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
