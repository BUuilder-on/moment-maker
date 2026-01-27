import { useState, useEffect } from "react";
import { Mail, KeyRound, ArrowRight, Eye, EyeOff, Ticket, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp, signIn, isLoading: authLoading } = useAuth();
  
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    activationCode: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "signup") {
        if (!formData.activationCode) {
          toast.error("Le code d'activation est obligatoire");
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.activationCode
        );

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Cette adresse email est déjà utilisée");
          } else if (error.message.includes("activation")) {
            toast.error(error.message);
          } else {
            toast.error("Erreur lors de l'inscription: " + error.message);
          }
          setIsLoading(false);
          return;
        }

        toast.success("Compte créé avec succès ! Bienvenue !");
        navigate("/dashboard");
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou mot de passe incorrect");
          } else {
            toast.error("Erreur de connexion: " + error.message);
          }
          setIsLoading(false);
          return;
        }

        toast.success("Connexion réussie !");
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    }

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dore border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6">
        <Logo />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <Card className="w-full max-w-md border-border/50 shadow-lg animate-scale-in">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-2">
              <Logo to="" size="lg" showText={false} />
            </div>
            <CardTitle className="font-serif text-2xl">
              {mode === "login" ? "Bon retour parmi nous" : "Créez votre compte"}
            </CardTitle>
            <CardDescription>
              {mode === "login" 
                ? "Connectez-vous pour accéder à vos messages" 
                : "Commencez à créer des messages magiques"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Activation Code (signup only) */}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="activationCode">Code d'activation</Label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="activationCode"
                      name="activationCode"
                      type="text"
                      placeholder="Entrez votre code"
                      value={formData.activationCode}
                      onChange={handleInputChange}
                      className="pl-10 uppercase"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le code d'activation vous donne accès à vos premiers crédits
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-dore hover:bg-dore-dark text-accent-foreground py-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-dore hover:text-dore-dark font-medium transition-colors"
                  >
                    Créer un compte
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Déjà un compte ?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-dore hover:text-dore-dark font-medium transition-colors"
                  >
                    Se connecter
                  </button>
                </p>
              )}
            </div>

            {/* Contact Support */}
            <div className="mt-4 text-center">
              <a
                href="https://t.me/josuesourcing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-dore transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Contacter le support
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
