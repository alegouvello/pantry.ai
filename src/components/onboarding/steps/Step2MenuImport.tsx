import { useState } from 'react';
import { Upload, Link as LinkIcon, ShoppingBag, PenLine, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { OnboardingLayout } from '../OnboardingLayout';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Step2Props {
  currentStep: number;
  completedSteps: number[];
  setupHealthScore: number;
  orgId: string | null;
  onNext: () => void;
  onBack?: () => void;
  onSave: () => void;
  updateHealthScore: (delta: number) => void;
}

type ImportMethod = 'upload' | 'url' | 'pos' | 'manual';

const importMethods = [
  {
    id: 'upload' as ImportMethod,
    title: 'Upload Menu',
    description: 'PDF, JPG, or PNG of your menu',
    icon: Upload,
    recommended: true,
  },
  {
    id: 'url' as ImportMethod,
    title: 'Paste URL',
    description: 'Link to your online menu',
    icon: LinkIcon,
  },
  {
    id: 'pos' as ImportMethod,
    title: 'Import from POS',
    description: 'Connect to Toast',
    icon: ShoppingBag,
  },
  {
    id: 'manual' as ImportMethod,
    title: 'Manual Entry',
    description: 'Add items one by one',
    icon: PenLine,
  },
];

export function Step2MenuImport({
  currentStep,
  completedSteps,
  setupHealthScore,
  onNext,
  onBack,
  onSave,
  updateHealthScore,
}: Step2Props) {
  const { toast } = useToast();
  const [method, setMethod] = useState<ImportMethod | null>(null);
  const [menuUrl, setMenuUrl] = useState('');
  const [isMonitored, setIsMonitored] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: 'File uploaded',
        description: `${file.name} is ready for processing.`,
      });
    }
  };

  const handleContinue = async () => {
    if (method === 'manual') {
      onNext();
      return;
    }

    if (method === 'upload' && !uploadedFile) {
      toast({
        title: 'No file selected',
        description: 'Please upload a menu file.',
        variant: 'destructive',
      });
      return;
    }

    if (method === 'url' && !menuUrl) {
      toast({
        title: 'No URL provided',
        description: 'Please enter your menu URL.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    // TODO: Implement actual menu parsing with AI
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsProcessing(false);
    updateHealthScore(15);
    onNext();
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      setupHealthScore={setupHealthScore}
      title="Bring your menu"
      subtitle="We'll extract your dishes and generate recipe drafts"
      onNext={handleContinue}
      onBack={onBack}
      onSave={onSave}
      nextLabel={isProcessing ? 'Processing...' : 'Continue'}
      nextDisabled={!method || isProcessing}
    >
      <div className="space-y-8">
        {/* Method Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          {importMethods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "relative p-6 rounded-xl border-2 text-left transition-all hover:border-primary/50",
                method === m.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border"
              )}
            >
              {m.recommended && (
                <span className="absolute top-3 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
              <m.icon className={cn(
                "w-8 h-8 mb-3",
                method === m.id ? "text-primary" : "text-muted-foreground"
              )} />
              <h3 className="font-semibold text-foreground mb-1">{m.title}</h3>
              <p className="text-sm text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </div>

        {/* Upload Area */}
        {method === 'upload' && (
          <Card variant="elevated" className="p-8">
            <div className="flex flex-col items-center">
              <input
                type="file"
                id="menu-upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="menu-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                {uploadedFile ? (
                  <>
                    <FileText className="w-12 h-12 text-primary mb-4" />
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click to change file
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="font-medium text-foreground">
                      Drop your menu here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, JPG, or PNG up to 10MB
                    </p>
                  </>
                )}
              </label>
            </div>
          </Card>
        )}

        {/* URL Input */}
        {method === 'url' && (
          <Card variant="elevated" className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="menu-url">Menu URL</Label>
                <Input
                  id="menu-url"
                  type="url"
                  value={menuUrl}
                  onChange={(e) => setMenuUrl(e.target.value)}
                  placeholder="https://yourrestaurant.com/menu"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Monitor for changes</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when your menu updates
                  </p>
                </div>
                <Switch
                  checked={isMonitored}
                  onCheckedChange={setIsMonitored}
                />
              </div>
            </div>
          </Card>
        )}

        {/* POS Connect */}
        {method === 'pos' && (
          <Card variant="elevated" className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <span className="text-2xl">🍞</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Toast POS</h3>
                <p className="text-sm text-muted-foreground">
                  Connect to import your menu automatically
                </p>
              </div>
              <Button variant="outline">Connect</Button>
            </div>
          </Card>
        )}

        {/* Manual Entry */}
        {method === 'manual' && (
          <Card variant="elevated" className="p-6 text-center">
            <PenLine className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Manual Entry</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You'll be able to add menu items and recipes one by one. 
              This takes longer but gives you full control.
            </p>
          </Card>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="font-medium text-foreground">Processing your menu...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
