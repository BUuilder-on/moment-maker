import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Users, MessageSquare, Ticket, Copy, Shield, Send, Calendar, Clock, User, CreditCard, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Logo from "@/components/Logo";
import AdminOrdersTab from "@/components/AdminOrdersTab";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Validation schema for activation code
const codeSchema = z.object({
  code: z.string()
    .min(3, "Le code doit contenir au moins 3 caractères")
    .max(20, "Le code ne peut pas dépasser 20 caractères")
    .regex(/^[A-Z0-9]+$/, "Le code ne peut contenir que des lettres majuscules et chiffres"),
  credits: z.number()
    .min(1, "Minimum 1 crédit")
    .max(1000, "Maximum 1000 crédits"),
  maxUses: z.number()
    .min(1, "Minimum 1 utilisation")
    .max(100000, "Maximum 100 000 utilisations")
});

interface ActivationCode {
  id: string;
  code: string;
  credits: number;
  max_uses: number;
  current_uses: number;
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
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit code form
  const [editingCode, setEditingCode] = useState<ActivationCode | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editCredits, setEditCredits] = useState(2);
  const [editMaxUses, setEditMaxUses] = useState(1);

  // Message creation form
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    recipientName: "",
    recipientEmail: "",
    message: "",
    unlockDate: undefined as Date | undefined,
    unlockTime: "",
  });
  const [generatedMessageLink, setGeneratedMessageLink] = useState<string | null>(null);

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
      .select("current_uses, max_uses");

    const totalCodes = codesData?.length ?? 0;
    const fullyUsedCodes = codesData?.filter(c => c.current_uses >= c.max_uses).length ?? 0;

    setStats({
      totalUsers: userCount ?? 0,
      totalMessages: messageCount ?? 0,
      totalCodes,
      usedCodes: fullyUsedCodes
    });
  };

  const handleCreateCode = async () => {
    const formattedCode = newCode.toUpperCase().trim();
    
    // Validate input
    const validation = codeSchema.safeParse({ 
      code: formattedCode, 
      credits: newCredits,
      maxUses: newMaxUses
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("activation_codes")
      .insert({ 
        code: formattedCode, 
        credits: newCredits,
        max_uses: newMaxUses,
        current_uses: 0
      });

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
      setNewMaxUses(1);
      setIsDialogOpen(false);
      fetchCodes();
      fetchStats();
    }

    setIsSubmitting(false);
  };

  const handleDeleteCode = async (codeId: string, codeName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le code "${codeName}" ?`)) {
      return;
    }
    
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

  const openEditDialog = (code: ActivationCode) => {
    setEditingCode(code);
    setEditCredits(code.credits);
    setEditMaxUses(code.max_uses);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCode = async () => {
    if (!editingCode) return;

    // Validate - max_uses cannot be less than current_uses
    if (editMaxUses < editingCode.current_uses) {
      toast.error(`Le nombre d'utilisations ne peut pas être inférieur à ${editingCode.current_uses} (déjà utilisé)`);
      return;
    }

    if (editCredits < 1 || editCredits > 1000) {
      toast.error("Les crédits doivent être entre 1 et 1000");
      return;
    }

    if (editMaxUses < 1 || editMaxUses > 100000) {
      toast.error("Le nombre d'utilisations doit être entre 1 et 100 000");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("activation_codes")
      .update({ 
        credits: editCredits,
        max_uses: editMaxUses
      })
      .eq("id", editingCode.id);

    if (error) {
      toast.error("Erreur lors de la modification");
    } else {
      toast.success("Code modifié avec succès");
      setIsEditDialogOpen(false);
      setEditingCode(null);
      fetchCodes();
    }

    setIsSubmitting(false);
  };

  const handleRenewCode = async (codeId: string, codeName: string) => {
    if (!confirm(`Renouveler le code "${codeName}" ? Le compteur d'utilisations sera remis à 0.`)) {
      return;
    }

    const { error } = await supabase
      .from("activation_codes")
      .update({ current_uses: 0 })
      .eq("id", codeId);

    if (error) {
      toast.error("Erreur lors du renouvellement");
    } else {
      toast.success("Code renouvelé ! Il peut être réutilisé.");
      fetchCodes();
      fetchStats();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  const handleCreateMessage = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!messageForm.recipientName || !messageForm.message || !messageForm.unlockDate || !messageForm.unlockTime) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = messageForm.unlockTime.split(':').map(Number);
      const unlockAt = new Date(messageForm.unlockDate);
      unlockAt.setHours(hours, minutes, 0, 0);

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_name: messageForm.recipientName,
          recipient_email: messageForm.recipientEmail || null,
          content: messageForm.message,
          unlock_at: unlockAt.toISOString(),
        })
        .select()
        .single();

      if (messageError) throw messageError;

      const link = `${window.location.origin}/m/${messageData.id}`;
      setGeneratedMessageLink(link);
      toast.success("Message créé avec succès !");
      fetchStats();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }

    setIsSubmitting(false);
  };

  const resetMessageForm = () => {
    setMessageForm({
      recipientName: "",
      recipientEmail: "",
      message: "",
      unlockDate: undefined,
      unlockTime: "",
    });
    setGeneratedMessageLink(null);
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
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="orders" className="flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="codes">Codes</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="messages">Créer message</TabsTrigger>
            </TabsList>

            {/* Orders Tab - NEW */}
            <TabsContent value="orders">
              <AdminOrdersTab />
            </TabsContent>

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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="credits">Crédits par personne</Label>
                          <Input
                            id="credits"
                            type="number"
                            min={1}
                            max={1000}
                            value={newCredits}
                            onChange={(e) => setNewCredits(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxUses">Nombre de personnes</Label>
                          <Input
                            id="maxUses"
                            type="number"
                            min={1}
                            max={100000}
                            value={newMaxUses}
                            onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ce code pourra être utilisé par {newMaxUses} personne{newMaxUses > 1 ? 's' : ''}, 
                        chacune recevant {newCredits} crédit{newCredits > 1 ? 's' : ''}.
                      </p>
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

              <Card className="border-border/50 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Crédits</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucun code d'activation
                        </TableCell>
                      </TableRow>
                    ) : (
                      codes.map((code) => {
                        const isFullyUsed = code.current_uses >= code.max_uses;
                        const hasUses = code.current_uses > 0;
                        
                        return (
                          <TableRow key={code.id}>
                            <TableCell className="font-mono font-medium">{code.code}</TableCell>
                            <TableCell>{code.credits}</TableCell>
                            <TableCell>
                              <span className={hasUses ? "text-dore font-medium" : ""}>
                                {code.current_uses}
                              </span>
                              <span className="text-muted-foreground">/{code.max_uses}</span>
                            </TableCell>
                            <TableCell>
                              {isFullyUsed ? (
                                <Badge variant="secondary">Épuisé</Badge>
                              ) : hasUses ? (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                  En cours
                                </Badge>
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
                                  title="Copier le code"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditDialog(code)}
                                  title="Modifier"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {code.current_uses > 0 && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleRenewCode(code.id, code.code)}
                                    className="text-green-600 hover:text-green-700"
                                    title="Renouveler (remettre à 0)"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteCode(code.id, code.code)}
                                  className="text-destructive hover:text-destructive"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Edit Code Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modifier le code</DialogTitle>
                    <DialogDescription>
                      Modifier les paramètres du code <span className="font-mono font-bold">{editingCode?.code}</span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editCredits">Crédits par personne</Label>
                        <Input
                          id="editCredits"
                          type="number"
                          min={1}
                          max={1000}
                          value={editCredits}
                          onChange={(e) => setEditCredits(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editMaxUses">Nombre de personnes</Label>
                        <Input
                          id="editMaxUses"
                          type="number"
                          min={editingCode?.current_uses || 1}
                          max={100000}
                          value={editMaxUses}
                          onChange={(e) => setEditMaxUses(parseInt(e.target.value) || 1)}
                        />
                        {editingCode && editingCode.current_uses > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Minimum: {editingCode.current_uses} (déjà utilisé)
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ce code pourra être utilisé par {editMaxUses} personne{editMaxUses > 1 ? 's' : ''}, 
                      chacune recevant {editCredits} crédit{editCredits > 1 ? 's' : ''}.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleUpdateCode} 
                      disabled={isSubmitting}
                      className="bg-dore hover:bg-dore-dark text-accent-foreground"
                    >
                      {isSubmitting ? "Modification..." : "Enregistrer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

            {/* Messages Tab - Admin Message Creation */}
            <TabsContent value="messages" className="space-y-4">
              <h2 className="font-serif text-xl font-semibold">Créer un message</h2>

              <Card className="border-border/50">
                <CardContent className="p-6">
                  {generatedMessageLink ? (
                    <div className="space-y-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <Send className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                          Message créé avec succès !
                        </h3>
                        <p className="text-muted-foreground">
                          Lien à partager avec {messageForm.recipientName}
                        </p>
                      </div>
                      
                      <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
                        <input 
                          type="text" 
                          value={generatedMessageLink} 
                          readOnly 
                          className="flex-1 bg-transparent text-sm text-foreground truncate"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            navigator.clipboard.writeText(generatedMessageLink);
                            toast.success("Lien copié !");
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button 
                        onClick={() => {
                          resetMessageForm();
                          setIsMessageDialogOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Créer un autre message
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="recipientName">Prénom du destinataire *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              id="recipientName"
                              placeholder="Prénom"
                              value={messageForm.recipientName}
                              onChange={(e) => setMessageForm(prev => ({ ...prev, recipientName: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="recipientEmail">Email (optionnel)</Label>
                          <Input
                            id="recipientEmail"
                            type="email"
                            placeholder="email@exemple.com"
                            value={messageForm.recipientEmail}
                            onChange={(e) => setMessageForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          placeholder="Écrivez votre message ici..."
                          value={messageForm.message}
                          onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date de déverrouillage *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !messageForm.unlockDate && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {messageForm.unlockDate ? (
                                  format(messageForm.unlockDate, "PPP", { locale: fr })
                                ) : (
                                  "Sélectionnez une date"
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={messageForm.unlockDate}
                                onSelect={(date) => setMessageForm(prev => ({ ...prev, unlockDate: date }))}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return date < today;
                                }}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="unlockTime">Heure de déverrouillage *</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              id="unlockTime"
                              type="time"
                              value={messageForm.unlockTime}
                              onChange={(e) => setMessageForm(prev => ({ ...prev, unlockTime: e.target.value }))}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={handleCreateMessage}
                        disabled={isSubmitting || !messageForm.recipientName || !messageForm.message || !messageForm.unlockDate || !messageForm.unlockTime}
                        className="w-full bg-dore hover:bg-dore-dark text-accent-foreground"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                            Création...
                          </span>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Créer le message
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
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
