import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, CheckCheck, Loader2, RefreshCw, X } from "lucide-react";
import api from "@/lib/api";
import { listingCode } from "@/lib/utils";
import { changeFieldLabel } from "@/lib/roommate-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ListingEditChange } from "@/lib/types";

export interface EditNotification {
  id: number;
  property_id: string;
  property_title: string;
  property_type: string;
  property_status: string;
  editor_name: string;
  editor_email: string;
  created_at: string;
  changes: ListingEditChange[];
}

const TYPE: Record<string, string> = { PG: "PG", RENTAL: "Rental", ROOMMATE: "Roommate profile" };

/** Open notification count, for the tab badge (refreshes every 60 s). */
export function useEditNotificationCount(enabled = true) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    api.get("/listing-edits/").then(({ data }) => setCount(Number(data?.open_count) || 0)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const t = setInterval(refresh, 60000);
    const onChange = () => refresh();
    window.addEventListener("setmystay:edits-changed", onChange);
    return () => { clearInterval(t); window.removeEventListener("setmystay:edits-changed", onChange); };
  }, [refresh, enabled]);
  return count;
}

/**
 * Admin / staff: owners who edited an already-approved listing or roommate profile.
 * Clicking one opens the listing with the changes; Clear only removes the notification.
 */
export function NotificationsPanel({ onOpen }: { onOpen: (n: EditNotification) => void }) {
  const { toast } = useToast();
  const [items, setItems] = useState<EditNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<number | "all" | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const { data } = await api.get("/listing-edits/");
      setItems(data?.items || []);
    } catch { setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const clear = async (id: number | "all") => {
    setBusy(id);
    try {
      await api.post("/listing-edits/", id === "all" ? { all: true } : { id });
      setItems((xs) => (id === "all" ? [] : xs.filter((x) => x.id !== id)));
      window.dispatchEvent(new Event("setmystay:edits-changed"));
      toast({ title: id === "all" ? "All notifications cleared" : "Notification cleared", description: "The listing itself was not changed." });
    } catch {
      toast({ title: "Could not clear", description: "Please try again.", variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl"><Bell className="h-6 w-6" /> Notifications</CardTitle>
          <CardDescription className="mt-1.5">Owners who changed a listing or roommate profile after it was approved. Clearing a notification does not change the listing.</CardDescription>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => clear("all")} disabled={busy !== null}>
              {busy === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && !items.length ? (
          <p className="py-10 text-center text-muted-foreground">Loading notifications…</p>
        ) : failed ? (
          <p className="py-10 text-center text-muted-foreground">Could not load notifications. <Button variant="link" onClick={load}>Try again</Button></p>
        ) : !items.length ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><BellOff className="h-8 w-8" />No new notifications.</div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {items.map((n) => {
              const when = new Date(n.created_at);
              const fields = n.changes.map((c) => changeFieldLabel(c.field));
              return (
                <li key={n.id} className="flex items-start gap-3 p-3 hover:bg-muted/40 sm:p-4">
                  <button type="button" onClick={() => onOpen(n)} className="min-w-0 flex-1 text-left">
                    <p className="text-sm sm:text-[15px]">
                      <span className="font-semibold">{n.editor_name}</span> edited <span className="font-semibold">{n.property_title || "a listing"}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {TYPE[n.property_type] || n.property_type} · <span className="font-mono">{listingCode(n.property_id)}</span> · {when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}, {when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                      {n.editor_email ? ` · ${n.editor_email}` : ""}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-xs">
                      <span className="text-muted-foreground">Changed: </span>{fields.slice(0, 5).join(", ")}{fields.length > 5 ? ` and ${fields.length - 5} more` : ""}
                    </p>
                  </button>
                  <Button size="icon" variant="ghost" className="shrink-0" aria-label="Clear notification" title="Clear (the listing is not changed)"
                    onClick={() => clear(n.id)} disabled={busy !== null}>
                    {busy === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
