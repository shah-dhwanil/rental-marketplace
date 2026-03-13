import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Pair = { key: string; value: string };

type Props = {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
};

function toPairs(obj: Record<string, string>): Pair[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

function toRecord(pairs: Pair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of pairs) {
    if (key.trim()) out[key.trim()] = value;
  }
  return out;
}

export function PropertiesEditor({ value, onChange }: Props) {
  const [pairs, setPairs] = useState<Pair[]>(() => toPairs(value));
  const prevValueRef = useRef(value);

  // Sync from parent when value changes from outside (e.g. initial load from API)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setPairs(toPairs(value));
    }
  }, [value]);

  function updatePair(index: number, field: "key" | "value", text: string) {
    const next = pairs.map((p, i) => (i === index ? { ...p, [field]: text } : p));
    setPairs(next);
    onChange(toRecord(next));
  }

  function addPair() {
    setPairs((prev) => [...prev, { key: "", value: "" }]);
  }

  function removePair(index: number) {
    const next = pairs.filter((_, i) => i !== index);
    setPairs(next);
    onChange(toRecord(next));
  }

  return (
    <div className="space-y-2">
      {pairs.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
            <span className="text-xs text-muted-foreground font-medium">Key</span>
            <span className="text-xs text-muted-foreground font-medium">Value</span>
            <span className="w-7" />
          </div>

          {pairs.map((pair, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input
                placeholder="e.g. Color"
                value={pair.key}
                onChange={(e) => updatePair(i, "key", e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="e.g. Black"
                value={pair.value}
                onChange={(e) => updatePair(i, "value", e.target.value)}
                className="h-8 text-sm"
              />
              <button
                type="button"
                onClick={() => removePair(i)}
                className="flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Remove field"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPair}
        className="gap-1.5 h-8 text-xs"
      >
        <Plus className="size-3.5" />
        Add field
      </Button>

      {pairs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No custom fields yet. Click &ldquo;Add field&rdquo; to add key-value pairs.
        </p>
      )}
    </div>
  );
}
