import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const res = await fetch(getApiUrl("/api/change-password"), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Erreur lors du changement de mot de passe");
  }
  return res.json();
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast({ title: "Succès", description: "Mot de passe modifié avec succès." });
      passwordForm.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const onPasswordSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      passwordForm.setError("confirmPassword", { message: "Les mots de passe ne correspondent pas" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

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
      uploadProfileImageMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  // Get display name from profile or user
  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : profile?.email || user?.email || "Utilisateur";

  const displayEmail = profile?.email || user?.email || "";
  const displayRole =
    profile?.role === "admin"
      ? "Administrateur"
      : profile?.role === "driver"
      ? "Chauffeur"
      : profile?.role || "Utilisateur";
  const profileImage = profile?.profileImageUrl || user?.profileImageUrl;
  const initials = (
    profile?.firstName?.[0] ||
    user?.firstName?.[0] ||
    displayEmail[0] ||
    "U"
  ).toUpperCase();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-crimson-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-slate-900 mb-8">Paramètres</h1>

        {/* Profile Card */}
        <Card className="border-none shadow-md mb-8">
          <CardHeader>
            <CardTitle>Profil Utilisateur</CardTitle>
            <CardDescription>Informations de votre compte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-slate-100 shadow">
                  <AvatarImage src={profileImage || undefined} alt="Profile" />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-crimson-500 to-crimson-700 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="settings-profile-image"
                  className="absolute bottom-0 right-0 bg-crimson-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-crimson-700 transition-colors shadow-lg"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    id="settings-profile-image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <div>
                <h3 className="font-bold text-lg">{displayName}</h3>
                <p className="text-slate-500">{displayEmail}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rôle</Label>
              <Input value={displayRole} disabled className="bg-slate-50" />
              <p className="text-xs text-slate-400">Le rôle est géré par l'administrateur système.</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="border-none shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-crimson-600" />
              <CardTitle>Changer le Mot de Passe</CardTitle>
            </div>
            <CardDescription>Mettez à jour votre mot de passe de connexion.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Entrez votre mot de passe actuel"
                    {...passwordForm.register("currentPassword", { required: "Ce champ est requis" })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowCurrent((v) => !v)}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    placeholder="Au moins 6 caractères"
                    {...passwordForm.register("newPassword", {
                      required: "Ce champ est requis",
                      minLength: { value: 6, message: "Minimum 6 caractères" },
                    })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Répétez le nouveau mot de passe"
                    {...passwordForm.register("confirmPassword", { required: "Ce champ est requis" })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-700 hover:to-crimson-800"
                >
                  {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Changer le Mot de Passe
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
