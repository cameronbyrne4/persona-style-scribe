import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { animate } from "motion";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  documents: any[];
  totalWords: number;
  refreshDocuments: () => Promise<void>;
}

const UploadModal = ({ isOpen, onClose, onSuccess, documents, totalWords, refreshDocuments }: UploadModalProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  // REMOVE: const [existingWordCount, setExistingWordCount] = useState(0);
  // REMOVE: const [existingFileCount, setExistingFileCount] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);

  // Modal entrance animation
  useEffect(() => {
    if (isOpen && modalRef.current) {
      animate(
        modalRef.current,
        { opacity: [0, 1] },
        { duration: 0.3, ease: "easeOut" }
      );
    }
  }, [isOpen]);

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

  // Extract fetch logic for reuse
  // REMOVE: const refreshExistingCounts = async (userId: string) => { ... };
  // REMOVE: useEffect(() => { ... refreshExistingCounts(user.id) ... }, [user]);

  const MAX_WORDS = 5000;
  const MAX_FILES = 10;

  const countWords = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Helper function to calculate current total word count synchronously
  const getCurrentWordCount = async (): Promise<number> => {
    let total = 0;
    if (pastedText && pastedText.trim()) {
      total += countWords(pastedText);
    }
    for (const file of uploadedFiles) {
      const text = await file.text();
      total += countWords(text);
    }
    return total;
  };

  // In handleFileUpload, use documents.length and totalWords for limits
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Clear the input to allow re-selecting the same files
    event.target.value = '';
    
    // Check file count limit INCLUDING existing files
    if (documents.length + uploadedFiles.length >= MAX_FILES) {
      toast({
        title: `File limit reached`,
        description: `You can only have ${MAX_FILES} documents total. Current: ${documents.length + uploadedFiles.length}`,
        variant: "destructive",
      });
      return;
    }

    // Only allow files up to the max
    const allowedFiles = files.slice(0, MAX_FILES - (documents.length + uploadedFiles.length));
    
    // Calculate TOTAL word count including existing
    const currentSessionWordCount = await getCurrentWordCount();
    const totalCurrentWords = totalWords + currentSessionWordCount;
    let projectedWordCount = totalCurrentWords;
    for (const file of allowedFiles) {
      try {
        const text = await file.text();
        projectedWordCount += countWords(text);
      } catch (error) {
        toast({
          title: "Error reading file",
          description: `Could not read file: ${file.name}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (projectedWordCount > MAX_WORDS) {
      toast({
        title: `Word limit exceeded`,
        description: `You can only have ${MAX_WORDS} words total. Current: ${totalWords}, Would be: ${projectedWordCount}`,
        variant: "destructive",
      });
      return;
    }

    setUploadedFiles(prev => [...prev, ...allowedFiles]);
    toast({
      title: "Files uploaded",
      description: `${allowedFiles.length} file(s) added to your style profile`,
    });
  };

  const handleTextChange = async (value: string) => {
    // Calculate what the word count would be with this new text
    const currentFilesWordCount = await Promise.all(
      uploadedFiles.map(async (file) => {
        const text = await file.text();
        return countWords(text);
      })
    ).then(counts => counts.reduce((sum, count) => sum + count, 0));
    
    const newTextWordCount = countWords(value);
    // Include existing words in calculation
    const projectedTotal = totalWords + currentFilesWordCount + newTextWordCount;
    
    if (projectedTotal > MAX_WORDS) {
      toast({
        title: `Word limit exceeded`,
        description: `Total limit is ${MAX_WORDS} words. You currently have ${totalWords} words. This would make ${projectedTotal} total.`,
        variant: "destructive",
      });
      return; // Don't update the text
    }
    
    setPastedText(value);
  };

  const getTotalWordCount = async (): Promise<number> => {
    return await getCurrentWordCount();
  };

  const EDGE_FUNCTION_URL = "https://kiusphbzbtkdykmnvgmq.supabase.co/functions/v1/extract-text";

  // In handleSubmit, after successful upload, call refreshDocuments before closing
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
    const overallWords = totalWords + wordCount;
    
    if (overallWords < 600) {
      setIsProcessing(false);
      toast({
        title: `Not enough words (${overallWords})`,
        description: "Please provide at least 600 words in total.",
        variant: "destructive",
      });
      return;
    }

    if (overallWords > MAX_WORDS) {
      setIsProcessing(false);
      toast({
        title: `Too many words (${overallWords})`,
        description: `Please reduce your input to no more than ${MAX_WORDS} words in total.`,
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
        
        // Refetch existing counts before closing
        // REMOVE: if (user?.id) await refreshExistingCounts(user.id);
        await refreshDocuments();
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

  // In the JSX, use documents.length and totalWords for limits and display
  const isAtFileLimit = (documents.length + uploadedFiles.length) >= MAX_FILES;
  const isAtWordLimit = (totalWords + wordCount) >= MAX_WORDS;
  const currentSessionWords = wordCount;
  const overallWords = totalWords + currentSessionWords;
  const overallFiles = documents.length + uploadedFiles.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card ref={modalRef} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-elegant border-0 opacity-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="font-playfair font-medium mb-2">Add Writing Samples</CardTitle>
            <CardDescription className="font-inter mt-2">
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
              <div className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                isAtFileLimit || isAtWordLimit 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-border hover:border-primary/50'
              }`}>
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="modal-file-upload"
                  disabled={isAtFileLimit || isAtWordLimit}
                />
                <label 
                  htmlFor="modal-file-upload" 
                  className={isAtFileLimit || isAtWordLimit ? 'cursor-not-allowed' : 'cursor-pointer'}
                >
                  <Upload className={`h-6 w-6 mx-auto mb-2 ${
                    isAtFileLimit || isAtWordLimit ? 'text-gray-400' : 'text-muted-foreground'
                  }`} />
                  <p className={`font-inter text-sm ${
                    isAtFileLimit || isAtWordLimit ? 'text-gray-400' : 'text-muted-foreground'
                  }`}>
                    {isAtFileLimit ? 'File limit reached' : isAtWordLimit ? 'Word limit reached' : 'Upload .txt files'}
                  </p>
                </label>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm group">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="font-inter">{file.name}</span>
                      <button
                        type="button"
                        aria-label="Remove file"
                        className="ml-1 text-muted-foreground hover:text-red-600 opacity-70 group-hover:opacity-100 transition"
                        onClick={() => {
                          setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(isAtFileLimit || isAtWordLimit) && (
                <div className="text-xs text-red-600 mt-2 font-inter">
                  {isAtFileLimit && `Maximum ${MAX_FILES} files allowed.`}
                  {isAtFileLimit && isAtWordLimit && <br />}
                  {isAtWordLimit && `Maximum ${MAX_WORDS} words allowed.`}
                </div>
              )}
            </div>

            {/* Text Paste */}
            <div>
              <Textarea
                placeholder={isAtWordLimit ? "Word limit reached" : "Or paste text directly..."}
                value={pastedText}
                onChange={(e) => handleTextChange(e.target.value)}
                className="min-h-24 font-inter"
                disabled={isAtWordLimit && !pastedText}
              />
            </div>
          </div>

          {/* Word Count */}
          <div className="flex items-center justify-between text-sm">
            <span className="font-inter text-muted-foreground">
              Total: {overallFiles}/{MAX_FILES} files, {overallWords}/{MAX_WORDS} words
            </span>
            <span className="font-inter text-xs text-muted-foreground">
              (Existing: {documents.length} files, {totalWords} words)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {(overallWords <= MAX_WORDS && overallFiles <= MAX_FILES) && (
              <Button 
                variant="academic" 
                onClick={handleSubmit}
                disabled={isProcessing || overallWords < 600}
              >
                {isProcessing ? "Processing..." : "Add Samples"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadModal;