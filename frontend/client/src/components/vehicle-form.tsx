import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type InsertVehicle, type Vehicle } from "@shared/schema";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { z } from "zod";

// Custom schema for the form with split license plate
const vehicleFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  model: z.string().min(1, "Le modèle est requis"),
  licensePlatePrefix: z.string().regex(/^\d{1,4}$/, "Doit contenir 1 à 4 chiffres"),
  licensePlateSuffix: z.string().regex(/^\d{1,4}$/, "Doit contenir 1 à 4 chiffres"),
  status: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

// Helper to parse license plate
function parseLicensePlate(plate: string): { prefix: string; suffix: string } {
  const match = plate.match(/^(\d+)\s*TUNIS\s*(\d+)$/i);
  if (match) {
    return { prefix: match[1], suffix: match[2] };
  }
  return { prefix: "", suffix: "" };
}

interface VehicleFormProps {
  vehicle?: Vehicle;
  trigger?: React.ReactNode;
}

export function VehicleForm({ vehicle, trigger }: VehicleFormProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const isEditing = !!vehicle;
  const parsedPlate = vehicle ? parseLicensePlate(vehicle.licensePlate) : { prefix: "", suffix: "" };

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle ? {
      name: vehicle.name,
      model: vehicle.model,
      licensePlatePrefix: parsedPlate.prefix,
      licensePlateSuffix: parsedPlate.suffix,
      status: vehicle.status,
      lat: vehicle.lat || 0,
      lng: vehicle.lng || 0,
    } : {
      name: "",
      model: "",
      licensePlatePrefix: "",
      licensePlateSuffix: "",
      status: "active",
      lat: 36.8065, // Default Tunis
      lng: 10.1815,
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    try {
      // Combine license plate parts
      const licensePlate = `${data.licensePlatePrefix} TUNIS ${data.licensePlateSuffix}`;
      
      const submitData: InsertVehicle = {
        name: data.name,
        model: data.model,
        licensePlate,
        status: data.status,
        lat: data.lat,
        lng: data.lng,
      };

      if (isEditing && vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      // Error is handled by the mutation's onError callback (toast)
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800 shadow-lg shadow-crimson-200">
            <Plus className="w-4 h-4" /> Ajouter un Véhicule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le Véhicule" : "Ajouter un Nouveau Véhicule"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Véhicule</FormLabel>
                  <FormControl>
                    <Input placeholder="Camion #1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota Hilux" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tunisian License Plate Format: XXXX TUNIS XXXX */}
            <FormItem>
              <FormLabel>Plaque d'Immatriculation</FormLabel>
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="licensePlatePrefix"
                  render={({ field }) => (
                    <FormControl>
                      <Input 
                        placeholder="1234" 
                        {...field} 
                        className="w-24 text-center font-mono"
                        maxLength={4}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                  )}
                />
                <span className="px-3 py-2 bg-crimson-100 text-crimson-800 font-bold rounded border border-crimson-200">
                  TUNIS
                </span>
                <FormField
                  control={form.control}
                  name="licensePlateSuffix"
                  render={({ field }) => (
                    <FormControl>
                      <Input 
                        placeholder="5678" 
                        {...field} 
                        className="w-24 text-center font-mono"
                        maxLength={4}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                  )}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Format: XXXX TUNIS XXXX</p>
              <FormMessage />
            </FormItem>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isPending} className="bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer le Véhicule"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
