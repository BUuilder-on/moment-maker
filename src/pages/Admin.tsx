import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Users, MessageSquare, Ticket, Copy, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Logo from "@/components/Logo";
import { z } from "zod";

// Validation schema for activation code
const codeSchema = z.object({
  code: z.string()
    .min(3, "Le code doit contenir au moins 3 caractères")
    .max(20, "Le code ne peut pas dépasser 20 caractères")
    .regex(/^[A-Z0-9]+$/, "Le code ne peut contenir que des lettres majuscules et chiffres"),
  credits: z.number()
    .min(1, "Minimum 1 crédit")
    .max(1000, "Maximum 1000 crédits")
});

interface ActivationCode {
  id: string;
  code: string;
  credits: number;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  credits: number;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalCodes: number;
  usedCodes: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading } = useAuth();
  
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalMessages: 0, totalCodes: 0, usedCodes: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  
  // New code form
  const [newCode, setNewCode] = useState("");
  const [newCredits, setNewCredits] = useState(2);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      toast.error("Accès non autorisé");
      navigate("/dashboard");
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    setDataLoading(true);
    await Promise.all([fetchCodes(), fetchUsers(), fetchStats()]);
    setDataLoading(false);
  };

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCodes(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
  };

  const fetchStats = async () => {
    // Count users
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Count messages
    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true });

    // Count codes
    const { data: codesData } = await supabase
      .from("activation_codes")
      .select("used_by");

    const totalCodes = codesData?.length ?? 0;
    const usedCodes = codesData?.filter(c => c.used_by !== null).length ?? 0;

    setStats({
      totalUsers: userCount ?? 0,
      totalMessages: messageCount ?? 0,
      totalCodes,
      usedCodes
    });
  };

  const handleCreateCode = async () => {
    const formattedCode = newCode.toUpperCase().trim();
    
    // Validate input
    const validation = codeSchema.safeParse({ code: formattedCode, credits: newCredits });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("activation_codes")
      .insert({ code: formattedCode, credits: newCredits });

    if (error) {
      if (error.code === "23505") {
        toast.error("Ce code existe déjà");
      } else {
        toast.error("Erreur lors de la création");
      }
    } else {
      toast.success("Code créé avec succès");
      setNewCode("");
      setNewCredits(2);
      setIsDialogOpen(false);
      fetchCodes();
      fetchStats();
    }

    setIsSubmitting(false);
  };

  const handleDeleteCode = async (codeId: string) => {
    const { error } = await supabase
      .from("activation_codes")
      .delete()
      .eq("id", codeId);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Code supprimé");
      fetchCodes();
      fetchStats();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dore border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo to="/dashboard" />
          <Badge variant="outline" className="border-dore text-dore">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          Retour au dashboard
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<Users className="w-5 h-5" />}
              label="Utilisateurs"
              value={stats.totalUsers}
            />
            <StatCard 
              icon={<MessageSquare className="w-5 h-5" />}
              label="Messages créés"
              value={stats.totalMessages}
            />
            <StatCard 
              icon={<Ticket className="w-5 h-5" />}
              label="Codes d'activation"
              value={stats.totalCodes}
            />
            <StatCard 
              icon={<Ticket className="w-5 h-5" />}
              label="Codes utilisés"
              value={`${stats.usedCodes}/${stats.totalCodes}`}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="codes" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="codes">Codes d'activation</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            </TabsList>

            {/* Codes Tab */}
            <TabsContent value="codes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold">Codes d'activation</h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-dore hover:bg-dore-dark text-accent-foreground">
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un code
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un code d'activation</DialogTitle>
                      <DialogDescription>
                        Créez un nouveau code que les utilisateurs pourront utiliser pour s'inscrire.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          placeholder="Ex: VALENTINE2025"
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                          maxLength={20}
                          className="uppercase"
                        />
                        <p className="text-xs text-muted-foreground">
                          Lettres majuscules et chiffres uniquement
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="credits">Nombre de crédits</Label>
                        <Input
                          id="credits"
                          type="number"
                          min={1}
                          max={1000}
                          value={newCredits}
                          onChange={(e) => setNewCredits(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleCreateCode} 
                        disabled={isSubmitting || !newCode.trim()}
                        className="bg-dore hover:bg-dore-dark text-accent-foreground"
                      >
                        {isSubmitting ? "Création..." : "Créer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Crédits</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Aucun code d'activation
                        </TableCell>
                      </TableRow>
                    ) : (
                      codes.map((code) => (
                        <TableRow key={code.id}>
                          <TableCell className="font-mono font-medium">{code.code}</TableCell>
                          <TableCell>{code.credits}</TableCell>
                          <TableCell>
                            {code.used_by ? (
                              <Badge variant="secondary">Utilisé</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                Disponible
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(code.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => copyCode(code.code)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              {!code.used_by && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteCode(code.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <h2 className="font-serif text-xl font-semibold">Utilisateurs</h2>

              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Crédits</TableHead>
                      <TableHead>Inscrit le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Aucun utilisateur
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.first_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-dore text-dore">
                              {user.credits} crédits
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

const StatCard = ({ icon, label, value }: StatCardProps) => (
  <Card className="border-border/50">
    <CardContent className="flex items-center gap-4 p-6">
      <div className="w-12 h-12 rounded-full bg-dore/20 flex items-center justify-center text-dore">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default Admin;
