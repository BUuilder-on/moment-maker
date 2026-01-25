import { useState, useEffect } from "react";
import { Check, X, Clock, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CreditOrder {
  id: string;
  user_id: string;
  user_email: string;
  credits: number;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
  notes: string | null;
}

const AdminOrdersTab = () => {
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CreditOrder | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("credit_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as CreditOrder[]);
    }
    setLoading(false);
  };

  const handleValidateOrder = async (order: CreditOrder) => {
    setProcessingOrderId(order.id);

    try {
      // 1. Get current user (admin) ID
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Admin non connecté");

      // 2. Get user's current credits
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      const currentCredits = profile?.credits || 0;
      const newCredits = currentCredits + order.credits;

      // 3. Update user's credits
      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({ credits: newCredits })
        .eq("user_id", order.user_id);

      if (updateProfileError) throw updateProfileError;

      // 4. Mark order as validated
      const { error: updateOrderError } = await supabase
        .from("credit_orders")
        .update({
          status: "validated",
          validated_at: new Date().toISOString(),
          validated_by: adminUser.id,
        })
        .eq("id", order.id);

      if (updateOrderError) throw updateOrderError;

      toast.success(`${order.credits} crédits ajoutés à ${order.user_email}`);
      fetchOrders();
    } catch (error: any) {
      console.error(error);
      toast.error("Erreur: " + error.message);
    }

    setProcessingOrderId(null);
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder) return;
    setProcessingOrderId(selectedOrder.id);

    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Admin non connecté");

      const { error } = await supabase
        .from("credit_orders")
        .update({
          status: "rejected",
          validated_at: new Date().toISOString(),
          validated_by: adminUser.id,
          notes: rejectNotes || "Paiement non confirmé",
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success("Commande rejetée");
      setRejectDialogOpen(false);
      setSelectedOrder(null);
      setRejectNotes("");
      fetchOrders();
    } catch (error: any) {
      console.error(error);
      toast.error("Erreur: " + error.message);
    }

    setProcessingOrderId(null);
  };

  const openRejectDialog = (order: CreditOrder) => {
    setSelectedOrder(order);
    setRejectNotes("");
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case "validated":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Check className="w-3 h-3 mr-1" />
            Validée
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Rejetée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-dore border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl font-semibold">Commandes de crédits</h2>
          {pendingCount > 0 && (
            <Badge className="bg-dore text-black">{pendingCount} en attente</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <Card className="border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Crédits</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Aucune commande de crédits
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {order.user_email}
                  </TableCell>
                  <TableCell className="font-semibold text-dore">
                    {order.amount.toLocaleString()} F
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-dore text-dore">
                      {order.credits} crédits
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    {order.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleValidateOrder(order)}
                          disabled={processingOrderId === order.id}
                        >
                          {processingOrderId === order.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Valider
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(order)}
                          disabled={processingOrderId === order.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {order.status !== "pending" && order.notes && (
                      <span className="text-xs text-muted-foreground">{order.notes}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la commande</DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <>
                  Commande de {selectedOrder.credits} crédits ({selectedOrder.amount} F) pour{" "}
                  {selectedOrder.user_email}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Raison du rejet (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Paiement non reçu, montant incorrect..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectOrder}
              disabled={processingOrderId === selectedOrder?.id}
            >
              {processingOrderId === selectedOrder?.id ? "Traitement..." : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrdersTab;
