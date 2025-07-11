import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { animate, stagger } from "motion";

const Onboarding = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Redirect to landing if not signed in, but only after loading
  useEffect(() => {
    if (!loading && user === null) {
      window.location.href = "/";
    }
  }, [user, loading]);

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

  const MIN_WORDS = 600;
  const MAX_WORDS = 5000;

  const countWords = (text: string): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getTotalWordCount = async (): Promise<number> => {
    let total: number = 0;
    // Count words in pasted text
    if (pastedText && pastedText.trim()) {
      total += Number(countWords(pastedText));
    }
    // Count words in uploaded files
    for (const file of uploadedFiles) {
      const text = await file.text();
      total += Number(countWords(text));
    }
    return total;
  };
  console.log("Uploaded files, calling edge function");
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
    if (totalWords < MIN_WORDS) {
      setIsProcessing(false);
      toast({
        title: `Not enough words (${totalWords})`,
        description: `Please provide at least ${MIN_WORDS} words in total.`,
        variant: "destructive",
      });
      return;
    }
    if (totalWords > MAX_WORDS) {
      setIsProcessing(false);
      toast({
        title: `Too many words (${totalWords})`,
        description: `Please reduce your input to no more than ${MAX_WORDS} words in total.`,
        variant: "destructive",
      });
      return;
    }
    console.log("checking upload status...");
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
        console.log("upload failed");
      } else {
        filePaths.push(filePath);
        toast({
          title: `Uploaded ${file.name}`,
          description: "File uploaded successfully",
        });
        console.log("upload successful");
      }
    }
    // Store pasted text as a file in Supabase Storage if present
    if (pastedText.trim()) {
      console.log("pasted text detected");
      const filePath = `${user.id}/${Date.now()}-pasted-text.txt`;
      console.log("Uploading to filePath:", filePath);
      console.log("Pasted text length:", pastedText.length);
      const textBlob = new Blob([pastedText], { type: "text/plain" });
      
      // First, let's check if the bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log("Available buckets:", buckets);
      if (bucketError) {
        console.log("Error listing buckets:", bucketError);
      }
      
      const { data, error } = await supabase.storage.from("user-uploads").upload(filePath, textBlob);
      if (error) {
        console.log("Supabase upload error details:", error);
        console.log("Error message:", error.message);
        uploadSuccess = false;
        toast({
          title: "Failed to upload pasted text",
          description: error.message,
          variant: "destructive",
        });
        console.log("pasted text upload failed");
      } else {
        filePaths.push(filePath);
        toast({
          title: "Pasted text uploaded",
          description: "Text uploaded successfully",
        });
        console.log("pasted text upload successful");
      }
    }
    // Call Edge Function for each file
    if (uploadSuccess && filePaths.length > 0) {
      try {
        // Get the user's JWT token
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
              console.log(`Edge Function error for ${filePath}:`, response.status, errorText);
              throw new Error(`Edge Function failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`Edge Function success for ${filePath}:`, result);
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
          // Don't fail the onboarding if profile update fails
        }

        setIsComplete(true);
        toast({
          title: "Style profile created!",
          description: "Your writing style has been analyzed and saved",
        });
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

  // Success celebration animation
  useEffect(() => {
    if (isComplete && successRef.current) {
      animate(
        successRef.current,
        { scale: [0, 1.1, 1], rotate: [0, 10, -10, 0] },
        { duration: 0.8, ease: "easeOut", type: "spring", stiffness: 200 }
      );
    }
  }, [isComplete]);

  if (loading) return <div>Loading...</div>;

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card ref={successRef} className="w-full max-w-md text-center shadow-elegant border-0">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-playfair font-medium text-foreground mb-3">
              Profile Created!
            </h1>
            <p className="text-muted-foreground font-inter mb-6">
              Your writing style has been analyzed. You're now ready to generate content in your unique voice.
            </p>
            <Button 
              variant="academic" 
              className="w-full font-inter font-medium"
              onClick={() => window.location.href = "/"}
            >
              Start Writing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
          </div>
          <p className="text-sm text-muted-foreground font-inter">Step 1 of 3: Create Your Style Profile</p>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-playfair font-medium text-foreground mb-3">
            Upload Your Writing Samples
          </h1>
          <p className="text-lg text-muted-foreground font-inter">
            Share 600-5,000 words of your best academic writing so we can learn your unique style, 
            vocabulary, and voice. This will be used to generate future content that sounds authentically like you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* File Upload */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium flex items-center">
                <Upload className="mr-2 h-5 w-5 text-primary" />
                Upload Files
              </CardTitle>
              <CardDescription className="font-inter">
                Upload your essays as plain text (.txt) files only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-inter text-sm text-muted-foreground">
                    Click to upload or drag files here
                  </p>
                </label>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-inter">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Paste */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-playfair font-medium flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Or Paste Text
              </CardTitle>
              <CardDescription className="font-inter">
                Copy and paste your writing directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste your writing samples here..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-32 font-inter"
              />
            </CardContent>
          </Card>
        </div>

        {/* Word Count Display */}
        <div className="mb-8">
          <Card className="shadow-soft border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-inter text-sm text-muted-foreground">Total Word Count:</span>
                <span className={`font-inter font-medium ${
                  wordCount >= MIN_WORDS && wordCount <= MAX_WORDS 
                    ? 'text-green-600' 
                    : wordCount > 0 
                      ? 'text-red-600' 
                      : 'text-muted-foreground'
                }`}>
                  {wordCount} words
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      wordCount >= MIN_WORDS && wordCount <= MAX_WORDS 
                        ? 'bg-green-500' 
                        : wordCount > MAX_WORDS 
                          ? 'bg-red-500' 
                          : wordCount > 0 
                            ? 'bg-yellow-500' 
                            : 'bg-muted'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (wordCount / MAX_WORDS) * 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground font-inter mt-1">
                  Target: {MIN_WORDS.toLocaleString()} - {MAX_WORDS.toLocaleString()} words
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <Button 
            variant="academic" 
            onClick={handleSubmit}
            disabled={isProcessing || wordCount < MIN_WORDS || wordCount > MAX_WORDS}
            className="font-inter font-medium px-8"
          >
            {isProcessing ? "Processing..." : "Create Style Profile"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;