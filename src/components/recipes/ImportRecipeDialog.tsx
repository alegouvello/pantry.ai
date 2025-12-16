import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useIngredients } from '@/hooks/useIngredients';
import { useCreateRecipe } from '@/hooks/useRecipes';
import { useAddRecipeIngredient } from '@/hooks/useRecipeIngredients';

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRecipe {
  name: string;
  category: string;
  yieldAmount: number;
  yieldUnit: string;
  prepTime?: number;
  posItemId?: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  errors: string[];
}

interface ImportResult {
  success: boolean;
  recipeName: string;
  error?: string;
}

export function ImportRecipeDialog({ open, onOpenChange }: ImportRecipeDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: availableIngredients } = useIngredients();
  const createRecipe = useCreateRecipe();
  const addRecipeIngredient = useAddRecipeIngredient();

  const [parsedRecipes, setParsedRecipes] = useState<ParsedRecipe[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'results'>('upload');

  const resetState = () => {
    setParsedRecipes([]);
    setImportResults([]);
    setIsImporting(false);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = 'name,category,yield_amount,yield_unit,prep_time_minutes,pos_item_id,ingredients';
    const example1 = 'Margherita Pizza,Main Course,4,portions,30,PIZZA001,"Flour:500:g;Tomatoes:200:g;Mozzarella:250:g;Basil:10:leaves"';
    const example2 = 'Caesar Salad,Salad,2,servings,15,SALAD001,"Romaine Lettuce:1:head;Parmesan:50:g;Croutons:100:g"';
    
    const csv = `${headers}\n${example1}\n${example2}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): ParsedRecipe[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header
    const dataLines = lines.slice(1);
    const recipes: ParsedRecipe[] = [];

    for (const line of dataLines) {
      // Parse CSV with quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length < 7) continue;

      const [name, category, yieldAmount, yieldUnit, prepTime, posItemId, ingredientsStr] = values;
      const errors: string[] = [];

      // Validate required fields
      if (!name) errors.push('Name is required');
      if (!category) errors.push('Category is required');

      // Parse ingredients (format: "Name:Quantity:Unit;Name:Quantity:Unit")
      const ingredients: ParsedRecipe['ingredients'] = [];
      if (ingredientsStr) {
        const ingParts = ingredientsStr.split(';').filter(p => p.trim());
        for (const part of ingParts) {
          const [ingName, qty, unit] = part.split(':').map(s => s.trim());
          if (ingName && qty && unit) {
            const quantity = parseFloat(qty);
            if (isNaN(quantity)) {
              errors.push(`Invalid quantity for ingredient "${ingName}"`);
            } else {
              // Check if ingredient exists in database
              const existingIng = availableIngredients?.find(
                i => i.name.toLowerCase() === ingName.toLowerCase()
              );
              if (!existingIng) {
                errors.push(`Ingredient "${ingName}" not found in database`);
              }
              ingredients.push({ name: ingName, quantity, unit });
            }
          }
        }
      }

      recipes.push({
        name,
        category,
        yieldAmount: parseFloat(yieldAmount) || 1,
        yieldUnit: yieldUnit || 'portion',
        prepTime: prepTime ? parseInt(prepTime) : undefined,
        posItemId: posItemId || undefined,
        ingredients,
        errors,
      });
    }

    return recipes;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: t('importRecipe.invalidFileType'),
        description: t('importRecipe.pleaseUploadCSV'),
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setParsedRecipes(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRecipes = parsedRecipes.filter(r => r.errors.length === 0);
    if (validRecipes.length === 0) {
      toast({
        title: t('importRecipe.noValidRecipes'),
        description: t('importRecipe.fixErrors'),
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    const results: ImportResult[] = [];

    for (const recipe of validRecipes) {
      try {
        // Create the recipe
        const newRecipe = await createRecipe.mutateAsync({
          name: recipe.name,
          category: recipe.category,
          yield_amount: recipe.yieldAmount,
          yield_unit: recipe.yieldUnit,
          prep_time_minutes: recipe.prepTime || null,
          pos_item_id: recipe.posItemId || null,
        });

        // Add ingredients
        for (const ing of recipe.ingredients) {
          const dbIngredient = availableIngredients?.find(
            i => i.name.toLowerCase() === ing.name.toLowerCase()
          );
          if (dbIngredient) {
            await addRecipeIngredient.mutateAsync({
              recipe_id: newRecipe.id,
              ingredient_id: dbIngredient.id,
              quantity: ing.quantity,
              unit: ing.unit,
            });
          }
        }

        results.push({ success: true, recipeName: recipe.name });
      } catch (error) {
        results.push({
          success: false,
          recipeName: recipe.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setImportResults(results);
    setStep('results');
    setIsImporting(false);

    const successCount = results.filter(r => r.success).length;
    toast({
      title: t('importRecipe.importComplete'),
      description: t('importRecipe.importedCount', { success: successCount, total: validRecipes.length }),
    });
  };

  const validCount = parsedRecipes.filter(r => r.errors.length === 0).length;
  const errorCount = parsedRecipes.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetState();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('importRecipe.title')}</DialogTitle>
          <DialogDescription>
            {t('importRecipe.description')}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('importRecipe.csvFormat')}</strong> name, category, yield_amount, yield_unit, prep_time_minutes, pos_item_id, ingredients
                <br />
                <span className="text-muted-foreground">
                  {t('importRecipe.ingredientsFormat')}
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center gap-4 py-8 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">{t('importRecipe.selectCSV')}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('importRecipe.downloadTemplate')}
                </Button>
                <Button variant="accent" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('importRecipe.selectFile')}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-4">
              <Badge variant="success">{t('importRecipe.valid', { count: validCount })}</Badge>
              {errorCount > 0 && (
                <Badge variant="destructive">{t('importRecipe.withErrors', { count: errorCount })}</Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-3">
                {parsedRecipes.map((recipe, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      recipe.errors.length > 0
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{recipe.name || t('importRecipe.unnamedRecipe')}</p>
                        <p className="text-sm text-muted-foreground">
                          {recipe.category} • {t('importRecipe.ingredientCount', { count: recipe.ingredients.length })}
                        </p>
                      </div>
                      {recipe.errors.length > 0 ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    {recipe.errors.length > 0 && (
                      <div className="mt-2 text-sm text-destructive">
                        {recipe.errors.map((err, i) => (
                          <p key={i}>• {err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetState}>
                {t('importRecipe.cancel')}
              </Button>
              <Button
                variant="accent"
                onClick={handleImport}
                disabled={validCount === 0 || isImporting}
              >
                {isImporting ? t('importRecipe.importing') : t('importRecipe.importRecipes', { count: validCount })}
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            <ScrollArea className="max-h-[300px] border rounded-lg">
              <div className="p-4 space-y-2">
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg flex items-center gap-3 ${
                      result.success
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-destructive/10 border border-destructive/30'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{result.recipeName}</p>
                      {result.error && (
                        <p className="text-sm text-destructive">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="accent" onClick={() => onOpenChange(false)}>
                {t('importRecipe.done')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
