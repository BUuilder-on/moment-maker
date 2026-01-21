import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

interface LogoProps {
  to?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ to = "/", size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  const content = (
    <div className="flex items-center gap-2">
      <img 
        src={logo} 
        alt="À L'Heure Juste" 
        className={`${sizeClasses[size]} object-contain`}
      />
      {showText && (
        <span className="font-serif text-lg font-semibold text-foreground">
          À L'Heure Juste
        </span>
      )}
    </div>
  );

  return to ? (
    <Link to={to} className="flex items-center gap-2">
      {content}
    </Link>
  ) : (
    content
  );
};

export default Logo;
