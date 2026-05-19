import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateMission, useUpdateMission, useMissions } from "@/hooks/use-missions";
import { useVehicles } from "@/hooks/use-vehicles";
import { useDrivers } from "@/hooks/use-drivers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/location-picker";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Strict local validation schema for the mission form
const missionFormSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(100, "Le titre est trop long"),
  description: z.string().max(500, "La description est trop longue").optional().nullable(),
  driverId: z.number({ required_error: "Veuillez sélectionner un chauffeur" }).min(1, "Veuillez sélectionner un chauffeur"),
  vehicleId: z.number({ required_error: "Veuillez sélectionner un véhicule" }).min(1, "Veuillez sélectionner un véhicule"),
  endLocation: z.string().min(2, "La destination est requise"),
  status: z.string().default("pending"),
  priority: z.enum(["low", "normal", "high", "urgent"], { required_error: "Veuillez sélectionner une priorité" }),
  coPilot: z.string().max(100, "Nom de co-pilote trop long").optional().nullable(),
  passengersCount: z.number().int("Doit être un nombre entier").min(1, "Au moins 1 personne").max(100, "Maximum 100 personnes").optional().nullable(),
  scheduledStart: z.any().optional().nullable(),
  scheduledEnd: z.any().optional().nullable(),
}).refine((data) => {
  if (data.scheduledStart && data.scheduledEnd) {
    return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
  }
  return true;
}, {
  message: "La date de fin doit être après la date de début",
  path: ["scheduledEnd"],
});

// Local form type
type MissionFormData = z.infer<typeof missionFormSchema>;

type Mission = {
  id: number;
  vehicleId: number;
  driverId: number;
  title: string;
  description: string | null;
  endLocation: string;
  status: string;
  priority: string;
  coPilot: string | null;
  passengersCount: number | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  [key: string]: any;
};

interface MissionFormProps {
  mission?: Mission;
  trigger?: React.ReactNode;
}

const driverStatusLabels: Record<string, string> = {
  active: "disponible",
  inactive: "inactif",
  on_leave: "en congé",
};

// Tunisia cities for coordinate lookup
const cityCoordinates: Record<string, [number, number]> = {
  "tunis": [36.8065, 10.1815],
  "sfax": [34.7406, 10.7603],
  "sousse": [35.8254, 10.6084],
  "kairouan": [35.6781, 10.0963],
  "bizerte": [37.2744, 9.8739],
  "gabès": [33.8815, 10.0982],
  "gabes": [33.8815, 10.0982],
  "ariana": [36.8625, 10.1956],
  "gafsa": [34.4250, 8.7842],
  "monastir": [35.7643, 10.8113],
  "ben arous": [36.7533, 10.2189],
  "kasserine": [35.1676, 8.8365],
  "médenine": [33.3549, 10.5055],
  "medenine": [33.3549, 10.5055],
  "nabeul": [36.4513, 10.7357],
  "tataouine": [32.9297, 10.4518],
  "béja": [36.7256, 9.1817],
  "beja": [36.7256, 9.1817],
  "jendouba": [36.5011, 8.7803],
  "mahdia": [35.5047, 11.0622],
  "siliana": [36.0849, 9.3708],
  "le kef": [36.1826, 8.7148],
  "kef": [36.1826, 8.7148],
  "tozeur": [33.9197, 8.1339],
  "hammamet": [36.4000, 10.6167],
  "djerba": [33.8076, 10.8451],
  "zaghouan": [36.4029, 10.1429],
  "kébili": [33.7050, 8.9650],
  "kebili": [33.7050, 8.9650],
};

async function geocodeLocation(locationName: string): Promise<[number, number] | null> {
  const normalized = locationName.toLowerCase().trim();
  if (cityCoordinates[normalized]) return cityCoordinates[normalized];
  for (const [key, coords] of Object.entries(cityCoordinates)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords;
  }
  try {
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:8000/api");
    const res = await fetch(`${apiBase}/geocode/search?q=${encodeURIComponent(locationName)}, Tunisia`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (e) {
    console.error("Geocoding error:", e);
  }
  return null;
}

export function MissionForm({ mission, trigger }: MissionFormProps) {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateMission();
  const updateMutation = useUpdateMission();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: allMissions } = useMissions();

  const isEditing = !!mission;

  // Vehicles that are NOT currently on an active mission (pending or in_progress)
  const busyVehicleIds = new Set(
    (allMissions || [])
      .filter((m: any) => m.status === 'in_progress' || m.status === 'pending')
      .map((m: any) => m.vehicleId)
  );
  // When editing, allow the mission's own vehicle to stay in the list
  const availableVehicles = (vehicles || []).filter(
    (v: any) => !busyVehicleIds.has(v.id) || (isEditing && mission?.vehicleId === v.id)
  );

  const form = useForm<MissionFormData>({
    resolver: zodResolver(missionFormSchema) as any,
    defaultValues: mission ? {
      vehicleId: mission.vehicleId,
      driverId: mission.driverId,
      title: mission.title,
      description: mission.description || "",
      endLocation: mission.endLocation,
      status: mission.status as any,
      priority: mission.priority as any,
      coPilot: mission.coPilot || "",
      passengersCount: mission.passengersCount ?? 1,
      scheduledStart: mission.scheduledStart ? new Date(mission.scheduledStart).toISOString().slice(0, 16) : null,
      scheduledEnd: mission.scheduledEnd ? new Date(mission.scheduledEnd).toISOString().slice(0, 16) : null,
    } : {
      vehicleId: 0,
      driverId: 0,
      title: "",
      description: "",
      endLocation: "",
      status: "pending",
      priority: "normal",
      coPilot: "",
      passengersCount: 1,
      scheduledStart: null,
      scheduledEnd: null,
    },
  });

  // When a driver is selected, auto-select their default vehicle if available
  const selectedDriverId = form.watch("driverId");
  const selectedDriver = drivers?.find((d: any) => d.id === selectedDriverId);
  const driverDefaultVehicle = selectedDriver?.assignedVehicleId;

  // Auto-fill vehicle when driver changes (only for new missions)
  const handleDriverChange = (driverId: number) => {
    form.setValue("driverId", driverId);
    if (!isEditing) {
      const driver = drivers?.find((d: any) => d.id === driverId);
      if (driver?.assignedVehicleId && !busyVehicleIds.has(driver.assignedVehicleId)) {
        form.setValue("vehicleId", driver.assignedVehicleId);
      }
    }
  };

  const onSubmit = async (data: MissionFormData) => {
    try {
      // Clean up the data - remove fields that aren't needed or are empty strings
      const submitData: any = {
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        title: data.title,
        endLocation: data.endLocation,
        status: isEditing ? data.status : "pending",
        priority: data.priority,
      };

      // Geocode the destination to store coordinates
      const coords = await geocodeLocation(data.endLocation);
      if (coords) {
        submitData.endLat = coords[0];
        submitData.endLng = coords[1];
      }

      // Add optional fields only if they have values
      if (data.description) submitData.description = data.description;
      if (data.scheduledStart) submitData.scheduledStart = data.scheduledStart;
      if (data.scheduledEnd) submitData.scheduledEnd = data.scheduledEnd;
      if (data.coPilot) submitData.coPilot = data.coPilot;
      if (data.passengersCount && data.passengersCount > 0) submitData.passengersCount = data.passengersCount;

      if (isEditing && mission) {
        await updateMutation.mutateAsync({ id: mission.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Ajouter une Mission</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la Mission" : "Créer une Nouvelle Mission"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Mettez à jour les détails de la mission ci-dessous." : "Remplissez les détails pour créer une nouvelle mission."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de la Mission *</FormLabel>
                  <FormControl>
                    <Input placeholder="Livraison à Sousse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optionnel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Détails de la mission..." 
                      {...field} 
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chauffeur</FormLabel>
                    <Select onValueChange={(val) => handleDriverChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un chauffeur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id.toString()}>
                            {driver.firstName} {driver.lastName}
                            {driver.status ? ` — ${driverStatusLabels[driver.status] || driver.status}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Véhicule {driverDefaultVehicle ? "" : ""}</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un véhicule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableVehicles.map((vehicle: any) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.name} - {vehicle.licensePlate} ({vehicle.model})
                            {vehicle.id === driverDefaultVehicle ? " ★ par défaut" : ""}
                            {vehicle.status === "on_mission" ? " ⛔ en mission" : ""}
                          </SelectItem>
                        ))}
                        {availableVehicles.length === 0 && (
                          <SelectItem value="none" disabled>Aucun véhicule disponible</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {driverDefaultVehicle && busyVehicleIds.has(driverDefaultVehicle) && (
                      <p className="text-xs text-amber-600 mt-1">⚠ Le véhicule par défaut est en mission</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <LocationPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Sélectionner la destination"
                      label="Choisir la destination"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la priorité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status is managed by the driver only - not shown in admin form */}
            {isEditing && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                <p><strong>Note:</strong> Le statut de la mission ne peut être modifié que par le chauffeur assigné.</p>
                <p className="mt-1">Statut actuel: <span className="font-medium">{
                  mission?.status === "pending" ? "En Attente" :
                  mission?.status === "in_progress" ? "En Cours" :
                  mission?.status === "completed" ? "Terminée" :
                  mission?.status === "cancelled" ? "Annulée" : mission?.status
                }</span></p>
              </div>
            )}

            {/* Co-pilot & Passengers */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coPilot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Co-pilote (Optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom du co-pilote"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passengersCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de personnes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="1"
                        {...field}
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Début Prévu (Optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        value={
                          field.value 
                            ? (typeof field.value === 'string' 
                                ? field.value 
                                : new Date(field.value).toISOString().slice(0, 16))
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin Prévue (Optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        value={
                          field.value 
                            ? (typeof field.value === 'string' 
                                ? field.value 
                                : new Date(field.value).toISOString().slice(0, 16))
                            : ''
                        }
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800"
                disabled={isPending}
              >
                {isPending ? "Enregistrement..." : isEditing ? "Mettre à Jour la Mission" : "Créer la Mission"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
