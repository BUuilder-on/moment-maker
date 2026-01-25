import { useState } from "react";
import { CreditCard, Smartphone, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
// Importation du client Supabase (Standard Lovable)
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    FedaPay: any;
  }
}

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
}

const packages: CreditPackage[] = [
  { id: "basic", credits: 2, price: 200 },
  { id: "standard", credits: 5, price: 2000, popular: true },
  { id: "premium", credits: 20, price: 5000 },
];

interface CreditPurchaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreditPurchaseDrawer = ({ open, onOpenChange }: CreditPurchaseDrawerProps) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
  };

  // Fonction pour ajouter les crédits dans Supabase
  const addCreditsToProfile = async (amount: number) => {
    try {
      // 1. Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Vous devez être connecté pour acheter des crédits.");
      }

      // 2. Récupérer les crédits actuels
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentCredits = profile?.credits || 0;
      const newTotal = currentCredits + amount;

      // 3. Mettre à jour avec les nouveaux crédits
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newTotal })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Succès total
      toast({
        title: "Paiement réussi !",
        description: `${amount} crédits ont été ajoutés à votre compte.`,
      });
      
      handleClose();

    } catch (error) {
      console.error("Erreur lors de l'ajout des crédits:", error);
      toast({
        variant: "destructive",
        title: "Erreur technique",
        description: "Le paiement est validé mais l'ajout des crédits a échoué. Contactez le support.",
      });
    }
  };

  const handleFedaPayPayment = () => {
    if (!selectedPackage) return;
    setLoading(true);

    try {
      if (typeof window.FedaPay === 'undefined') {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Système de paiement non chargé. Rechargez la page.",
        });
        setLoading(false);
        return;
      }

      const widget = window.FedaPay.init({
        public_key: 'pk_live_9lrQHqfgvn-UBrscJ0BzOR9O',
        transaction: {
          amount: selectedPackage.price,
          description: `Achat pack ${selectedPackage.credits} crédits`,
        },
        customer: {
          email: 'client@alheurejuste.com', // Idéalement : user.email si accessible ici
          lastname: 'Client',
        },
        onComplete: (resp: any) => {
          const status = resp.reason;
          if (status === window.FedaPay.CHECKOUT_COMPLETE) {
            // Si le paiement est bon, on ajoute les crédits
            console.log("Paiement validé par FedaPay");
            addCreditsToProfile(selectedPackage.credits);
          } else {
            console.log("Paiement annulé");
            setLoading(false);
          }
        }
      });

      widget.open();

    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPackage(null);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle className="font-serif text-xl flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-dore" />
            Obtenir des crédits
          </DrawerTitle>
          <DrawerDescription>
            Choisissez votre pack pour recharger votre compte immédiatement
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <div className="space-y-3">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className={`w-full p-4 rounded-xl border-2 transition-all relative ${
                  selectedPackage?.id === pkg.id
                    ? "border-dore bg-dore/10"
                    : "border-border hover:border-dore/50 bg-card"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 bg-dore text-black text-xs font-medium rounded-full">
                    Populaire
                  </span>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedPackage?.id === pkg.id ? "bg-dore/20" : "bg-secondary"
                    }`}>
                      {selectedPackage?.id === pkg.id ? (
                        <Check className="w-5 h-5 text-dore" />
                      ) : (
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">
                        {pkg.credits} crédits
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(pkg.price / pkg.credits)} FCFA / crédit
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-dore">
                      {pkg.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">FCFA</p>
                  </div>
                </div>
              </button>
            ))}

            <div className="pt-4">
              <Button
                onClick={handleFedaPayPayment}
                disabled={!selectedPackage || loading}
                className="w-full bg-dore hover:bg-dore/90 text-black font-medium py-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="w-5 h-5 mr-2" />
                )}
                {loading ? "Validation en cours..." : "Payer et recharger"}
              </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-2">
              Le rechargement est automatique après validation du paiement.
            </p>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              Annuler
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CreditPurchaseDrawer;
