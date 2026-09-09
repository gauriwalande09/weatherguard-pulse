import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical, Play, Radio, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLive } from "@/lib/live-store";

export function DemoConsole({ compact = false }: { compact?: boolean }) {
  const { scenarios, activeScenario, runScenario, clearScenario } = useLive();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id ?? "");
  const [announced, setAnnounced] = useState("");
  const selected = scenarios.find((scenario) => scenario.id === selectedId);

  useEffect(() => {
    if (activeScenario) setSelectedId(activeScenario.id);
  }, [activeScenario]);

  const inject = () => {
    if (!selected) return;
    runScenario(selected.id);
    setAnnounced(`${selected.name} injected. Live readings and alert evidence are updating.`);
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        size={compact ? "sm" : "default"}
        onClick={() => setOpen(true)}
        className="shadow-[0_8px_30px_-14px_color-mix(in_oklab,var(--primary)_80%,transparent)]"
      >
        <FlaskConical />
        Inject test anomaly
      </Button>
      <span className="sr-only" aria-live="polite">{announced}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto border-border bg-surface sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <DialogTitle>Inject a controlled anomaly</DialogTitle>
            <DialogDescription>
              Choose a known signal pattern. The live chart, alert feed, AI verdict, and recommended action update together.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2 sm:grid-cols-2" role="radiogroup" aria-label="Test anomaly scenarios">
            {scenarios.map((scenario) => {
              const selectedScenario = scenario.id === selectedId;
              const weather = scenario.verdict === "genuine_weather";
              return (
                <button
                  key={scenario.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedScenario}
                  onClick={() => setSelectedId(scenario.id)}
                  className={cn(
                    "min-h-28 rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedScenario
                      ? "border-primary bg-primary/10 shadow-[inset_3px_0_0_var(--primary)]"
                      : "border-border bg-background/35 hover:border-primary/45 hover:bg-surface-2",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">{scenario.name}</span>
                    {weather ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-critical" />
                    )}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">{scenario.description}</span>
                  <span className={cn("mt-3 block text-[11px] font-semibold uppercase", weather ? "text-success" : "text-critical")}>
                    Expected verdict: {weather ? "weather event" : "sensor fault"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-info/25 bg-info/5 p-3 text-xs text-muted-foreground">
            <Radio className="mr-2 inline h-3.5 w-3.5 text-info" />
            Demo data is clearly labelled and does not alter the stored anomaly history.
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            {activeScenario && (
              <Button type="button" variant="outline" onClick={() => { clearScenario(); setOpen(false); }}>
                <Square /> Stop current test
              </Button>
            )}
            <Button type="button" onClick={inject} disabled={!selected}>
              <Play /> Inject and watch live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}