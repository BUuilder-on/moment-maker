import { useState } from "react";
import { Plus, Lock, Clock, CreditCard, LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [credits] = useState(2); // Simulated - will come from Supabase
  const [messages] = useState<any[]>([]); // Simulated - will come from Supabase

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/50 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-lg font-semibold text-foreground">
            À L'Heure Juste
          </span>
        </Link>
        
        <div className="flex items-center gap-3">
          {/* Credits Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border/50">
            <CreditCard className="w-4 h-4 text-dore" />
            <span className="font-medium text-foreground">{credits} crédits</span>
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

            {messages.length === 0 ? (
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
                  <MessageCard key={message.id} message={message} />
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
                <span className="text-2xl font-bold text-dore">{credits}</span>
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
  message: {
    id: string;
    recipientName: string;
    unlockDate: Date;
    isUnlocked: boolean;
  };
}

const MessageCard = ({ message }: MessageCardProps) => (
  <Card className="border-border/50 hover:shadow-md transition-shadow">
    <CardContent className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          message.isUnlocked ? "bg-green-100" : "bg-primary/20"
        }`}>
          <Lock className={`w-5 h-5 ${message.isUnlocked ? "text-green-600" : "text-primary"}`} />
        </div>
        <div>
          <p className="font-medium text-foreground">Pour {message.recipientName}</p>
          <p className="text-sm text-muted-foreground">
            {message.isUnlocked ? "Déverrouillé" : `Déverrouillage le ${message.unlockDate.toLocaleDateString()}`}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm">
        Voir
      </Button>
    </CardContent>
  </Card>
);

export default Dashboard;
