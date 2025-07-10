import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Upload, FileText, Send, X, ChevronDown, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Add interface for RAG conversation messages
interface RAGMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
}

const ResearchAnswer = () => {
  const [question, setQuestion] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [ragMessages, setRagMessages] = useState<RAGMessage[]>([]);
  const [currentSourceName, setCurrentSourceName] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSourceText, setShowSourceText] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      // Prepare source content
      let sourceContent = "";
      if (sourceText) {
        sourceContent = sourceText;
      } else if (sourceFile) {
        // Read the file content directly
        if (sourceFile.type === 'text/plain' || sourceFile.name.endsWith('.txt')) {
          sourceContent = await sourceFile.text();
        } else {
          throw new Error("Only text files (.txt) are currently supported for file uploads");
        }
      }

      // TODO: Implement RAG API call here
      // For now, simulate a response
      setTimeout(() => {
        const answerMessage: RAGMessage = {
          id: (Date.now() + 1).toString(),
          type: 'answer',
          content: `This is a simulated response to: "${question}". In a real implementation, this would be the AI's answer based on the source material.`,
          timestamp: new Date()
        };
        setRagMessages(prev => [...prev, answerMessage]);
        setIsGenerating(false);
        setQuestion("");
      }, 2000);
      
    } catch (error) {
      console.error('RAG query error:', error);
      toast({
        title: "Research failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const clearRAGConversation = () => {
    setRagMessages([]);
    setQuestion("");
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleSourceFileChange = (file: File | null) => {
    setSourceFile(file);
    if (file) {
      setCurrentSourceName(file.name);
      setSourceText(""); // Clear text input when file is selected
    } else {
      setCurrentSourceName("");
    }
  };

  const handleSourceTextChange = (text: string) => {
    setSourceText(text);
    if (text.trim()) {
      setCurrentSourceName("Pasted Text");
      setSourceFile(null); // Clear file input when text is entered
    } else {
      setCurrentSourceName("");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard",
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        {/* Source Input Section - Only show if no source is set */}
        {!currentSourceName && (
          <Card className="shadow-soft border-0">
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
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
          <div className="p-4 bg-muted/20 rounded-lg border border-border">
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
        {currentSourceName && (
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium">Research Chat</CardTitle>
              <CardDescription className="font-inter">
                Generate answers to your questions about your reading passages in your voice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-96">
                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  {ragMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResearchAnswer; 