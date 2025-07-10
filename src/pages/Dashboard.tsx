import { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  Trash2,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

// Add interface for RAG conversation messages
interface RAGMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("style-transfer");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [question, setQuestion] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ragMessages, setRagMessages] = useState<RAGMessage[]>([]);
  const [currentSourceName, setCurrentSourceName] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSourceText, setShowSourceText] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load user and documents on component mount
  useEffect(() => {
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
            toast({
              title: "Error loading documents",
              description: error.message,
              variant: "destructive",
            });
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

    loadUserData();
  }, [toast]);

  // Calculate style profile stats
  const totalWords = documents.reduce((sum, doc) => {
    return sum + (doc.extracted_text?.split(/\s+/).length || 0);
  }, 0);

  const styleStrength = documents.length >= 3 && totalWords >= 3000 ? "Excellent" : 
                       documents.length >= 2 && totalWords >= 2000 ? "Good" : 
                       documents.length >= 1 && totalWords >= 1000 ? "Fair" : "Poor";

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

  const handleRAGQuery = async () => {
    if (!question.trim() || (!sourceFile && !sourceText.trim())) {
      toast({
        title: "Missing requirements",
        description: "Please upload a source document or paste text, and enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Add question to conversation
    const questionMessage: RAGMessage = {
      id: Date.now().toString(),
      type: 'question',
      content: question,
      timestamp: new Date()
    };
    setRagMessages(prev => [...prev, questionMessage]);
    
    try {
      // Get the user's JWT token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Prepare source content
      let sourceContent = "";
      if (sourceText) {
        sourceContent = sourceText;
      } else if (sourceFile) {
        // Read the file content directly
        // Note: For production, you might want to upload to Supabase Storage first
        // and then pass the file path to the edge function
        if (sourceFile.type === 'text/plain' || sourceFile.name.endsWith('.txt')) {
          sourceContent = await sourceFile.text();
        } else {
          throw new Error("Only text files (.txt) are currently supported for file uploads");
        }
      }
      
      // Call the RAG Edge Function
      const response = await fetch('https://kiusphbzbtkdykmnvgmq.supabase.co/functions/v1/rag-qa', {
        method: 'POST',
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          question: question.trim(),
          sourceText: sourceContent,
          sourceFile: null // We're passing content directly for now
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log("RAG Edge Function error details:", errorData);
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // Add answer to conversation
      const answerMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        type: 'answer',
        content: result.answer,
        timestamp: new Date()
      };
      setRagMessages(prev => [...prev, answerMessage]);
      setQuestion(""); // Clear question input
      
      toast({
        title: "Research complete",
        description: `Answer generated using ${result.chunksUsed} relevant sections from your source material`,
      });
      
    } catch (error) {
      console.error('RAG query error:', error);
      
      // Add error message to conversation
      const errorMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        type: 'answer',
        content: `Sorry, I encountered an error while processing your question: ${error instanceof Error ? error.message : "An unexpected error occurred"}`,
        timestamp: new Date()
      };
      setRagMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Research failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearRAGConversation = () => {
    setRagMessages([]);
    setSourceFile(null);
    setSourceText("");
    setCurrentSourceName("");
    setQuestion("");
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [ragMessages]);

  // Check if scroll button should be shown
  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [ragMessages]);

  const handleSourceFileChange = (file: File | null) => {
    setSourceFile(file);
    if (file) {
      setCurrentSourceName(file.name);
      setSourceText(""); // Clear pasted text when file is uploaded
    }
  };

  const handleSourceTextChange = (text: string) => {
    setSourceText(text);
    if (text.trim()) {
      setSourceFile(null); // Clear file when text is pasted
      setCurrentSourceName("Pasted Text");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text copied successfully",
    });
  };

  const cancelGeneration = () => {
    setIsGenerating(false);
    // Remove the last question if it was just added
    setRagMessages(prev => prev.filter(msg => msg.type !== 'question' || msg.timestamp.getTime() < Date.now() - 1000));
    toast({
      title: "Generation cancelled",
      description: "The request has been cancelled",
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
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <User className="h-4 w-4 mr-2" />
              Sign Out
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
                {loading ? (
                  <div className="space-y-3 text-sm font-inter">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm font-inter">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Samples analyzed:</span>
                      <span className="font-medium">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Word count:</span>
                      <span className="font-medium">{totalWords.toLocaleString()} words</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style strength:</span>
                      <span className={`font-medium ${
                        styleStrength === 'Excellent' ? 'text-green-600' :
                        styleStrength === 'Good' ? 'text-blue-600' :
                        styleStrength === 'Fair' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {styleStrength}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="style-transfer" className="font-inter">Style Transfer</TabsTrigger>
                <TabsTrigger value="rag" className="font-inter">Research & Answer</TabsTrigger>
                <TabsTrigger value="documents" className="font-inter">My Documents</TabsTrigger>
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
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(outputText)}>
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

              <TabsContent value="rag" className="h-[calc(100vh-300px)] flex flex-col">
                {/* Source Input Section - Only show if no source is set */}
                {!currentSourceName && (
                  <Card className="shadow-soft border-0 mb-4">
                    <CardHeader>
                      <CardTitle className="font-playfair font-medium">Set Up Your Research</CardTitle>
                      <CardDescription className="font-inter">
                        Upload a source document or paste text to start asking questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Source Input - Side by Side */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* File Upload */}
                        <div>
                          <label className="text-sm font-inter font-medium text-foreground mb-2 block">
                            Upload Document
                          </label>
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                            <input
                              type="file"
                              accept=".pdf,.txt"
                              onChange={(e) => handleSourceFileChange(e.target.files?.[0] || null)}
                              className="hidden"
                              id="source-upload"
                            />
                            <label htmlFor="source-upload" className="cursor-pointer">
                              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                              <p className="font-inter text-sm text-muted-foreground">
                                {sourceFile ? sourceFile.name : "Upload PDF or TXT file"}
                              </p>
                            </label>
                          </div>
                        </div>

                        {/* Text Input */}
                        <div>
                          <label className="text-sm font-inter font-medium text-foreground mb-2 block">
                            Or Paste Text
                          </label>
                          <Textarea
                            placeholder="Paste your source text here..."
                            value={sourceText}
                            onChange={(e) => handleSourceTextChange(e.target.value)}
                            className="min-h-32 font-inter"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Current Source Indicator */}
                {currentSourceName && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-inter text-sm font-medium">
                        Researching: {currentSourceName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowSourceText(!showSourceText)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {showSourceText ? 'Hide' : 'View'} Source
                      </Button>
                      {ragMessages.length > 0 && (
                        <Button variant="outline" size="sm" onClick={clearRAGConversation}>
                          <X className="h-4 w-4 mr-2" />
                          New Chat
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Source Text Dropdown */}
                {currentSourceName && showSourceText && (
                  <div className="mb-4 p-4 bg-muted/20 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-inter text-sm font-medium text-foreground">Source Material</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(sourceText)}
                        className="h-6 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy All
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <p className="font-inter text-sm text-muted-foreground leading-relaxed">
                        {sourceText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Chat Interface */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Messages Area */}
                  <div className="flex-1 overflow-hidden">
                    {ragMessages.length === 0 && currentSourceName ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-playfair font-medium text-lg mb-2">Ready to Research</h3>
                          <p className="text-muted-foreground font-inter">
                            Ask a question about your source material below
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div 
                        ref={chatContainerRef}
                        className="h-full overflow-y-auto space-y-4 p-4"
                      >
                        {ragMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === 'question' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-4 rounded-lg font-inter ${
                                message.type === 'question'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted/30 text-foreground'
                              }`}
                            >
                              <div className="text-sm font-medium mb-2">
                                {message.type === 'question' ? 'You' : 'PersonaPen'}
                              </div>
                              <div className="text-sm leading-relaxed">{message.content}</div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-xs opacity-70">
                                  {message.timestamp.toLocaleTimeString()}
                                </div>
                                {message.type === 'answer' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(message.content)}
                                    className="h-6 px-2 text-xs opacity-70 hover:opacity-100"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {isGenerating && (
                          <div className="flex justify-start">
                            <div className="bg-muted/30 p-4 rounded-lg font-inter max-w-[80%]">
                              <div className="text-sm font-medium mb-2">PersonaPen</div>
                              <div className="text-sm text-muted-foreground">
                                Researching your question...
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Input Area - Fixed at Bottom */}
                  {currentSourceName && (
                    <div className="border-t border-border bg-card p-4">
                      {/* Scroll to Bottom Button - Centered above input */}
                      {showScrollButton && (
                        <div className="flex justify-center mb-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={scrollToBottom}
                            className="rounded-full w-8 h-8 p-0 shadow-md"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="Ask a question about your source material..."
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          className="min-h-12 max-h-32 font-inter resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleRAGQuery();
                            }
                          }}
                        />
                        <div className="flex flex-col space-y-2">
                          <Button 
                            variant="academic" 
                            onClick={handleRAGQuery}
                            disabled={isGenerating || !question.trim()}
                            className="font-inter font-medium h-12 w-12 p-0"
                          >
                            {isGenerating ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          {isGenerating && (
                            <Button 
                              variant="outline" 
                              onClick={cancelGeneration}
                              className="font-inter font-medium h-12 w-12 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                <Card className="shadow-soft border-0">
                  <CardHeader>
                    <CardTitle className="font-playfair font-medium">Your Writing Samples</CardTitle>
                    <CardDescription className="font-inter">
                      View and manage the documents that define your writing style
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground font-inter">Loading your documents...</div>
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-playfair font-medium text-lg mb-2">No documents yet</h3>
                        <p className="text-muted-foreground font-inter mb-4">
                          Upload writing samples to create your style profile
                        </p>
                        <Button 
                          variant="academic" 
                          onClick={() => window.location.href = "/onboarding"}
                          className="font-inter"
                        >
                          Upload Samples
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {documents.map((doc) => (
                          <div key={doc.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="font-inter font-medium">
                                  {doc.file_url?.split('/').pop() || 'Document'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-muted-foreground font-inter">
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this document?')) {
                                      const { error } = await supabase
                                        .from('documents')
                                        .delete()
                                        .eq('id', doc.id);
                                      
                                      if (error) {
                                        toast({
                                          title: "Error deleting document",
                                          description: error.message,
                                          variant: "destructive",
                                        });
                                      } else {
                                        setDocuments(documents.filter(d => d.id !== doc.id));
                                        toast({
                                          title: "Document deleted",
                                          description: "Document removed from your style profile",
                                        });
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground font-inter">
                              {doc.extracted_text?.substring(0, 200)}...
                            </div>
                            <div className="text-xs text-muted-foreground font-inter mt-2">
                              {doc.extracted_text?.split(/\s+/).length || 0} words
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;