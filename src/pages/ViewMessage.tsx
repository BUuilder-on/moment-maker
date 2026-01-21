import { useState, useEffect } from "react";
import { Lock, Heart, Clock, Unlock, Sparkles, Send, Copy, Share2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { differenceInSeconds, format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface Message {
  id: string;
  sender_id: string;
  recipient_name: string;
  content: string;
  unlock_at: string;
  is_read: boolean;
}

const ViewMessage = () => {
  const { messageId } = useParams();
  const { user } = useAuth();
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Check if current user is the creator
  const isCreator = user && message && user.id === message.sender_id;

  // Get the shareable link
  const messageLink = `${window.location.origin}/m/${messageId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(messageLink);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Un message spécial vous attend !",
          text: `${message?.recipient_name}, un message vous est réservé sur À L'Heure Juste.`,
          url: messageLink,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  useEffect(() => {
    const fetchMessage = async () => {
      if (!messageId) {
        setError("Message introuvable");
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Ce message n'existe pas ou a été supprimé");
        setIsLoading(false);
        return;
      }

      setMessage(data);
      
      const unlockDate = new Date(data.unlock_at);
      const now = new Date();
      setIsUnlocked(unlockDate <= now);
      
      // Mark as read if unlocked
      if (unlockDate <= now && !data.is_read) {
        await supabase
          .from("messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("id", messageId);
      }
      
      setIsLoading(false);
    };

    fetchMessage();
  }, [messageId]);

  useEffect(() => {
    if (!message) return;

    const updateCountdown = () => {
      const now = new Date();
      const unlockDate = new Date(message.unlock_at);
      const diff = differenceInSeconds(unlockDate, now);

      if (diff <= 0) {
        setIsUnlocked(true);
        return;
      }

      const days = Math.floor(diff / (60 * 60 * 24));
      const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = diff % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [message]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logo} alt="À L'Heure Juste" className="w-20 h-20 mx-auto animate-pulse" />
          <p className="text-muted-foreground">Chargement de votre message...</p>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex flex-col">
        <header className="w-full py-6 px-6 text-center">
          <Link to="/">
            <img src={logo} alt="À L'Heure Juste" className="w-16 h-16 mx-auto" />
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <Card className="max-w-md w-full border-border/50 shadow-xl">
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-foreground mb-3">
                Message introuvable
              </h1>
              <p className="text-muted-foreground mb-8">
                {error || "Ce message n'existe pas ou a été supprimé."}
              </p>
              <Link to="/">
                <Button className="bg-dore hover:bg-dore-dark text-accent-foreground">
                  Retour à l'accueil
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const unlockDate = new Date(message.unlock_at);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex flex-col">
      {/* Header with Logo */}
      <header className="w-full py-6 px-6 text-center">
        <Link to={user ? "/dashboard" : "/"}>
          <img src={logo} alt="À L'Heure Juste" className="w-16 h-16 mx-auto" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        <div className="max-w-md mx-auto w-full space-y-6">
          
          {/* ========== CREATOR ACTIONS - Share Link ========== */}
          {isCreator && (
            <Card className="border-dore/30 bg-dore/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Lien à partager</p>
                    <p className="text-sm text-foreground truncate font-mono">
                      {messageLink}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyLink}
                      className="border-dore/30 hover:bg-dore/10"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-dore" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={shareLink}
                      className="border-dore/30 hover:bg-dore/10"
                    >
                      <Share2 className="w-4 h-4 text-dore" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isUnlocked ? (
            /* ========== UNLOCKED STATE - Beautiful Message Display ========== */
            <div className="space-y-6 animate-fade-in">
              {/* Decorative Header */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-dore/30 to-primary/30 animate-unlock">
                  <Unlock className="w-8 h-8 text-dore" />
                </div>
                <div>
                  <p className="text-sm text-dore font-medium uppercase tracking-wider">
                    Message déverrouillé
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(unlockDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>

              {/* Message Card - The Star */}
              <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-b from-card to-card/80">
                {/* Decorative top border */}
                <div className="h-1.5 bg-gradient-to-r from-primary via-dore to-primary" />
                
                <CardContent className="p-8 space-y-6">
                  {/* Recipient */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Pour</p>
                    <p className="font-serif text-2xl font-bold text-foreground mt-1">
                      {message.recipient_name}
                    </p>
                  </div>

                  {/* Decorative Divider */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/30" />
                    <Heart className="w-4 h-4 text-primary" fill="currentColor" />
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/30" />
                  </div>

                  {/* The Message - Main Focus */}
                  <div className="py-4">
                    <p className="text-foreground text-xl leading-relaxed whitespace-pre-wrap text-center font-serif italic">
                      "{message.content}"
                    </p>
                  </div>

                  {/* Decorative Hearts */}
                  <div className="flex justify-center gap-2">
                    <Heart className="w-4 h-4 text-primary/40" fill="currentColor" />
                    <Heart className="w-5 h-5 text-primary/60 animate-pulse-soft" fill="currentColor" />
                    <Heart className="w-4 h-4 text-primary/40" fill="currentColor" />
                  </div>
                </CardContent>
              </Card>

              {/* Subtle branding */}
              <p className="text-center text-xs text-muted-foreground">
                Envoyé avec 💕 via À L'Heure Juste
              </p>
            </div>
          ) : (
            /* ========== LOCKED STATE - Countdown ========== */
            <div className="space-y-6 animate-fade-in">
              {/* Floating Lock Icon */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-dore/20 animate-float">
                  <Lock className="w-12 h-12 text-primary" />
                </div>
              </div>

              {/* Message Card */}
              <Card className="border-0 shadow-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary via-dore to-primary" />
                
                <CardContent className="p-8 space-y-6 text-center">
                  <div className="space-y-2">
                    <h1 className="font-serif text-2xl font-bold text-foreground">
                      {isCreator ? "Votre message est verrouillé" : "Un message spécial vous attend !"}
                    </h1>
                    <p className="text-muted-foreground">
                      {isCreator ? (
                        <>Ce message pour <span className="font-medium text-foreground">{message.recipient_name}</span> sera déverrouillé bientôt.</>
                      ) : (
                        <>Bonjour <span className="font-medium text-foreground">{message.recipient_name}</span>,
                        <br />un message vous est réservé.</>
                      )}
                    </p>
                  </div>

                  {/* Countdown */}
                  <div className="bg-gradient-to-b from-secondary/50 to-secondary/30 rounded-2xl p-6 space-y-4">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-dore" />
                      Déverrouillage dans
                    </p>
                    
                    <div className="grid grid-cols-4 gap-3">
                      <CountdownUnit value={countdown.days} label="jours" />
                      <CountdownUnit value={countdown.hours} label="heures" />
                      <CountdownUnit value={countdown.minutes} label="min" />
                      <CountdownUnit value={countdown.seconds} label="sec" />
                    </div>
                    
                    <p className="text-sm font-medium text-foreground">
                      Le {format(unlockDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>

                  {!isCreator && (
                    <p className="text-muted-foreground italic">
                      Patience... le meilleur arrive au bon moment 💕
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========== CTA Section - Only for non-creators ========== */}
          {!isCreator && (
            <Card className="border-2 border-dashed border-dore/30 bg-gradient-to-b from-dore/5 to-transparent overflow-hidden">
              <CardContent className="p-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-dore/20">
                  <Send className="w-6 h-6 text-dore" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    Vous aussi, surprenez vos proches
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Créez un message qui se déverrouillera au moment parfait
                  </p>
                </div>

                <Link to="/auth?mode=signup" className="block">
                  <Button 
                    size="lg"
                    className="w-full bg-dore hover:bg-dore-dark text-accent-foreground font-medium py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Créer mon message
                  </Button>
                </Link>

                <p className="text-xs text-muted-foreground">
                  Gratuit • 2 messages offerts à l'inscription
                </p>
              </CardContent>
            </Card>
          )}

          {/* Back to dashboard for creators */}
          {isCreator && (
            <div className="text-center">
              <Link to="/dashboard">
                <Button variant="outline" className="border-dore/30 text-dore hover:bg-dore/10">
                  Retour au tableau de bord
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 À L'Heure Juste • À l'instant parfait
        </p>
      </footer>
    </div>
  );
};

interface CountdownUnitProps {
  value: number;
  label: string;
}

const CountdownUnit = ({ value, label }: CountdownUnitProps) => (
  <div className="bg-background rounded-xl p-3 border border-border/50 shadow-sm">
    <div className="text-2xl font-bold text-dore">{value.toString().padStart(2, '0')}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

export default ViewMessage;
