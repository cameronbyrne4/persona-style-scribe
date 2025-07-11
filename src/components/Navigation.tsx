import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { User, LogOut, Circle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { animate, stagger } from "motion";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDocuments(session.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchDocuments(session.user.id);
      } else {
        setDocuments([]);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Listen for document changes from other components
  useEffect(() => {
    const handleDocumentChange = () => {
      if (user) {
        fetchDocuments(user.id);
      }
    };

    // Listen for custom events when documents are added/deleted
    window.addEventListener('documents-changed', handleDocumentChange);
    
    return () => {
      window.removeEventListener('documents-changed', handleDocumentChange);
    };
  }, [user]);

  const fetchDocuments = async (userId: string) => {
    try {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
      if (!error) {
        setDocuments(docs || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

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

  // Calculate total words from documents
  const totalWords = documents.reduce((sum, doc) => {
    return sum + (doc.extracted_text?.split(/\s+/).length || 0);
  }, 0);

  // Navigation entrance animation
  useEffect(() => {
    animate(
      ".nav-item",
      { opacity: [0, 1], x: [-20, 0] },
      { delay: stagger(0.1), duration: 0.5, ease: "easeOut" }
    );
  }, []);

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
              <img src="/Pensona.png" alt="Pensona logo" className="w-8 h-8 rounded-lg object-cover" />
              <h1 className="text-xl font-playfair font-medium text-foreground">Pensona</h1>
            </div>
            {/* Navigation Links */}
            <nav className="flex items-center space-x-1">
              <Button 
                variant={isActive("/style-transfer") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/style-transfer")}
                className="font-inter nav-item"
              >
                Style Transfer
              </Button>
              <Button 
                variant={isActive("/research-answer") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/research-answer")}
                className="font-inter nav-item"
              >
                Research & Answer
              </Button>
              <Button 
                variant={isActive("/my-documents") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/my-documents")}
                className="font-inter nav-item"
              >
                My Documents
              </Button>
              <Button 
                variant={isActive("/history") ? "academic" : "ghost"} 
                size="sm"
                onClick={() => navigate("/history")}
                className="font-inter nav-item"
              >
                History
              </Button>
            </nav>
          </div>
          {/* User Section */}
          <div className="flex items-center space-x-4">
            <span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full ${
                documents.length > 0 && totalWords > 0 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                <Circle className={`h-2 w-2 mr-1 ${
                  documents.length > 0 && totalWords > 0 
                    ? 'fill-green-500 text-green-500' 
                    : 'fill-red-500 text-red-500'
                }`} /> 
                {documents.length > 0 && totalWords > 0 ? 'Active' : 'Inactive'}
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