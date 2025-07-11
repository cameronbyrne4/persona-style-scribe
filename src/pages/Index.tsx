import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, RefreshCw, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg"></div>
              <h1 className="text-xl font-playfair font-medium text-foreground">Pensona</h1>
            </Link>
            <Badge variant="secondary" className="font-inter">Demo Mode</Badge>
          </div>
          
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Landing
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-playfair font-medium text-foreground mb-4">
            Pensona Demo
          </h1>
          <p className="text-xl text-muted-foreground font-inter mb-8">
            Explore the features that make Pensona perfect for academic writing
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="shadow-soft border-0 text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-playfair font-medium">Landing Page</CardTitle>
              <CardDescription className="font-inter">
                Clean, academic design with clear value proposition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/">
                <Button variant="minimal" className="w-full font-inter">
                  View Landing
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-0 text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-playfair font-medium">Onboarding Flow</CardTitle>
              <CardDescription className="font-inter">
                Seamless style profile creation process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/onboarding">
                <Button variant="minimal" className="w-full font-inter">
                  Try Onboarding
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-0 text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="font-playfair font-medium">Main Dashboard</CardTitle>
              <CardDescription className="font-inter">
                Style transfer and RAG functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard">
                <Button variant="academic" className="w-full font-inter">
                  Open Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elegant border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-playfair font-medium text-center">Design System Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div>
                <div className="w-16 h-16 bg-gradient-primary rounded-lg mx-auto mb-3"></div>
                <p className="font-inter text-sm text-muted-foreground">Academic Green<br/>Brand Colors</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-card border border-border rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="font-playfair text-lg font-medium">Aa</span>
                </div>
                <p className="font-inter text-sm text-muted-foreground">Playfair Display<br/>Headings</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-card border border-border rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <span className="font-inter text-lg">Aa</span>
                </div>
                <p className="font-inter text-sm text-muted-foreground">Inter<br/>Body Text</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-card shadow-elegant rounded-lg mx-auto mb-3"></div>
                <p className="font-inter text-sm text-muted-foreground">Elegant<br/>Shadows</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
