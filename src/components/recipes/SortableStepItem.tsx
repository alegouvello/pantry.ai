import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SortableStepItemProps {
  id: string;
  index: number;
  instruction: string;
  onUpdate: (instruction: string) => void;
  onRemove: () => void;
}

export function SortableStepItem({ 
  id, 
  index, 
  instruction, 
  onUpdate, 
  onRemove 
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary/20 bg-muted/50 z-10"
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
          "bg-primary text-primary-foreground"
        )}>
          {index + 1}
        </div>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <Textarea
        value={instruction}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder="Enter step instructions..."
        className="flex-1 min-h-[60px] resize-none"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
