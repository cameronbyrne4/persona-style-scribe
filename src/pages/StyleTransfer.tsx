import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { animate, stagger } from "motion";

const StyleTransfer = () => {
  const [inputText, setInputText] = useState(() => {
    return localStorage.getItem('Pensona_style_input') || "";
  });
  const [outputText, setOutputText] = useState(() => {
    return localStorage.getItem('Pensona_style_output') || "";
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const outputRef = useRef<HTMLDivElement>(null);

  // Persist inputText and outputText to localStorage
  useEffect(() => {
    localStorage.setItem('Pensona_style_input', inputText);
  }, [inputText]);
  useEffect(() => {
    if (outputText) {
      localStorage.setItem('Pensona_style_output', outputText);
    } else {
      localStorage.removeItem('Pensona_style_output');
    }
  }, [outputText]);

  const handleStyleTransfer = async () => {
    if (!inputText.trim()) {
      toast({
        title: "No input provided",
        description: "Please enter text to rewrite in your style",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get the user's JWT token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      // Call the style transfer Edge Function
      const response = await fetch('https://kiusphbzbtkdykmnvgmq.supabase.co/functions/v1/style-transfer', {
        method: 'POST',
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ inputText: inputText.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log("Edge Function error details:", errorData);
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setOutputText(result.generatedText);
      
      // Animate the output appearance
      setTimeout(() => {
        if (outputRef.current) {
          animate(
            outputRef.current,
            { opacity: [0, 1], y: [20, 0] },
            { duration: 0.6, ease: "easeOut" }
          );
        }
      }, 100);
      
      toast({
        title: "Style transfer complete",
        description: "Your text has been rewritten in your unique voice",
      });
      
    } catch (error) {
      console.error('Style transfer error:', error);
      toast({
        title: "Style transfer failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard",
    });
  };

  // Optionally, add a clear function if you want to clear state on demand
  const clearStyleTransfer = () => {
    setInputText("");
    setOutputText("");
    localStorage.removeItem('Pensona_style_input');
    localStorage.removeItem('Pensona_style_output');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        <Card className="shadow-soft border-0">
          <CardHeader>
            <CardTitle className="font-playfair font-medium">Rewrite in Your Style</CardTitle>
            <CardDescription className="font-inter">
              Paste any text and transform it to match your unique writing voice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-inter font-medium text-foreground mb-2 block">
                Input Text
              </label>
              <Textarea
                placeholder="Paste the text you want to rewrite in your style..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-32 font-inter"
              />
            </div>
            
            <Button 
              variant="academic" 
              onClick={handleStyleTransfer}
              disabled={isGenerating}
              className="font-inter font-medium"
            >
              {isGenerating ? "Generating..." : "Transform Text"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {outputText && (
          <Card ref={outputRef} className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium flex items-center justify-between">
                Generated Output
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(outputText)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={outputText}
                onChange={e => setOutputText(e.target.value)}
                className="bg-muted/30 p-4 rounded-lg font-inter text-foreground min-h-32"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StyleTransfer; 