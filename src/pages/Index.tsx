import { Heart, Clock, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 flex items-center justify-between">
        <Logo showText={false} />
        <Link to="/auth">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Connexion
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-lg mx-auto text-center space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="relative inline-block">
            <Logo to="" size="lg" showText={false} />
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-tight">
              À L'Heure Juste
            </h1>
            <p className="text-xl md:text-2xl font-serif text-dore">
              Envoyez vos messages à l'instant parfait
            </p>
          </div>

          {/* Subtitle */}
          <p className="text-muted-foreground text-lg leading-relaxed">
            Créez des messages verrouillés et surprenez vos proches à la date et l'heure choisies
          </p>

          {/* CTA Button */}
          <Link to="/auth?mode=signup">
            <Button 
              size="lg" 
              className="bg-dore hover:bg-dore-dark text-accent-foreground font-medium px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Créer mon premier message
            </Button>
          </Link>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
            <FeatureCard 
              icon={<Clock className="w-6 h-6" />}
              title="Choisissez le moment"
              description="Date et heure précises"
            />
            <FeatureCard 
              icon={<Lock className="w-6 h-6" />}
              title="Message verrouillé"
              description="Jusqu'au moment parfait"
            />
            <FeatureCard 
              icon={<Heart className="w-6 h-6" />}
              title="Surprise garantie"
              description="Émotion assurée"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 À L'Heure Juste. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50 border border-border/50">
    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-dore">
      {icon}
    </div>
    <h3 className="font-medium text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;
