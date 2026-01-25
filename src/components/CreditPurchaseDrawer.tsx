import { useState } from "react";
import { CreditCard, Smartphone, Check, Loader2, Copy, Phone } from "lucide-react";
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
import "@/types/fedapay.d";

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
}

// Tarifs optimisés pour Mobile Money
const packages: CreditPackage[] = [
  { id: "basic", credits: 2, price: 1000 },
  { id: "standard", credits: 5, price: 2000, popular: true },
  { id: "premium", credits: 20, price: 5000 },
];

// Numéro pour recevoir les paiements Mobile Money
const PAYMENT_PHONE = "+229 XX XX XX XX"; // À remplacer par votre numéro
interface CreditPurchaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreditPurchaseDrawer = ({ open, onOpenChange }: CreditPurchaseDrawerProps) => {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"select" | "payment">("select");
  const [orderCreated, setOrderCreated] = useState(false);
  const { toast } = useToast();

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
  };

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText(PAYMENT_PHONE.replace(/\s/g, ""));
    toast({ title: "Numéro copié !", description: "Collez-le dans votre app Mobile Money." });
  };

  const createOrder = async () => {
    if (!selectedPackage) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erreur", description: "Veuillez vous connecter.", variant: "destructive" });
        return;
      }

      // Créer la commande en attente
      const { error } = await supabase.from("credit_orders").insert({
        user_id: user.id,
        user_email: user.email || "inconnu",
        credits: selectedPackage.credits,
        amount: selectedPackage.price,
        status: "pending",
        payment_method: "mobile_money",
      });

      if (error) throw error;
      
      setOrderCreated(true);
      setStep("payment");
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de créer la commande.", 
        variant: "destructive" 
      });
    }
  };

  const addCreditsToProfile = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: "Erreur", description: "Utilisateur non connecté." });
        return;
      }

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentCredits = profile?.credits || 0;
      const newTotal = currentCredits + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newTotal })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Paiement réussi !",
        description: `${amount} crédits ont été ajoutés à votre compte.`,
      });

    } catch (error) {
      console.error("Erreur lors de l'ajout des crédits:", error);
      toast({
        variant: "destructive",
        title: "Erreur technique",
        description: "Paiement validé mais erreur d'ajout de crédits. Contactez le support.",
      });
    }
  };

  const handleFedaPayPayment = () => {
    if (!selectedPackage) return;
    
    // IMPORTANT : On sauvegarde les valeurs ici car le tiroir va se fermer
    // Cela empêche de perdre les infos quand le composant est démonté/caché
    const pkgPrice = selectedPackage.price;
    const pkgCredits = selectedPackage.credits;

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
          amount: pkgPrice,
          description: `Achat pack ${pkgCredits} crédits`,
        },
        customer: {
          email: 'client@alheurejuste.com', 
          lastname: 'Client',
        },
        onComplete: (resp: any) => {
          const status = resp.reason;
          if (status === window.FedaPay.CHECKOUT_COMPLETE) {
            console.log("Paiement validé par FedaPay");
            // Succès : On ajoute les crédits (la variable pkgCredits est toujours accessible ici)
            addCreditsToProfile(pkgCredits);
          } else {
            console.log("Paiement annulé ou fermé");
            // ÉTAPE 2 (Modification appliquée) :
            // Si l'utilisateur annule, on ROUVRE le tiroir pour qu'il puisse réessayer
            onOpenChange(true);
          }
          setLoading(false);
        }
      });

      // On ferme le tiroir AVANT d'ouvrir FedaPay pour éviter le blocage (focus trap)
      onOpenChange(false);

      // On attend un tout petit peu (500ms) que le tiroir disparaisse, puis on ouvre FedaPay
      setTimeout(() => {
        widget.open();
      }, 500);

    } catch (error) {
      console.error(error);
      setLoading(false);
      // En cas d'erreur technique immédiate, on rouvre le tiroir
      onOpenChange(true);
    }
  };

  const handleClose = () => {
    setSelectedPackage(null);
    setStep("select");
    setOrderCreated(false);
    setLoading(false);
    onOpenChange(false);
  };

  const handleProceedToPayment = async () => {
    if (!selectedPackage) return;
    setLoading(true);
    await createOrder();
    setLoading(false);
  };

  const handleBackToSelect = () => {
    setStep("select");
    setOrderCreated(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle className="font-serif text-xl flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-dore" />
            {step === "select" ? "Obtenir des crédits" : "Instructions de paiement"}
          </DrawerTitle>
          <DrawerDescription>
            {step === "select" 
              ? "Choisissez votre pack de crédits" 
              : "Effectuez le paiement Mobile Money"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4">
          {step === "select" ? (
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
                  onClick={handleProceedToPayment}
                  disabled={!selectedPackage || loading}
                  className="w-full bg-dore hover:bg-dore/90 text-black font-medium py-6"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="w-5 h-5 mr-2" />
                  )}
                  {loading ? "Création de la commande..." : "Continuer"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Récapitulatif */}
              <div className="bg-dore/10 rounded-xl p-4 border border-dore/30">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pack sélectionné</span>
                  <span className="font-bold text-foreground">{selectedPackage?.credits} crédits</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground">Montant à payer</span>
                  <span className="font-bold text-dore text-xl">{selectedPackage?.price.toLocaleString()} F</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-dore" />
                  Instructions de paiement
                </h3>
                
                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">1.</span> Ouvrez votre app Mobile Money (Orange Money, MTN MoMo, Wave)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">2.</span> Envoyez <span className="font-bold text-dore">{selectedPackage?.price.toLocaleString()} FCFA</span> au numéro :
                  </p>
                  
                  <div className="flex items-center gap-2 bg-background rounded-lg p-3 border">
                    <span className="font-mono font-bold text-foreground flex-1">{PAYMENT_PHONE}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyPhoneNumber}
                      className="shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">3.</span> Une fois le paiement effectué, vos crédits seront ajoutés sous 24h maximum après validation.
                  </p>
                </div>

                {orderCreated && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Commande enregistrée ! Elle sera validée après réception du paiement.
                    </p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleBackToSelect}
                className="w-full"
              >
                Choisir un autre pack
              </Button>
            </div>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">
              Fermer
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CreditPurchaseDrawer;
