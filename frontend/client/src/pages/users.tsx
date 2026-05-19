import { useState } from "react";
import { useUsers, useUpdateUserRole, useDeleteUser, useCreateUser } from "@/hooks/use-users";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Shield, UserCircle, Users, AlertTriangle, UserPlus, Copy, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "superadmin" | "operateur" | "chauffeur";

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Super Admin",
  operateur: "Opérateur",
  chauffeur: "Chauffeur",
};

const ROLE_COLORS: Record<AppRole, string> = {
  superadmin: "bg-purple-500/15 text-purple-700 hover:bg-purple-500/25",
  operateur: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25",
  chauffeur: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
};

function normalizeRole(role?: string): AppRole {
  if (!role) return "chauffeur";
  if (role === "admin") return "superadmin";
  if (role === "user" || role === "driver") return "chauffeur";
  return role as AppRole;
}

function getUserDisplayName(user: any): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.matricule || user.email || "Utilisateur";
}

function getUserInitials(user: any): string {
  if (user.firstName) return user.firstName[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return "U";
}

export default function UsersPage() {
  const { data: users, isLoading, error } = useUsers();
  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUser();
  const createMutation = useCreateUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ matricule: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [newUser, setNewUser] = useState({
    matricule: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "operateur" as AppRole,
  });

  // Get current user id to prevent self-modification
  const currentUserStr = localStorage.getItem("user");
  const currentUserId = currentUserStr ? JSON.parse(currentUserStr).id : null;

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    updateRoleMutation.mutate({ id: userId, role: newRole });
  };

  const handleDelete = (userId: string) => {
    deleteMutation.mutate(userId);
  };

  const handleCreate = () => {
    if (!newUser.matricule || newUser.matricule.length !== 10) return;
    const payload: any = { ...newUser };
    if (!payload.email) delete payload.email;
    createMutation.mutate(payload, {
      onSuccess: (data: any) => {
        setCreateOpen(false);
        setNewUser({ matricule: "", email: "", firstName: "", lastName: "", role: "operateur" });
        if (data?.temporaryPassword) {
          setCreatedCredentials({
            matricule: data.matricule || newUser.matricule,
            password: data.temporaryPassword,
          });
          setCopied(false);
        }
      },
    });
  };

  const handleCopyPassword = () => {
    if (createdCredentials) {
      navigator.clipboard.writeText(createdCredentials.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRoleBadge = (role: string) => {
    const normalized = normalizeRole(role);
    return (
      <Badge className={`border-0 font-medium ${ROLE_COLORS[normalized]}`}>
        <Shield className="w-3 h-3 mr-1" />
        {ROLE_LABELS[normalized]}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Gestion des Utilisateurs</h1>
          <p className="text-slate-500 mt-2">
            Gérez les rôles et les accès de tous les utilisateurs du système.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-5 h-5" />
            <span>{users?.length || 0} utilisateur(s)</span>
          </div>

          {/* Create User Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Ajouter un Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nouvel Utilisateur</DialogTitle>
                <DialogDescription>
                  Créez un compte pour un opérateur ou super admin. Un mot de passe aléatoire sera généré.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="matricule">Matricule *</Label>
                  <Input
                    id="matricule"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="0123456789"
                    value={newUser.matricule}
                    onChange={(e) => setNewUser({ ...newUser, matricule: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                    className="font-mono tracking-wider"
                  />
                  <p className="text-xs text-slate-500">10 chiffres requis</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      placeholder="Jean"
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      placeholder="Dupont"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle *</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(val: string) => setNewUser({ ...newUser, role: val as AppRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                      <SelectItem value="operateur">Opérateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newUser.matricule || newUser.matricule.length !== 10 || createMutation.isPending}
                >
                  {createMutation.isPending ? "Création..." : "Créer l'utilisateur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Temporary Password Dialog */}
          <Dialog open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <Check className="w-5 h-5" />
                  Utilisateur créé avec succès
                </DialogTitle>
                <DialogDescription>
                  Voici le mot de passe temporaire. Veuillez le communiquer à l'utilisateur.
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
                        onClick={handleCopyPassword}
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
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-crimson-500" />
            Liste des Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Erreur lors du chargement</p>
              <p className="text-sm mt-1 text-slate-400">Vérifiez que le backend est bien redéployé avec les nouvelles routes.</p>
            </div>
          ) : !users?.length ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun utilisateur trouvé.</p>
              <p className="text-sm mt-2">Cliquez sur "Ajouter un Utilisateur" pour créer le premier.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Utilisateur</TableHead>
                    <TableHead className="font-semibold">Matricule</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Rôle actuel</TableHead>
                    <TableHead className="font-semibold">Changer le rôle</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => {
                    const isSelf = String(user.id) === String(currentUserId);
                    const role = normalizeRole(user.role);
                    return (
                      <TableRow key={user.id} className={isSelf ? "bg-gold-50/50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border-2 border-gold-300/50 shadow">
                              <AvatarImage src={user.profileImageUrl || undefined} alt={getUserDisplayName(user)} />
                              <AvatarFallback className="bg-gradient-to-br from-crimson-500 to-crimson-600 text-white text-sm font-bold">
                                {getUserInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-slate-900">{getUserDisplayName(user)}</p>
                              {isSelf && (
                                <span className="text-xs text-gold-600 font-medium">Vous</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{user.matricule || "—"}</TableCell>
                        <TableCell className="text-slate-600">{user.email || "—"}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {isSelf ? (
                            <span className="text-xs text-slate-400 italic">Non modifiable</span>
                          ) : (
                            <Select
                              value={role}
                              onValueChange={(val: string) => handleRoleChange(user.id, val as AppRole)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[160px] h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                                <SelectItem value="operateur">Opérateur</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isSelf ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Confirmer la suppression
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{getUserDisplayName(user)}</strong> ({user.email}) ?
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDelete(user.id)}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
