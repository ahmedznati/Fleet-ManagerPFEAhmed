import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDriver, useUpdateDriver } from "@/hooks/use-drivers";
import { useVehicles } from "@/hooks/use-vehicles";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus, Loader2, Car, AlertTriangle, Check, Copy } from "lucide-react";
import { z } from "zod";

// Custom form schema with strict validation
const driverFormSchema = z.object({
  matricule: z.string().length(10, "Le matricule doit contenir exactement 10 chiffres").regex(/^\d{10}$/, "Le matricule doit contenir uniquement des chiffres"),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(50, "Prénom trop long"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50, "Nom trop long"),
  email: z.string().email("Adresse email invalide"),
  phoneNumber: z.string().regex(/^\d{8}$/, "Le numéro de téléphone doit contenir exactement 8 chiffres"),
  licenseNumber: z.string().min(5, "Numéro de permis doit contenir au moins 5 caractères").max(30, "Numéro de permis trop long"),
  licenseExpiry: z.string().min(1, "La date d'expiration du permis est requise"),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  assignedVehicleId: z.number({ required_error: "Le véhicule assigné est requis" }).min(1, "Vous devez assigner un véhicule"),
});

type DriverFormData = z.infer<typeof driverFormSchema>;

type Driver = {
  id: number;
  matricule?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  licenseExpiry?: Date | null;
  status: string;
  assignedVehicleId?: number | null;
};

interface DriverFormProps {
  driver?: Driver;
  trigger?: React.ReactNode;
}

export function DriverForm({ driver, trigger }: DriverFormProps) {
  const [open, setOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ matricule: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const { data: vehicles = [] } = useVehicles();

  // Filter available vehicles (active and not already assigned to another driver)
  const availableVehicles = vehicles.filter(v => 
    v.status === "active" || v.status === "maintenance" || 
    (driver && v.currentDriverId === driver.id) // Include current driver's vehicle when editing
  );

  const isEditing = !!driver;

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: driver ? {
      matricule: driver.matricule || "",
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phoneNumber: driver.phoneNumber,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : "",
      status: driver.status as "active" | "inactive" | "on_leave",
      assignedVehicleId: driver.assignedVehicleId || undefined,
    } : {
      matricule: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      licenseNumber: "",
      status: "active",
      licenseExpiry: "",
      assignedVehicleId: undefined,
    },
  });

  const onSubmit = async (data: DriverFormData) => {
    try {
      const submitData = {
        ...data,
        licenseExpiry: data.licenseExpiry || null,
      };
      
      if (isEditing && driver) {
        await updateMutation.mutateAsync({ id: driver.id, ...submitData });
      } else {
        const result = await createMutation.mutateAsync(submitData);
        if (result?.temporaryPassword) {
          setCreatedCredentials({
            matricule: data.matricule,
            password: result.temporaryPassword,
          });
          setCopied(false);
        }
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error) {
      // Error is handled by the mutation's onError callback (toast)
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800 shadow-lg shadow-crimson-200">
            <Plus className="w-4 h-4" /> Ajouter un Chauffeur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le Chauffeur" : "Ajouter un Nouveau Chauffeur"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="matricule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matricule *</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="0123456789" 
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        field.onChange(value);
                      }}
                      className="font-mono tracking-wider"
                    />
                  </FormControl>
                  <p className="text-xs text-slate-500">
                    10 chiffres requis — utilisé pour la connexion
                    {isEditing && <span className="text-amber-600 ml-1">(modifier change les identifiants du chauffeur)</span>}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Jean" 
                        {...field} 
                        autoComplete="given-name"
                        minLength={2}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Dupont" 
                        {...field} 
                        autoComplete="family-name"
                        minLength={2}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optionnel)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="jean.dupont@exemple.com" 
                      {...field} 
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone *</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="XX XXX XXX" 
                      {...field} 
                      autoComplete="tel"
                      maxLength={8}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-slate-500">8 chiffres requis</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de Permis</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="P123456" 
                        {...field}
                        minLength={5}
                        maxLength={30}
                      />
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
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="on_leave">En Congé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="licenseExpiry"
              render={({ field }) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expiryDate = field.value ? new Date(field.value) : null;
                const isExpired = expiryDate ? expiryDate < today : false;
                const isExpiringSoon = expiryDate && !isExpired
                  ? expiryDate < new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
                  : false;

                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Date d'Expiration du Permis *
                      {(isExpired || isExpiringSoon) && (
                        <AlertTriangle className={`w-4 h-4 ${isExpired ? 'text-red-600' : 'text-gold-600'}`} />
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          // Auto-set status to inactive if license is expired
                          if (e.target.value) {
                            const newExpiry = new Date(e.target.value);
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            if (newExpiry < now) {
                              form.setValue('status', 'inactive');
                            }
                          }
                        }}
                      />
                    </FormControl>
                    {isExpired && (
                      <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Permis expiré ! Le chauffeur doit être mis en inactif.
                      </p>
                    )}
                    {isExpiringSoon && (
                      <p className="text-xs text-gold-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Le permis expire bientôt !
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="assignedVehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-crimson-600" />
                    Véhicule Assigné *
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un véhicule (requis)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableVehicles.length === 0 ? (
                        <SelectItem value="none" disabled>Aucun véhicule disponible</SelectItem>
                      ) : (
                        availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                            {vehicle.name} - {vehicle.licensePlate} ({vehicle.model})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Le véhicule assigné par défaut au chauffeur
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>{isEditing ? "Mettre à Jour le Chauffeur" : "Créer le Chauffeur"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Temporary Password Dialog */}
    <Dialog open={!!createdCredentials} onOpenChange={(o) => { if (!o) setCreatedCredentials(null); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Check className="w-5 h-5" />
            Chauffeur créé avec succès
          </DialogTitle>
          <DialogDescription>
            Voici le mot de passe temporaire. Veuillez le communiquer au chauffeur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Matricule</Label>
              <p className="font-mono text-sm font-medium">{createdCredentials?.matricule}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Mot de passe temporaire</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-white border rounded px-3 py-2 font-mono text-sm font-bold tracking-wider">
                  {createdCredentials?.password}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (createdCredentials) {
                      navigator.clipboard.writeText(createdCredentials.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ Ce mot de passe ne sera plus affiché après fermeture. Assurez-vous de le copier.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => setCreatedCredentials(null)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
