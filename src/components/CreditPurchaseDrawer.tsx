import { useState, useEffect } from "react";
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

// Déclaration pour que TypeScript reconnaisse FedaPay
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
  { id: "basic", credits: 2, price: 1000 },
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

  const handleFedaPayPayment = () => {
    if (!selectedPackage) return;
    
    setLoading(true);

    try {
      // Vérification que le script FedaPay est bien chargé
      if (typeof window.FedaPay === 'undefined') {
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: "Le système de paiement n'est pas prêt. Rechargez la page.",
        });
        setLoading(false);
        return;
      }

      // Configuration du widget FedaPay
      const widget = window.FedaPay.init({
        public_key: 'pk_live_9lrQHqfgvn-UBrscJ0BzOR9O', // Votre clé publique (SÉCURISÉ)
        transaction: {
          amount: selectedPackage.price,
          description: `Achat de ${selectedPackage.credits} crédits`,
        },
        customer: {
          email: 'client@alheurejuste.com', // Idéalement, mettez l'email du client connecté ici
          lastname: 'Client', // Idéalement, nom du client
        },
        onComplete: (resp: any) => {
          // Ce code s'exécute quand le paiement est terminé ou fermé
          const status = resp.reason; // 'CHECKOUT_COMPLETE' si succès
          
          if (status === window.FedaPay.CHECKOUT_COMPLETE) {
             console.log("Paiement réussi", resp);
             toast({
              title: "Paiement réussi !",
              description: `Vos ${selectedPackage.credits} crédits ont été ajoutés.`,
              // Note: Pour une vraie sécurité, les crédits doivent être ajoutés via un Webhook backend
            });
            handleClose();
          } else {
             console.log("Paiement annulé ou échoué");
          }
          setLoading(false);
        }
      });

      // Ouvrir la fenêtre de paiement
      widget.open();

    } catch (error) {
      console.error("Erreur FedaPay:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'initialisation du paiement.",
      });
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
            Choisissez votre pack et payez directement par Mobile Money
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
                  {loading ? "Chargement..." : "Payer maintenant"}
                </Button>
              </div>
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
