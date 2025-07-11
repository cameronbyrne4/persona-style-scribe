import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Upload, Plus, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import UploadModal from "@/components/UploadModal";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface MyDocumentsProps {
  hasCompletedOnboarding: boolean;
}

const MyDocuments = ({ hasCompletedOnboarding }: MyDocumentsProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Extracted fetchDocuments for reuse
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
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

  useEffect(() => {
    fetchDocuments();
  }, [toast]);

  // Calculate style profile stats
  const totalWords = documents.reduce((sum, doc) => {
    return sum + (doc.extracted_text?.split(/\s+/).length || 0);
  }, 0);

  const styleStrength = documents.length >= 3 && totalWords >= 3000 ? "Excellent" : 
                       documents.length >= 2 && totalWords >= 2000 ? "Good" : 
                       documents.length >= 1 && totalWords >= 1000 ? "Fair" : "Poor";

  const MAX_WORDS = 5000;
  const MAX_FILES = 10;
  const isAtFileLimit = documents.length >= MAX_FILES;
  const isAtWordLimit = totalWords >= MAX_WORDS;

  const handleDeleteDocument = async (docId: string) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId);
    if (error) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDocuments(documents.filter(d => d.id !== docId));
      toast({
        title: "Document deleted",
        description: "Document removed from your style profile",
      });
    }
    setDeleteTarget(null);
  };

  const handleUploadSuccess = () => {
    fetchDocuments(); // Just refresh the list, do not reload or redirect
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="space-y-6">
        {/* Style Profile Card */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="font-playfair font-medium">Your Style Profile</CardTitle>
                <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 border-green-200">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" /> Active
                </Badge>
              </div>
            </div>
            <CardDescription className="font-inter">
              Overview of your writing samples and style strength
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 text-sm font-inter">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stats */}
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
                {/* Removed large status badge */}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card className="shadow-soft border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-playfair font-medium mb-2">Your Writing Samples</CardTitle>
                <CardDescription className="font-inter mt-2">
                  View and manage the documents that define your writing style
                </CardDescription>
              </div>
              <Button 
                variant="academic" 
                onClick={() => {
                  if (hasCompletedOnboarding && !isAtFileLimit && !isAtWordLimit) {
                    setShowUploadModal(true);
                  } else if (!hasCompletedOnboarding) {
                    window.location.href = "/onboarding";
                  }
                }}
                className="font-inter"
                disabled={isAtFileLimit || isAtWordLimit}
                style={{ opacity: (isAtFileLimit || isAtWordLimit) ? 0.5 : 1, cursor: (isAtFileLimit || isAtWordLimit) ? 'not-allowed' : 'pointer' }}
                title={isAtFileLimit ? `Maximum ${MAX_FILES} documents reached` : isAtWordLimit ? `Maximum ${MAX_WORDS} words reached` : ''}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sample
              </Button>
            </div>
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
                  {hasCompletedOnboarding 
                    ? "Upload new writing samples to restore your style profile"
                    : "Upload writing samples to create your style profile"
                  }
                </p>
                <Button 
                  variant="academic" 
                  onClick={() => {
                    if (hasCompletedOnboarding) {
                      setShowUploadModal(true);
                    } else {
                      window.location.href = "/onboarding";
                    }
                  }}
                  className="font-inter"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {hasCompletedOnboarding ? "Add Samples" : "Upload Samples"}
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
                        <Popover open={deleteTarget === doc.id} onOpenChange={(open) => setDeleteTarget(open ? doc.id : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48">
                            <div className="text-sm font-inter mb-2">Delete this document?</div>
                            <div className="flex gap-2 justify-center">
                              <Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(doc.id)}>
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
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

        {/* Upload Modal */}
        <UploadModal 
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
          documents={documents}
          totalWords={totalWords}
          refreshDocuments={fetchDocuments}
        />
      </div>
    </div>
  );
};

export default MyDocuments; 