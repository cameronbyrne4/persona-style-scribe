import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Upload, RefreshCw, MessageSquare, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-academic.jpg";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef } from "react";
import { animate, stagger, inView, scroll } from "motion";

// Accept user as a prop
const Landing = ({ user }) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero section entrance animation
    if (heroRef.current) {
      animate(
        heroRef.current.querySelectorAll('h1, p, button'),
        { opacity: [0, 1], y: [30, 0] },
        { delay: stagger(0.2), duration: 0.8, ease: "easeOut" }
      );
    }

    // How it works cards animation
    if (cardsRef.current) {
      inView(cardsRef.current, () => {
        animate(
          cardsRef.current.querySelectorAll('.card-animate'),
          { opacity: [0, 1], y: [40, 0] },
          { delay: stagger(0.15), duration: 0.6, ease: "easeOut" }
        );
      });
    }

    // Benefits section animation
    if (benefitsRef.current) {
      inView(benefitsRef.current, () => {
        animate(
          benefitsRef.current.querySelectorAll('.benefit-item'),
          { opacity: [0, 1], x: [-20, 0] },
          { delay: stagger(0.1), duration: 0.5, ease: "easeOut" }
        );
      });
    }
  }, []);

  const handleGetStarted = () => {
    window.location.href = "/onboarding";
  };

  const handleSignIn = () => {
    supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleGoToDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/10 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/Pensona.png" alt="Pensona logo" className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="text-xl font-playfair font-medium text-white">Pensona</h1>
          </div>
          {/* Conditionally render button based on user */}
          {user ? (
            <Button variant="outline" size="sm" onClick={handleGoToDashboard} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              Go to Dashboard
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleSignIn} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Fullscreen Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Academic writing workspace with books and fountain pen" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        {/* Centered Hero Content */}
        <div ref={heroRef} className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 md:p-12 shadow-2xl">
            <h1 className="text-5xl md:text-7xl font-playfair font-medium text-white mb-6 leading-tight">
              Essays in <span className="text-green-300">Your Voice</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 font-inter max-w-3xl mx-auto">
              Generate high-quality academic writing that authentically reflects your unique personal style. 
              Stop spending hours tweaking generic AI text.
            </p>
            <Button 
              variant="academic" 
              size="lg" 
              onClick={handleSignIn}
              className="font-inter font-medium bg-white text-gray-900 hover:bg-white/90 shadow-lg"
            >
              Get Started with Google
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-white/70 mt-4 font-inter">
              Free to start • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-subtle py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair font-medium text-foreground mb-4">
              How Pensona Works
            </h2>
            <p className="text-lg text-muted-foreground font-inter max-w-2xl mx-auto">
              Three simple steps to transform your writing workflow
            </p>
          </div>

        <div ref={cardsRef} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center shadow-soft border-0 card-animate hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-playfair font-medium text-foreground mb-3">
                Upload Your Writing
              </h3>
              <p className="text-muted-foreground font-inter">
                Share 2-3 of your best essays (3,000-5,000 words total) to create your style profile
              </p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-soft border-0 card-animate hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-playfair font-medium text-foreground mb-3">
                Style Transfer
              </h3>
              <p className="text-muted-foreground font-inter">
                Input any text and watch it transform to match your unique writing voice and cadence
              </p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-soft border-0 card-animate hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-playfair font-medium text-foreground mb-3">
                Research & Answer
              </h3>
              <p className="text-muted-foreground font-inter">
                Upload source materials and ask questions. Get well-researched answers in your style
              </p>
            </CardContent>
          </Card>
        </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card/50 py-20">
        <div className="container mx-auto px-4">
          <div ref={benefitsRef} className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-playfair font-medium text-center text-foreground mb-12">
              Why Choose Pensona?
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4 benefit-item">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-inter font-medium text-foreground mb-1">
                    Authentic Voice
                  </h3>
                  <p className="text-muted-foreground font-inter">
                    Advanced AI learns your writing patterns, vocabulary, and style to produce text that sounds genuinely like you
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 benefit-item">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-inter font-medium text-foreground mb-1">
                    Academic Excellence
                  </h3>
                  <p className="text-muted-foreground font-inter">
                    Designed specifically for humanities students with focus on essay writing and scholarly analysis
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 benefit-item">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-inter font-medium text-foreground mb-1">
                    Time Saving
                  </h3>
                  <p className="text-muted-foreground font-inter">
                    Eliminate hours of manual editing. Get publication-ready text that matches your voice from the start
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 benefit-item">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-inter font-medium text-foreground mb-1">
                    Source-Based Research
                  </h3>
                  <p className="text-muted-foreground font-inter">
                    Upload documents and get accurate, well-cited responses that maintain academic integrity
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-subtle py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-playfair font-medium text-foreground mb-4">
              Ready to Write in Your Voice?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 font-inter">
              Join students who are already creating better essays faster
            </p>
            <Button 
              variant="academic" 
              size="lg" 
              onClick={handleGetStarted}
              className="font-inter font-medium"
            >
              Start Your Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src="/Pensona.png" alt="Pensona logo" className="w-6 h-6 rounded object-cover" />
            <span className="font-playfair font-medium text-foreground">Pensona</span>
          </div>
          <p className="text-sm text-muted-foreground font-inter">
            © 2025 Pensona. Academic writing in your authentic voice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;