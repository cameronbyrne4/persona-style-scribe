import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UploadModal = ({ isOpen, onClose, onSuccess }: UploadModalProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  useEffect(() => {
    const updateWordCount = async () => {
      let total = 0;
      if (pastedText && pastedText.trim()) total += countWords(pastedText);
      for (const file of uploadedFiles) {
        const text = await file.text();
        total += countWords(text);
      }
      setWordCount(total);
    };
    updateWordCount();
  }, [uploadedFiles, pastedText]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    toast({
      title: "Files uploaded",
      description: `${files.length} file(s) added to your style profile`,
    });
  };

  const countWords = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getTotalWordCount = async (): Promise<number> => {
    let total: number = 0;
    if (pastedText && pastedText.trim()) {
      total += Number(countWords(pastedText));
    }
    for (const file of uploadedFiles) {
      const text = await file.text();
      total += Number(countWords(text));
    }
    return total;
  };

  const EDGE_FUNCTION_URL = "https://kiusphbzbtkdykmnvgmq.supabase.co/functions/v1/extract-text";

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0 && !pastedText.trim()) {
      toast({
        title: "No content provided",
        description: "Please upload .txt files or paste text to create your style profile",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const totalWords = Number(await getTotalWordCount());
    
    if (totalWords < 600) {
      setIsProcessing(false);
      toast({
        title: `Not enough words (${totalWords})`,
        description: "Please provide at least 600 words in total.",
        variant: "destructive",
      });
      return;
    }

    if (totalWords > 5000) {
      setIsProcessing(false);
      toast({
        title: `Too many words (${totalWords})`,
        description: "Please reduce your input to no more than 5000 words in total.",
        variant: "destructive",
      });
      return;
    }

    let uploadSuccess = true;
    const filePaths: string[] = [];

    // Upload files to Supabase Storage
    for (const file of uploadedFiles) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("user-uploads").upload(filePath, file);
      if (error) {
        uploadSuccess = false;
        toast({
          title: `Failed to upload ${file.name}`,
          description: error.message,
          variant: "destructive",
        });
      } else {
        filePaths.push(filePath);
      }
    }

    // Store pasted text as a file in Supabase Storage if present
    if (pastedText.trim()) {
      const filePath = `${user.id}/${Date.now()}-pasted-text.txt`;
      const textBlob = new Blob([pastedText], { type: "text/plain" });
      
      const { data, error } = await supabase.storage.from("user-uploads").upload(filePath, textBlob);
      if (error) {
        uploadSuccess = false;
        toast({
          title: "Failed to upload pasted text",
          description: error.message,
          variant: "destructive",
        });
      } else {
        filePaths.push(filePath);
      }
    }

    // Call Edge Function for each file
    if (uploadSuccess && filePaths.length > 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          throw new Error("No authentication token available");
        }
        
        const responses = await Promise.all(
          filePaths.map(async filePath => {
            const response = await fetch(EDGE_FUNCTION_URL, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ filePath, userId: user.id }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Edge Function failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            return result;
          })
        );

        // Mark onboarding as completed in user_profiles table
        const { error: profileError } = await supabase
          .from("user_profiles")
          .upsert([
            {
              user_id: user.id,
              onboarding_completed: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (profileError) {
          console.error("Error updating user profile:", profileError);
          // Don't fail the upload if profile update fails
        }

        toast({
          title: "Samples added successfully!",
          description: "Your writing samples have been processed and added to your style profile",
        });

        // Reset form
        setUploadedFiles([]);
        setPastedText("");
        
        // Close modal and trigger success callback
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        toast({
          title: "Processing error",
          description: "Failed to process one or more files.",
          variant: "destructive",
        });
      }
    }
    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-elegant border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="font-playfair font-medium">Add Writing Samples</CardTitle>
            <CardDescription className="font-inter">
              Upload additional writing samples to improve your style profile
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="modal-file-upload"
                />
                <label htmlFor="modal-file-upload" className="cursor-pointer">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="font-inter text-sm text-muted-foreground">
                    Upload .txt files
                  </p>
                </label>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="font-inter">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text Paste */}
            <div>
              <Textarea
                placeholder="Or paste text directly..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-24 font-inter"
              />
            </div>
          </div>

          {/* Word Count */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-inter text-muted-foreground">Total Word Count:</span>
            <span className={`font-inter font-medium ${
              wordCount >= 600 && wordCount <= 5000 
                ? 'text-green-600' 
                : wordCount > 0 
                  ? 'text-red-600' 
                  : 'text-muted-foreground'
            }`}>
              {wordCount} words
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="academic" 
              onClick={handleSubmit}
              disabled={isProcessing || wordCount < 600 || wordCount > 5000}
            >
              {isProcessing ? "Processing..." : "Add Samples"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadModal; 