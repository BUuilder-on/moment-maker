import { useState, useEffect } from "react";
import { Lock, Heart, Clock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { differenceInSeconds, format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

interface Message {
  id: string;
  recipient_name: string;
  content: string;
  unlock_at: string;
  is_read: boolean;
}

const ViewMessage = () => {
  const { messageId } = useParams();
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dore border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="w-full py-4 px-6">
          <Logo />
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <Card className="max-w-md w-full border-border/50">
            <CardContent className="py-12 text-center">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="font-serif text-xl font-bold text-foreground mb-2">
                Message introuvable
              </h1>
              <p className="text-muted-foreground mb-6">
                {error || "Ce message n'existe pas ou a été supprimé."}
              </p>
              <Link to="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const unlockDate = new Date(message.unlock_at);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6">
        <Logo />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-lg mx-auto w-full">
          {isUnlocked ? (
            /* Unlocked State */
            <Card className="border-border/50 shadow-xl animate-scale-in overflow-hidden">
              <div className="bg-gradient-to-r from-primary/30 to-secondary p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center mx-auto mb-4 animate-unlock">
                  <Unlock className="w-10 h-10 text-dore" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-foreground">
                  Votre message est prêt !
                </h1>
                <p className="text-muted-foreground mt-1">
                  Déverrouillé le {format(unlockDate, "PPP 'à' HH:mm", { locale: fr })}
                </p>
              </div>
              
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Pour {message.recipient_name}
                  </p>
                </div>
                
                <div className="bg-secondary/30 rounded-xl p-6 border border-border/50">
                  <p className="text-foreground text-lg leading-relaxed whitespace-pre-wrap text-center font-serif">
                    {message.content}
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <Heart className="w-6 h-6 text-primary animate-pulse-soft" fill="currentColor" />
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Locked State */
            <Card className="border-border/50 shadow-xl animate-fade-in">
              <CardContent className="py-12 text-center space-y-8">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-float">
                  <Lock className="w-12 h-12 text-primary" />
                </div>
                
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl font-bold text-foreground">
                    Un message spécial vous attend !
                  </h1>
                  <p className="text-muted-foreground">
                    Bonjour {message.recipient_name}, un message vous est réservé.
                  </p>
                </div>

                {/* Countdown */}
                <div className="bg-secondary/50 rounded-xl p-6">
                  <p className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    Déverrouillage dans
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <CountdownUnit value={countdown.days} label="jours" />
                    <CountdownUnit value={countdown.hours} label="heures" />
                    <CountdownUnit value={countdown.minutes} label="min" />
                    <CountdownUnit value={countdown.seconds} label="sec" />
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    Le {format(unlockDate, "PPP 'à' HH:mm", { locale: fr })}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Patience... le meilleur arrive au bon moment 💕
                </p>
              </CardContent>
            </Card>
          )}

          {/* CTA for non-users */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Vous aussi, surprenez vos proches
            </p>
            <Link to="/auth?mode=signup">
              <Button variant="outline" className="border-dore/30 text-dore hover:bg-dore/10">
                Créer mon premier message
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

interface CountdownUnitProps {
  value: number;
  label: string;
}

const CountdownUnit = ({ value, label }: CountdownUnitProps) => (
  <div className="bg-background rounded-lg p-3 border border-border/50">
    <div className="text-2xl font-bold text-dore">{value.toString().padStart(2, '0')}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

export default ViewMessage;
