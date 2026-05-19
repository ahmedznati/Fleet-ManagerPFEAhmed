import { useState } from "react";
import { useDrivers } from "@/hooks/use-drivers";
import { useUser } from "@/hooks/use-user";
import UserLayout from "@/components/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Mail, CreditCard, Calendar, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://fleet-manager-backend-d02b.onrender.com/api" : "http://localhost:8000/api");
  const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
  return `${baseUrl}${cleanPath}`;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function ProfilePage() {
  const { data: drivers } = useDrivers();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Find current driver
  const currentDriver = drivers?.find(d => d.email === user?.email);

  // Use profile image from backend (enriched driver data) or local state
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);
  const profileImage = localProfileImage || (currentDriver as any)?.profileImageUrl || null;

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const uploadProfileImageMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const res = await fetch(getApiUrl("/api/user/profile-image"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ profileImageUrl: base64Image }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur lors de l'upload de l'image");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Succès", description: "Photo de profil mise à jour." });
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 2 Mo", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLocalProfileImage(base64);
      uploadProfileImageMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le nouveau mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(getApiUrl("/api/change-password"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur lors du changement de mot de passe");
      toast({ title: "Succès", description: "Mot de passe modifié avec succès" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Échec du changement de mot de passe", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-emerald-500/15 text-emerald-700 border-0",
      inactive: "bg-slate-500/15 text-slate-700 border-0",
      on_leave: "bg-amber-500/15 text-amber-700 border-0",
    };
    const labels: Record<string, string> = { active: "Actif", inactive: "Inactif", on_leave: "En congé" };
    return (
      <Badge className={variants[status] || "bg-slate-100 text-slate-700 border-0"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (!currentDriver) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-slate-500">Chargement du profil...</p>
        </div>
      </UserLayout>
    );
  }

  const initials = `${currentDriver.firstName[0]}${currentDriver.lastName[0]}`.toUpperCase();

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Mon Profil</h1>
          <p className="text-slate-500 mt-2">Gérez vos informations personnelles et paramètres</p>
        </div>

        {/* Profile Card */}
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                    <AvatarImage src={profileImage || undefined} alt={currentDriver.firstName} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-crimson-500 to-crimson-700 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-crimson-600 text-white p-2 rounded-full cursor-pointer hover:bg-crimson-700 transition-colors shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <input id="profile-image" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                {getStatusBadge(currentDriver.status)}
              </div>

              {/* Info Section */}
              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {currentDriver.firstName} {currentDriver.lastName}
                  </h2>
                  <p className="text-slate-500 mt-1">Chauffeur</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email — lecture seule */}
                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input value={currentDriver.email} disabled className="bg-slate-50" />
                  </div>

                  {/* Numéro de Permis — lecture seule */}
                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Numéro de Permis
                    </Label>
                    <Input value={currentDriver.licenseNumber} disabled className="bg-slate-50 font-mono" />
                  </div>

                  {/* Expiration du Permis — lecture seule */}
                  <div className="space-y-2">
                    <Label className="text-slate-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Expiration du Permis
                    </Label>
                    <Input
                      value={currentDriver.licenseExpiry ? format(new Date(currentDriver.licenseExpiry), "PP") : "Non défini"}
                      disabled
                      className="bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Informations du Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Membre depuis</span>
                <span className="font-medium">
                  {currentDriver.createdAt ? format(new Date(currentDriver.createdAt), "PP") : "Inconnu"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Statut du Compte</span>
                <span className="font-medium text-emerald-600">Actif</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Véhicule Assigné</span>
                <span className="font-medium">
                  {currentDriver.assignedVehicleId ? `Véhicule #${currentDriver.assignedVehicleId}` : "Non assigné"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Statistiques Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Total Missions</span>
                <span className="font-bold text-crimson-600">0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-600">Terminées</span>
                <span className="font-bold text-emerald-600">0</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600">Taux de Réussite</span>
                <span className="font-bold text-slate-900">-</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password Change Card */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-crimson-600" />
              Changer le Mot de Passe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-600">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500">Minimum 6 caractères</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">Confirmer le nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isChangingPassword ? "Modification en cours..." : "Modifier le mot de passe"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
