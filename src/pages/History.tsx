import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Clock, FileText, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface GenerationHistory {
  id: string;
  generation_type: 'STYLE_TRANSFER' | 'RAG_QA';
  input_text: string;
  output_text: string;
  created_at: string;
}

const History = () => {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching history:', error);
        toast({
          title: "Error",
          description: "Failed to load generation history",
          variant: "destructive",
        });
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Error",
        description: "Failed to load generation history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard",
    });
  };

  const getGenerationTypeLabel = (type: string) => {
    switch (type) {
      case 'STYLE_TRANSFER':
        return 'Style Transfer';
      case 'RAG_QA':
        return 'Research Answer';
      default:
        return type;
    }
  };

  const getGenerationTypeIcon = (type: string) => {
    switch (type) {
      case 'STYLE_TRANSFER':
        return <FileText className="h-4 w-4" />;
      case 'RAG_QA':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium">Generation History</CardTitle>
              <CardDescription className="font-inter">
                Loading your recent generations...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="font-playfair font-medium">Generation History</CardTitle>
            <CardDescription className="font-inter">
              Your recent style transfers and research answers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-playfair font-medium text-lg mb-2">No History Yet</h3>
                <p className="text-muted-foreground font-inter">
                  Your generation history will appear here once you start using the app.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <Card key={item.id} className="border border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getGenerationTypeIcon(item.generation_type)}
                          <Badge variant="secondary" className="font-inter">
                            {getGenerationTypeLabel(item.generation_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-inter">{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-inter font-medium text-sm mb-2 text-foreground">Input</h4>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="font-inter text-sm text-muted-foreground leading-relaxed">
                              {truncateText(item.input_text)}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-inter font-medium text-sm text-foreground">Output</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(item.output_text)}
                              className="h-6 px-2 text-xs"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="font-inter text-sm text-foreground leading-relaxed">
                              {truncateText(item.output_text)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History; 