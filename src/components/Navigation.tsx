import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="w-8 h-8 bg-gradient-primary rounded-lg"></div>
              <h1 className="text-xl font-playfair font-medium text-foreground">PersonaPen</h1>
            </div>
            
            {/* Navigation Links */}
            <nav className="flex items-center space-x-1">
              <Button 
                variant={isActive("/style-transfer") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/style-transfer")}
                className="font-inter"
              >
                Style Transfer
              </Button>
              <Button 
                variant={isActive("/research-answer") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/research-answer")}
                className="font-inter"
              >
                Research & Answer
              </Button>
              <Button 
                variant={isActive("/my-documents") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/my-documents")}
                className="font-inter"
              >
                My Documents
              </Button>
            </nav>
          </div>
          
          {/* User Section */}
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="font-inter">
              Style Profile Active
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation; 