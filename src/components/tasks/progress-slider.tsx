"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ProgressSliderProps {
  taskId: string;
  initialValue: number;
  onChange?: (value: number) => void;
  onUpdate?: (value: number) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function ProgressSlider({
  taskId,
  initialValue,
  onChange,
  onUpdate,
  className,
  disabled,
  compact,
}: ProgressSliderProps) {
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when prop changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback(
    (newValues: number | readonly number[]) => {
      const newValue = Array.isArray(newValues) ? (newValues as readonly number[])[0] : (newValues as number);
      setValue(newValue);
      onChange?.(newValue);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await csrfFetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ percentComplete: newValue }),
          });
          onUpdate?.(newValue);
        } catch (error) {
          console.error("Failed to update progress:", error);
        }
      }, 500);
    },
    [taskId, onChange, onUpdate]
  );

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1">
        <Slider
          value={[value]}
          min={0}
          max={100}
          step={5}
          onValueChange={handleChange}
          disabled={disabled}
          aria-label="Task progress"
        />
      </div>
      {!compact && (
        <span className="text-sm font-medium tabular-nums w-10 text-right text-muted-foreground">
          {value}%
        </span>
      )}
    </div>
  );
}
