import { useState, useEffect } from "react";
import { Lock, ArrowLeft, ArrowRight, Calendar, Clock, User, Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

type Step = 1 | 2 | 3 | 4 | 5;

const CreateMessage = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    message: "",
    unlockDate: undefined as Date | undefined,
    unlockTime: "",
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  const steps = [
    { number: 1, label: "Destinataire" },
    { number: 2, label: "Message" },
    { number: 3, label: "Date" },
    { number: 4, label: "Heure" },
    { number: 5, label: "Confirmation" },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.recipientName.trim().length > 0;
      case 2: return formData.message.trim().length > 0;
      case 3: return formData.unlockDate !== undefined;
      case 4: return formData.unlockTime.length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (profile.credits < 1) {
      toast.error("Vous n'avez pas assez de crédits");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create unlock datetime
      const [hours, minutes] = formData.unlockTime.split(':').map(Number);
      const unlockAt = new Date(formData.unlockDate!);
      unlockAt.setHours(hours, minutes, 0, 0);

      // Insert message
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_name: formData.recipientName,
          recipient_email: formData.recipientEmail || null,
          content: formData.message,
          unlock_at: unlockAt.toISOString(),
        })
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      // Deduct credit
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - 1 })
        .eq("user_id", user.id);

      if (creditError) {
        throw creditError;
      }

      // Refresh profile to update credits
      await refreshProfile();

      const link = `${window.location.origin}/m/${messageData.id}`;
      setGeneratedLink(link);
      toast.success("Votre message a été verrouillé !");
    } catch (error: any) {
      toast.error("Erreur lors de la création: " + error.message);
    }
    
    setIsSubmitting(false);
  };

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Lien copié !");
    }
  };

  const shareLink = async () => {
    if (generatedLink && navigator.share) {
      try {
        await navigator.share({
          title: "Un message spécial vous attend !",
          text: `${formData.recipientName}, un message vous est réservé sur À L'Heure Juste.`,
          url: generatedLink,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dore border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/50 flex items-center justify-between">
        <Logo to="/dashboard" />
        
        {!generatedLink && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-lg mx-auto">
          {/* Progress Steps */}
          {!generatedLink && (
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    currentStep >= step.number 
                      ? "bg-dore text-accent-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {currentStep > step.number ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-8 sm:w-12 h-0.5 mx-1",
                      currentStep > step.number ? "bg-dore" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step Content */}
          <Card className="border-border/50 shadow-lg animate-scale-in">
            {generatedLink ? (
              /* Success State */
              <CardContent className="py-12 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto animate-unlock">
                  <Lock className="w-10 h-10 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-serif text-2xl font-bold text-foreground">
                    Votre message a été verrouillé !
                  </h2>
                  <p className="text-muted-foreground">
                    Voici votre lien unique à partager avec {formData.recipientName}
                  </p>
                </div>
                
                <div className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
                  <input 
                    type="text" 
                    value={generatedLink} 
                    readOnly 
                    className="flex-1 bg-transparent text-sm text-foreground truncate"
                  />
                  <Button variant="ghost" size="icon" onClick={copyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={shareLink}
                    className="flex-1 bg-dore hover:bg-dore-dark text-accent-foreground"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Partager le lien
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="w-full"
                >
                  Retour au tableau de bord
                </Button>
              </CardContent>
            ) : (
              <>
                <CardHeader className="text-center">
                  <CardTitle className="font-serif text-xl">
                    {currentStep === 1 && "À qui est destiné ce message ?"}
                    {currentStep === 2 && "Écrivez votre message"}
                    {currentStep === 3 && "Choisissez la date"}
                    {currentStep === 4 && "Choisissez l'heure"}
                    {currentStep === 5 && "Confirmer et verrouiller"}
                  </CardTitle>
                  <CardDescription>
                    Étape {currentStep} sur 5
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Step 1: Recipient */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label htmlFor="recipientName">Prénom du destinataire *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="recipientName"
                            placeholder="Prénom"
                            value={formData.recipientName}
                            onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="recipientEmail">Email du destinataire (optionnel)</Label>
                        <Input
                          id="recipientEmail"
                          type="email"
                          placeholder="email@exemple.com"
                          value={formData.recipientEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Si fourni, le destinataire recevra une notification
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Message */}
                  {currentStep === 2 && (
                    <div className="space-y-3">
                      <Label htmlFor="message">Votre message</Label>
                      <Textarea
                        id="message"
                        placeholder="Écrivez votre message ici..."
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        rows={6}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.message.length} caractères
                      </p>
                    </div>
                  )}

                  {/* Step 3: Date */}
                  {currentStep === 3 && (
                    <div className="space-y-3">
                      <Label>Date de déverrouillage</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.unlockDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {formData.unlockDate ? (
                              format(formData.unlockDate, "PPP", { locale: fr })
                            ) : (
                              "Sélectionnez une date"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={formData.unlockDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, unlockDate: date }))}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Step 4: Time */}
                  {currentStep === 4 && (
                    <div className="space-y-3">
                      <Label htmlFor="unlockTime">Heure de déverrouillage</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="unlockTime"
                          type="time"
                          value={formData.unlockTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, unlockTime: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 5: Confirmation */}
                  {currentStep === 5 && (
                    <div className="space-y-4">
                      <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Destinataire</span>
                          <span className="font-medium">{formData.recipientName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">
                            {formData.unlockDate && format(formData.unlockDate, "PPP", { locale: fr })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Heure</span>
                          <span className="font-medium">{formData.unlockTime}</span>
                        </div>
                        <div className="pt-2 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-1">Message :</p>
                          <p className="text-foreground whitespace-pre-wrap">{formData.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-dore/10 border border-dore/20">
                        <span className="text-sm text-muted-foreground">Crédits restants après envoi</span>
                        <span className="font-bold text-dore">{(profile?.credits ?? 1) - 1}</span>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-4">
                    {currentStep > 1 && (
                      <Button variant="outline" onClick={handleBack} className="flex-1">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Retour
                      </Button>
                    )}
                    
                    {currentStep < 5 ? (
                      <Button 
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className="flex-1 bg-dore hover:bg-dore-dark text-accent-foreground"
                      >
                        Continuer
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || (profile?.credits ?? 0) < 1}
                        className="flex-1 bg-dore hover:bg-dore-dark text-accent-foreground"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                            Verrouillage...
                          </span>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-1" />
                            Verrouiller mon message
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateMessage;
