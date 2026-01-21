import { useState, useEffect } from "react";
import { Plus, Lock, Clock, CreditCard, LogOut, MessageSquare, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Logo from "@/components/Logo";

interface Message {
  id: string;
  recipient_name: string;
  unlock_at: string;
  is_read: boolean;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data);
    }
    setMessagesLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isMessageUnlocked = (unlockAt: string) => {
    return new Date(unlockAt) <= new Date();
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
        
        <div className="flex items-center gap-3">
          {/* Credits Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border/50">
            <CreditCard className="w-4 h-4 text-dore" />
            <span className="font-medium text-foreground">{profile?.credits ?? 0} crédits</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
              Bienvenue sur À L'Heure Juste
            </h1>
            <p className="text-muted-foreground">
              Créez des messages qui se déverrouillent au moment parfait
            </p>
          </div>

          {/* Create Message CTA */}
          <Card className="border-dashed border-2 border-dore/30 bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group">
            <Link to="/create">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-dore/20 flex items-center justify-center mb-4 group-hover:bg-dore/30 transition-colors">
                  <Plus className="w-8 h-8 text-dore" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  Créer un message
                </h3>
                <p className="text-muted-foreground text-center max-w-xs">
                  Rédigez un message qui se déverrouillera à la date et l'heure de votre choix
                </p>
              </CardContent>
            </Link>
          </Card>

          {/* Messages List */}
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-dore" />
              Mes messages
            </h2>

            {messagesLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-dore border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Vous n'avez pas encore créé de message.
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Créez votre premier message pour surprendre vos proches !
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {messages.map((message) => (
                  <MessageCard 
                    key={message.id} 
                    message={message} 
                    isUnlocked={isMessageUnlocked(message.unlock_at)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Credits Section */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-dore" />
                Mes crédits
              </CardTitle>
              <CardDescription>
                1 message = 1 crédit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground">Crédits disponibles</span>
                <span className="text-2xl font-bold text-dore">{profile?.credits ?? 0}</span>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-dore/30 text-dore hover:bg-dore/10"
              >
                Obtenir plus de crédits
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

interface MessageCardProps {
  message: Message;
  isUnlocked: boolean;
}

const MessageCard = ({ message, isUnlocked }: MessageCardProps) => {
  const unlockDate = new Date(message.unlock_at);
  
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isUnlocked ? "bg-green-100" : "bg-primary/20"
          }`}>
            {isUnlocked ? (
              <Unlock className="w-5 h-5 text-green-600" />
            ) : (
              <Lock className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">Pour {message.recipient_name}</p>
            <p className="text-sm text-muted-foreground">
              {isUnlocked 
                ? `Déverrouillé le ${format(unlockDate, "PPP", { locale: fr })}`
                : `Déverrouillage le ${format(unlockDate, "PPP 'à' HH:mm", { locale: fr })}`
              }
            </p>
          </div>
        </div>
        <Link to={`/m/${message.id}`}>
          <Button variant="ghost" size="sm">
            Voir
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
