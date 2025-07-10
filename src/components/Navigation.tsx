import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Circle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "User";
  const email = user?.email;

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
            <span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 border border-green-200 rounded-full">
                <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" /> Active
              </span>
            </span>
            {user && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="focus:outline-none">
                    <Avatar>
                      <AvatarImage src={avatarUrl} alt={name} />
                      <AvatarFallback>{name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-4">
                  <div className="flex flex-col items-center mb-3">
                    <Avatar className="w-14 h-14 mb-2">
                      <AvatarImage src={avatarUrl} alt={name} />
                      <AvatarFallback>{name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium text-base text-foreground text-center">{name}</div>
                    <div className="text-xs text-muted-foreground text-center mt-0.5">{email}</div>
                  </div>
                  <div className="border-t border-border my-2" />
                  <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation; 