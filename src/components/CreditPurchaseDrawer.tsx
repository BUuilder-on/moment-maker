import { useState, useRef, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import "@/types/fedapay.d.ts";

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
}

const packages: CreditPackage[] = [
  { id: "basic", credits: 2, price: 500 },
  { id: "standard", credits: 5, price: 2000, popular: true },
  { id: "premium", credits: 20, price: 5000 },
];

interface CreditPurchaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FEDAPAY_PUBLIC_KEY = 'pk_live_9lrQHqfgvn-UBrscJ0BzOR9O';

const CreditPurchaseDrawer = ({ open, onOpenChange }: CreditPurchaseDrawerProps) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fedaPayButtonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();

  // Initialize FedaPay once when component mounts
  useEffect(() => {
    if (typeof window.FedaPay === 'undefined' || initialized) return;

    const handleComplete = (reason: string, transaction?: any) => {
      console.log("FedaPay onComplete:", { reason, transaction });
      
      // Check for success using both old and new constants
      const isSuccess = 
        reason === window.FedaPay.CHECKOUT_COMPLETED ||
        reason === window.FedaPay.CHECKOUT_COMPLETE ||
        reason === 'CHECKOUT_COMPLETED' ||
        reason === 'CHECKOUT_COMPLETE';
      
      const isDismissed = 
        reason === window.FedaPay.DIALOG_DISMISSED ||
        reason === window.FedaPay.CHECKOUT_CANCELED ||
        reason === 'DIALOG_DISMISSED' ||
        reason === 'CHECKOUT_CANCELED';

      if (isSuccess) {
        toast({
          title: "Paiement en cours de validation",
          description: "Vos crédits seront ajoutés automatiquement dans quelques instants.",
        });
        onOpenChange(false);
      } else if (isDismissed) {
        toast({
          title: "Paiement annulé",
          description: "La transaction a été annulée. Vérifiez votre solde Mobile Money et réessayez.",
          variant: "destructive",
        });
      } else {
        console.log("Unknown FedaPay reason:", reason);
        toast({
          title: "Paiement non finalisé",
          description: "Veuillez réessayer ou contacter le support si le problème persiste.",
          variant: "destructive",
        });
      }
      setLoading(false);
    };

    try {
      window.FedaPay.init('#fedapay-hidden-btn', {
        public_key: FEDAPAY_PUBLIC_KEY,
        environment: 'live',
        onComplete: handleComplete,
      });
      setInitialized(true);
      console.log("FedaPay initialized successfully");
    } catch (error) {
      console.error("FedaPay init error:", error);
    }
  }, [initialized, toast, onOpenChange]);

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
  };

  const handleFedaPayPayment = async () => {
    if (!selectedPackage || !fedaPayButtonRef.current) return;
    
    const pkgPrice = selectedPackage.price;
    const pkgCredits = selectedPackage.credits;

    setLoading(true);

    try {
      if (typeof window.FedaPay === 'undefined') {
        alert("Le script FedaPay n'est pas chargé. Vérifiez index.html");
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Vous devez être connecté pour effectuer un paiement");
        setLoading(false);
        return;
      }

      // Create a pending order first
      const { data: order, error: orderError } = await supabase
        .from('credit_orders')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          credits: pkgCredits,
          amount: pkgPrice,
          status: 'pending',
          payment_method: 'fedapay',
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error("Erreur création commande:", orderError);
        alert("Erreur lors de la création de la commande");
        setLoading(false);
        return;
      }

      console.log("Commande créée:", order.id);

      // Update the hidden button with data attributes (official FedaPay method)
      const btn = fedaPayButtonRef.current;
      btn.setAttribute('data-transaction-amount', pkgPrice.toString());
      btn.setAttribute('data-transaction-description', `Achat pack ${pkgCredits} crédits`);
      btn.setAttribute('data-transaction-custom_metadata-order_id', order.id);
      btn.setAttribute('data-customer-email', user.email || 'client@alheurejuste.com');
      btn.setAttribute('data-customer-lastname', user.email?.split('@')[0] || 'Client');

      console.log("Button attributes set, triggering click...");

      // Close drawer to show FedaPay popup
      onOpenChange(false);

      // Trigger the FedaPay button click after a short delay
      setTimeout(() => {
        btn.click();
      }, 300);

    } catch (error: any) {
      console.error("Erreur lancement FedaPay:", error);
      alert("Erreur lancement FedaPay : " + error.message);
      setLoading(false);
      onOpenChange(true);
    }
  };

  const handleClose = () => {
    setSelectedPackage(null);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <>
      {/* Hidden FedaPay button with data attributes */}
      <button
        ref={fedaPayButtonRef}
        id="fedapay-hidden-btn"
        className="hidden"
        data-fedapay="checkout"
        data-transaction-amount="0"
        data-transaction-description=""
        data-customer-email=""
        data-customer-lastname=""
      />

      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle className="font-serif text-xl flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5 text-dore" />
              Obtenir des crédits
            </DrawerTitle>
            <DrawerDescription>
              Rechargez votre compte immédiatement
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
              
              <p className="text-xs text-center text-muted-foreground mt-2">
                Assurez-vous d'avoir suffisamment de crédit Mobile Money. Confirmez le paiement sur votre téléphone dans les 2 minutes.
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
    </>
  );
};

export default CreditPurchaseDrawer;
