import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, Loader2, Lightbulb, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ParLevelSuggestion {
  par_level: number;
  reorder_point: number;
  reasoning: string;
}

interface IngredientWithSuggestion {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentParLevel: number;
  currentReorderPoint: number;
  suggestion?: ParLevelSuggestion;
}

interface ParLevelSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: IngredientWithSuggestion[];
  suggestions: Record<string, ParLevelSuggestion>;
  isLoading: boolean;
  onApply: (selectedIds: string[]) => void;
}

export function ParLevelSuggestionDialog({
  open,
  onOpenChange,
  ingredients,
  suggestions,
  isLoading,
  onApply,
}: ParLevelSuggestionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = ingredients.filter(i => suggestions[i.id]).map(i => i.id);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    onApply(Array.from(selectedIds));
    onOpenChange(false);
  };

  const ingredientsWithSuggestions = ingredients.map(ing => ({
    ...ing,
    suggestion: suggestions[ing.id],
  }));

  const hasSuggestions = Object.keys(suggestions).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Par Level Suggestions
          </DialogTitle>
          <DialogDescription>
            Industry-standard par levels based on your restaurant type and ingredient categories.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing inventory and generating suggestions...</p>
          </div>
        ) : hasSuggestions ? (
          <>
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="text-sm text-muted-foreground">
                {selectedIds.size} of {Object.keys(suggestions).length} selected
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                <AnimatePresence>
                  {ingredientsWithSuggestions.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        item.suggestion 
                          ? selectedIds.has(item.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                          : "border-border/50 opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {item.suggestion && (
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelection(item.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <Badge variant="secondary" className="mt-1">
                                {item.category}
                              </Badge>
                            </div>
                            {item.suggestion && (
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground line-through">
                                    {item.currentParLevel} {item.unit}
                                  </span>
                                  <span className="text-sm font-medium text-primary">
                                    → {item.suggestion.par_level} {item.unit}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Reorder at: {item.suggestion.reorder_point} {item.unit}
                                </div>
                              </div>
                            )}
                          </div>
                          {item.suggestion && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded p-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                              <span>{item.suggestion.reasoning}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={selectedIds.size === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Apply {selectedIds.size} Suggestions
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              No suggestions available. Try again or check your inventory items.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}