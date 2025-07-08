import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  MessageSquare, 
  Upload, 
  Copy, 
  User, 
  FileText, 
  Settings,
  History,
  ArrowRight 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("style-transfer");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [question, setQuestion] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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
    
    // Simulate API call
    setTimeout(() => {
      setOutputText(`This is a sample rewrite of your input text in your personal academic style. The system has analyzed your writing patterns and applied them to transform: "${inputText.substring(0, 50)}..."`);
      setIsGenerating(false);
      toast({
        title: "Style transfer complete",
        description: "Your text has been rewritten in your unique voice",
      });
    }, 2000);
  };

  const handleRAGQuery = async () => {
    if (!question.trim() || !sourceFile) {
      toast({
        title: "Missing requirements",
        description: "Please upload a source document and enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate API call
    setTimeout(() => {
      setOutputText(`Based on the provided source document "${sourceFile?.name}", here is a comprehensive answer to your question in your writing style: The analysis reveals that ${question} can be understood through multiple perspectives...`);
      setIsGenerating(false);
      toast({
        title: "Research complete",
        description: "Your question has been answered using the source material",
      });
    }, 3000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText);
    toast({
      title: "Copied to clipboard",
      description: "Generated text copied successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg"></div>
            <h1 className="text-xl font-playfair font-medium text-foreground">PersonaPen</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="font-inter">
              Style Profile Active
            </Badge>
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-2" />
              Alex
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-soft border-0 mb-6">
              <CardHeader>
                <CardTitle className="font-playfair font-medium text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant={activeTab === "style-transfer" ? "academic" : "minimal"} 
                  className="w-full justify-start font-inter"
                  onClick={() => setActiveTab("style-transfer")}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Style Transfer
                </Button>
                <Button 
                  variant={activeTab === "rag" ? "academic" : "minimal"} 
                  className="w-full justify-start font-inter"
                  onClick={() => setActiveTab("rag")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Research & Answer
                </Button>
                <Separator />
                <Button variant="ghost" className="w-full justify-start font-inter">
                  <History className="mr-2 h-4 w-4" />
                  Recent Generations
                </Button>
                <Button variant="ghost" className="w-full justify-start font-inter">
                  <Settings className="mr-2 h-4 w-4" />
                  Style Settings
                </Button>
              </CardContent>
            </Card>

            {/* Style Profile Info */}
            <Card className="shadow-soft border-0">
              <CardHeader>
                <CardTitle className="font-playfair font-medium text-lg">Your Style Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm font-inter">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Samples analyzed:</span>
                    <span className="font-medium">3 essays</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Word count:</span>
                    <span className="font-medium">4,250 words</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Style strength:</span>
                    <span className="font-medium text-primary">Excellent</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="style-transfer" className="font-inter">Style Transfer</TabsTrigger>
                <TabsTrigger value="rag" className="font-inter">Research & Answer</TabsTrigger>
              </TabsList>

              <TabsContent value="style-transfer" className="space-y-6">
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
                  <Card className="shadow-soft border-0">
                    <CardHeader>
                      <CardTitle className="font-playfair font-medium flex items-center justify-between">
                        Generated Output
                        <Button variant="outline" size="sm" onClick={copyToClipboard}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 p-4 rounded-lg font-inter text-foreground">
                        {outputText}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="rag" className="space-y-6">
                <Card className="shadow-soft border-0">
                  <CardHeader>
                    <CardTitle className="font-playfair font-medium">Research & Answer</CardTitle>
                    <CardDescription className="font-inter">
                      Upload a source document and ask questions to get answers in your style
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-inter font-medium text-foreground mb-2 block">
                        Source Document
                      </label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.txt,.doc,.docx"
                          onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="source-upload"
                        />
                        <label htmlFor="source-upload" className="cursor-pointer">
                          <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="font-inter text-sm text-muted-foreground">
                            {sourceFile ? sourceFile.name : "Upload your source document"}
                          </p>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-inter font-medium text-foreground mb-2 block">
                        Your Question
                      </label>
                      <Textarea
                        placeholder="What would you like to know about the source material?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="min-h-24 font-inter"
                      />
                    </div>
                    
                    <Button 
                      variant="academic" 
                      onClick={handleRAGQuery}
                      disabled={isGenerating}
                      className="font-inter font-medium"
                    >
                      {isGenerating ? "Researching..." : "Generate Answer"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {outputText && (
                  <Card className="shadow-soft border-0">
                    <CardHeader>
                      <CardTitle className="font-playfair font-medium flex items-center justify-between">
                        Research Answer
                        <Button variant="outline" size="sm" onClick={copyToClipboard}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/30 p-4 rounded-lg font-inter text-foreground">
                        {outputText}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;