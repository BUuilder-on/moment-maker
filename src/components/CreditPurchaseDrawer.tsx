import { useState } from "react";
import { CreditCard, Smartphone, Check, Copy } from "lucide-react";
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
  const [step, setStep] = useState<"select" | "payment">("select");
  const { toast } = useToast();

  const mobileMoneyNumber = "+225 07 00 00 00 00"; // À remplacer par le vrai numéro

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
  };

  const handleProceedToPayment = () => {
    if (selectedPackage) {
      setStep("payment");
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(mobileMoneyNumber.replace(/\s/g, ""));
    toast({
      title: "Numéro copié !",
      description: "Le numéro a été copié dans le presse-papiers.",
    });
  };

  const handleClose = () => {
    setStep("select");
    setSelectedPackage(null);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-center">
          <DrawerTitle className="font-serif text-xl flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5 text-dore" />
            {step === "select" ? "Obtenir des crédits" : "Paiement Mobile Money"}
          </DrawerTitle>
          <DrawerDescription>
            {step === "select" 
              ? "Choisissez votre pack de crédits" 
              : `Pack ${selectedPackage?.credits} crédits - ${selectedPackage?.price} FCFA`
            }
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
                  disabled={!selectedPackage}
                  className="w-full bg-dore hover:bg-dore/90 text-black font-medium py-6"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Payer avec Mobile Money
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Instructions Mobile Money */}
              <div className="bg-secondary/50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-foreground text-center">
                  Comment payer ?
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dore text-black flex items-center justify-center text-sm font-bold flex-shrink-0">
                      1
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ouvrez votre application <strong className="text-foreground">Orange Money</strong>, <strong className="text-foreground">MTN MoMo</strong> ou <strong className="text-foreground">Wave</strong>
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dore text-black flex items-center justify-center text-sm font-bold flex-shrink-0">
                      2
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Envoyez <strong className="text-dore">{selectedPackage?.price.toLocaleString()} FCFA</strong> au numéro ci-dessous
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-dore text-black flex items-center justify-center text-sm font-bold flex-shrink-0">
                      3
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vos crédits seront ajoutés sous <strong className="text-foreground">24h</strong> après vérification
                    </p>
                  </div>
                </div>
              </div>

              {/* Numéro à copier */}
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  Numéro de paiement
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xl font-bold text-foreground font-mono">
                    {mobileMoneyNumber}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyNumber}
                    className="text-dore hover:bg-dore/10"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="bg-dore/10 border border-dore/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pack choisi</span>
                  <span className="font-semibold text-foreground">
                    {selectedPackage?.credits} crédits
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Montant à payer</span>
                  <span className="font-bold text-dore text-lg">
                    {selectedPackage?.price.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                En cas de problème, contactez-nous via WhatsApp au même numéro
              </p>
            </div>
          )}
        </div>

        <DrawerFooter>
          {step === "payment" && (
            <Button
              variant="outline"
              onClick={() => setStep("select")}
              className="w-full"
            >
              Retour aux offres
            </Button>
          )}
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
