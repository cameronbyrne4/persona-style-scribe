import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, PenTool, Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "@/components/UploadModal";
import { analytics } from "@/lib/analytics";
import { animate, stagger, inView } from "motion";

interface DashboardProps {
  hasDocuments: boolean;
  hasCompletedOnboarding: boolean;
}

const Dashboard = ({ hasDocuments, hasCompletedOnboarding }: DashboardProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load user and documents on component mount
  const loadUserData = async () => {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Load user's documents
        const { data: docs, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', session.user.id)
          .order('uploaded_at', { ascending: false });
        
        if (error) {
          console.error('Error loading documents:', error);
        } else {
          setDocuments(docs || []);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Calculate style profile stats
  const totalWords = documents.reduce((sum, doc) => {
    return sum + (doc.extracted_text?.split(/\s+/).length || 0);
  }, 0);

  const styleStrength = documents.length >= 3 && totalWords >= 3000 ? "Excellent" : 
                       documents.length >= 2 && totalWords >= 2000 ? "Good" : 
                       documents.length >= 1 && totalWords >= 1000 ? "Fair" : "Poor";

  const features = [
    {
      title: "Style Transfer",
      description: "Transform any text to match your unique writing voice",
      icon: PenTool,
      path: "/style-transfer",
      color: "bg-blue-500/10 text-blue-600"
    },
    {
      title: "Research & Answer",
      description: "Ask questions about your documents and get AI-powered answers that sound like you",
      icon: Search,
      path: "/research-answer",
      color: "bg-green-500/10 text-green-600"
    },
    {
      title: "My Documents",
      description: "Manage your writing samples and view your style profile",
      icon: FileText,
      path: "/my-documents",
      color: "bg-purple-500/10 text-purple-600"
    }
  ];

  const handleUploadSuccess = () => {
    // Refresh the documents list
    loadUserData();
    // Dispatch custom event to notify Navigation component
    window.dispatchEvent(new CustomEvent('documents-changed'));
  };

  // Add animations on component mount
  useEffect(() => {
    // Page entrance animation
    animate(
      ".dashboard-content",
      { opacity: [0, 1], y: [30, 0] },
      { duration: 0.8, ease: "easeOut" }
    );

    // Features grid animation
    if (featuresRef.current) {
      inView(featuresRef.current, () => {
        animate(
          featuresRef.current.querySelectorAll('.feature-card'),
          { opacity: [0, 1], y: [40, 0] },
          { delay: stagger(0.15), duration: 0.6, ease: "easeOut" }
        );
      });
    }

    // Profile card animation
    if (profileRef.current) {
      inView(profileRef.current, () => {
        animate(
          profileRef.current.querySelectorAll('.profile-stat'),
          { opacity: [0, 1], scale: [0.8, 1] },
          { delay: stagger(0.1), duration: 0.5, ease: "easeOut" }
        );
      });
    }
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl dashboard-content">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-4xl font-playfair font-medium text-foreground mb-4">
            Welcome to Pensona
          </h1>
          <p className="text-lg text-muted-foreground font-inter max-w-2xl mx-auto">
            Your AI-powered writing assistant that learns your unique style and helps you create content that sounds authentically you.
          </p>
        </div>

        {/* Style Profile Overview */}
        <Card ref={profileRef} className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="font-playfair font-medium">Your Style Profile</CardTitle>
            <CardDescription className="font-inter">
              Current status of your writing style analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground font-inter">Loading your profile...</div>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center profile-stat">
                  <div className="text-2xl font-bold text-foreground mb-2">{documents.length}</div>
                  <div className="text-sm text-muted-foreground font-inter">Writing Samples</div>
                </div>
                <div className="text-center profile-stat">
                  <div className="text-2xl font-bold text-foreground mb-2">{totalWords.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground font-inter">Total Words</div>
                </div>
                <div className="text-center profile-stat">
                  <div className="text-2xl font-bold mb-2">
                    <span className={`${
                      styleStrength === 'Excellent' ? 'text-green-600' :
                      styleStrength === 'Good' ? 'text-blue-600' :
                      styleStrength === 'Fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {styleStrength}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground font-inter">Style Strength</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div>
          <h2 className="text-2xl font-playfair font-medium text-foreground mb-6 text-center">
            What would you like to do today?
          </h2>
          <div ref={featuresRef} className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={feature.path}
                  className="shadow-soft border-0 hover:shadow-lg transition-all duration-300 cursor-pointer feature-card hover:scale-[1.02] hover:-translate-y-1"
                  onClick={() => {
                    analytics.trackFeature('dashboard_feature_clicked', { 
                      feature: feature.title.toLowerCase().replace(/\s+/g, '_'),
                      path: feature.path 
                    });
                    navigate(feature.path);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`p-3 rounded-lg ${feature.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-playfair font-medium text-lg">{feature.title}</h3>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-inter">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        {!hasDocuments && hasCompletedOnboarding && (
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium">Add Writing Samples</CardTitle>
              <CardDescription className="font-inter">
                Upload new writing samples to restore your style profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="academic" 
                onClick={() => {
                  analytics.trackFeature('upload_modal_opened', { source: 'dashboard' });
                  setShowUploadModal(true);
                }}
                className="font-inter"
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Samples
              </Button>
            </CardContent>
          </Card>
        )}

        {!hasDocuments && !hasCompletedOnboarding && (
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium">Get Started</CardTitle>
              <CardDescription className="font-inter">
                Upload your first writing sample to start using Pensona
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="academic" 
                onClick={() => navigate("/onboarding")}
                className="font-inter"
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload Writing Samples
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Modal */}
        <UploadModal 
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
          documents={documents}
          totalWords={totalWords}
          refreshDocuments={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: docs, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', session.user.id)
                .order('uploaded_at', { ascending: false });
              if (!error) {
                setDocuments(docs || []);
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;