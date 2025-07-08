import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    toast({
      title: "Files uploaded",
      description: `${files.length} file(s) added to your style profile`,
    });
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0 && !pastedText.trim()) {
      toast({
        title: "No content provided",
        description: "Please upload files or paste text to create your style profile",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
      toast({
        title: "Style profile created!",
        description: "Your writing style has been analyzed and saved",
      });
    }, 3000);
  };

  const getTotalWordCount = () => {
    const pastedWordCount = pastedText.trim().split(/\s+/).length;
    // Estimate 500 words per page for uploaded files
    const fileWordCount = uploadedFiles.length * 500;
    return pastedWordCount + fileWordCount;
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-elegant border-0">
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
              onClick={() => window.location.href = "/dashboard"}
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg"></div>
            <h1 className="text-xl font-playfair font-medium text-foreground">PersonaPen</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
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
              Share 3,000-5,000 words of your best academic writing so we can learn your unique style, 
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
                  Upload your essays as PDF or text files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.doc,.docx"
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
                  Paste Text
                </CardTitle>
                <CardDescription className="font-inter">
                  Copy and paste your writing directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Paste your essays or writing samples here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="min-h-32 font-inter"
                />
              </CardContent>
            </Card>
          </div>

          {/* Word Count Display */}
          <Card className="mb-8 shadow-soft border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-inter text-sm text-muted-foreground">Total Word Count (estimated)</p>
                  <p className="font-playfair text-2xl font-medium text-foreground">{getTotalWordCount().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-inter text-sm text-muted-foreground">Recommended: 3,000-5,000 words</p>
                  <div className="w-32 h-2 bg-muted rounded-full mt-1">
                    <div 
                      className="h-2 bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (getTotalWordCount() / 4000) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="text-center">
            <Button 
              variant="academic" 
              size="lg" 
              onClick={handleSubmit}
              disabled={isProcessing}
              className="font-inter font-medium"
            >
              {isProcessing ? "Processing Your Style..." : "Create My Style Profile"}
              {!isProcessing && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
            
            {isProcessing && (
              <p className="text-sm text-muted-foreground mt-4 font-inter">
                Analyzing your writing patterns, vocabulary, and style...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;