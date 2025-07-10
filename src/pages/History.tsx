import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Clock, FileText, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface GenerationHistory {
  id: string;
  generation_type: 'STYLE_TRANSFER' | 'RAG_QA';
  input_text: string;
  output_text: string;
  created_at: string;
}

interface ChatGroup {
  id: string;
  created_at: string;
  items: GenerationHistory[];
}

const History = () => {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChats, setExpandedChats] = useState<{ [chatId: string]: boolean }>({});
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
        .limit(50);

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

  // Group consecutive RAG_QA generations as a chat session
  const groupChats = (items: GenerationHistory[]): (GenerationHistory | ChatGroup)[] => {
    const result: (GenerationHistory | ChatGroup)[] = [];
    let currentChat: ChatGroup | null = null;
    let chatCounter = 1;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.generation_type === 'RAG_QA') {
        if (!currentChat) {
          currentChat = {
            id: `chat-${chatCounter++}`,
            created_at: item.created_at,
            items: [item],
          };
        } else {
          currentChat.items.push(item);
        }
        // If next item is not RAG_QA or end of list, push the chat
        if (i === items.length - 1 || items[i + 1].generation_type !== 'RAG_QA') {
          result.push(currentChat);
          currentChat = null;
        }
      } else {
        if (currentChat) {
          result.push(currentChat);
          currentChat = null;
        }
        result.push(item);
      }
    }
    return result;
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

  // Use distinct badge colors for each type
  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'STYLE_TRANSFER':
        return 'bg-primary/90 text-primary-foreground';
      case 'RAG_QA':
        return 'bg-blue-900 text-blue-100';
      default:
        return 'bg-muted text-foreground';
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

  const toggleChat = (chatId: string) => {
    setExpandedChats(prev => ({ ...prev, [chatId]: !prev[chatId] }));
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

  const grouped = groupChats(history);

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
            {grouped.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-playfair font-medium text-lg mb-2">No History Yet</h3>
                <p className="text-muted-foreground font-inter">
                  Your generation history will appear here once you start using the app.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {grouped.map((item, idx) => {
                  if ('items' in item) {
                    // Chat group (RAG_QA session)
                    const expanded = expandedChats[item.id] ?? false;
                    return (
                      <Card key={item.id} className="border border-blue-900/40 bg-blue-50/40 hover:border-blue-900/60 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleChat(item.id)}>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-900" />
                              <Badge className={getBadgeClass('RAG_QA') + ' font-inter'}>
                                Research Chat #{grouped.filter(g => 'items' in g).indexOf(item) + 1}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-2">{formatDate(item.created_at)}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" tabIndex={-1}>
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </div>
                          {expanded && (
                            <div className="space-y-4 mt-2">
                              {[...item.items].reverse().map((msg, i) => (
                                <Card key={msg.id} className="border border-blue-900/20 bg-white">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Badge className={getBadgeClass('RAG_QA') + ' font-inter'}>
                                          Q{i + 1}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground ml-2">{formatDate(msg.created_at)}</span>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(msg.output_text)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-inter font-medium text-sm mb-2 text-foreground">Input</h4>
                                        <div className="bg-muted/30 rounded-lg p-3">
                                          <p className="font-inter text-sm text-muted-foreground leading-relaxed">
                                            {truncateText(msg.input_text)}
                                          </p>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-inter font-medium text-sm text-foreground">Output</h4>
                                        <div className="bg-muted/30 rounded-lg p-3">
                                          <p className="font-inter text-sm text-foreground leading-relaxed">
                                            {truncateText(msg.output_text)}
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
                    );
                  } else {
                    // Style Transfer
                    return (
                      <Card key={item.id} className="border border-primary/30 hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {getGenerationTypeIcon(item.generation_type)}
                              <Badge className={getBadgeClass(item.generation_type) + ' font-inter'}>
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
                    );
                  }
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History; 