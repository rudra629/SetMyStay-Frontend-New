import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, ChevronDown, ChevronUp, Copy, PlusCircle, RefreshCw, Search } from "lucide-react";
import api from "@/lib/api";
import { listingCode } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type VendorListing = { id: string; title: string; type: string; status: string; city: string; area: string };
type Vendor = { vendor_number: string; count: number; listings: VendorListing[] };

const STATUS: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: "Live", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  PENDING: { label: "Under review", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  RENTED: { label: "Rented out", cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300" },
};
const TYPE: Record<string, string> = { PG: "PG", RENTAL: "Rental", ROOMMATE: "Roommate" };

/**
 * Admin / staff only: listings grouped by vendor number, with a search box and counts.
 * The main admin can also create vendor numbers. Nothing here is shown on the public site.
 */
export function VendorsPanel({ canCreate = false, onOpenListing }: { canCreate?: boolean; onOpenListing?: (id: string) => void }) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newNumber, setNewNumber] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const { data } = await api.get("/vendors/");
      setVendors(data?.vendors || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? vendors.filter((v) => v.vendor_number.toLowerCase().includes(q)) : vendors;
  }, [vendors, query]);
  const totalListings = shown.reduce((n, v) => n + v.count, 0);

  // A single exact match opens itself so the listings are visible straight away
  useEffect(() => {
    if (shown.length === 1 && query.trim()) setOpen((o) => ({ ...o, [shown[0].vendor_number]: true }));
  }, [shown, query]);

  const create = async (number: string) => {
    const n = number.trim();
    if (!n) return;
    setCreating(true);
    try {
      await api.post("/vendor-numbers/", { vendor_number: n });
      toast({ title: "Vendor number created", description: n });
      setNewNumber("");
      load();
    } catch (e: any) {
      toast({ title: "Could not create", description: e?.response?.data?.error || "Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copy = (n: string) => {
    navigator.clipboard?.writeText(n).then(() => toast({ title: "Copied", description: n })).catch(() => {});
  };

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-2xl"><Briefcase className="h-6 w-6" /> Vendors</CardTitle>
          <CardDescription className="mt-1.5">Listings grouped by vendor number. Only admin and staff can see this.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="self-start">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search vendor number" className="pl-9" aria-label="Search vendor number" />
          </div>
          <div className="flex gap-4 rounded-xl border bg-muted/40 px-4 py-2 text-sm">
            <span><strong className="text-base">{shown.length}</strong> vendors</span>
            <span><strong className="text-base">{totalListings}</strong> listings</span>
          </div>
        </div>

        {canCreate && (
          <form onSubmit={(e) => { e.preventDefault(); create(newNumber); }} className="flex flex-col gap-2 sm:flex-row">
            <Input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="New vendor number, e.g. VN-1024" maxLength={50} />
            <div className="flex gap-2">
              <Button type="submit" disabled={creating || !newNumber.trim()}><PlusCircle className="mr-2 h-4 w-4" />Create</Button>
              <Button type="button" variant="outline" onClick={() => setNewNumber(`VN-${Math.floor(1000 + Math.random() * 9000)}`)}>Generate</Button>
            </div>
          </form>
        )}

        {loading && !vendors.length ? (
          <p className="py-8 text-center text-muted-foreground">Loading vendors…</p>
        ) : failed ? (
          <div className="py-8 text-center text-muted-foreground">
            Could not load vendors. <Button variant="link" onClick={load}>Try again</Button>
          </div>
        ) : !shown.length ? (
          <p className="py-8 text-center text-muted-foreground">{query ? `No vendor number matches "${query}".` : "No vendor numbers yet."}</p>
        ) : (
          <div className="divide-y rounded-xl border">
            {shown.map((v) => {
              const isOpen = !!open[v.vendor_number];
              return (
                <div key={v.vendor_number}>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [v.vendor_number]: !isOpen }))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    aria-expanded={isOpen}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono font-semibold">{v.vendor_number}</span>
                    <Badge variant={v.count ? "default" : "secondary"} className="shrink-0">
                      {v.count} {v.count === 1 ? "listing" : "listings"}
                    </Badge>
                    <span
                      role="button" tabIndex={0} aria-label="Copy vendor number"
                      onClick={(e) => { e.stopPropagation(); copy(v.vendor_number); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); copy(v.vendor_number); } }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    ><Copy className="h-4 w-4" /></span>
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="space-y-2 bg-muted/20 px-4 pb-4 pt-1">
                      {!v.listings.length ? (
                        <p className="py-2 text-sm text-muted-foreground">No listings use this vendor number yet.</p>
                      ) : v.listings.map((l) => {
                        const st = STATUS[l.status] || { label: l.status, cls: "bg-muted text-foreground" };
                        return (
                          <div key={l.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{l.title || "Untitled"}</p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-mono">{listingCode(l.id)}</span> · {TYPE[l.type] || l.type}{l.area || l.city ? ` · ${[l.area, l.city].filter(Boolean).join(", ")}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                              {onOpenListing && <Button size="sm" variant="outline" onClick={() => onOpenListing(l.id)}>Open</Button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
