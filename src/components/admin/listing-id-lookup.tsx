import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listingCode, matchesListingCode } from "@/lib/utils";

type Findable = { id: string; status?: string; title?: string; ownerName?: string; propertyType?: string; locality?: string; editedAt?: string };

const STATUS_LABEL: Record<string, string> = { approved: "Live", pending: "Under review", rejected: "Rejected" };

const nameOf = (it: Findable) => it.title || it.ownerName || "Untitled";

/** Admin/staff search box: type a listing ID (SMS-00021 or 21) to open it, or a title / owner name to see matches. */
export function ListingIdLookup<T extends Findable>({
  items,
  onOpen,
}: {
  items: T[];
  onOpen: (item: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[] | null>(null);

  const find = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    // "edit" / "edited": every listing or roommate profile the owner changed after approval (newest first)
    if (/^edit(ed|s)?$/i.test(q)) {
      const edited = items.filter((it) => it.editedAt).sort((a, b) => String(b.editedAt).localeCompare(String(a.editedAt)));
      setResults(edited);
      return;
    }
    // An exact ID opens that listing straight away
    const byId = items.find((it) => matchesListingCode(q, it.id));
    if (byId) {
      setResults(null);
      onOpen(byId);
      return;
    }
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = items.filter((it) => {
      const text = `${it.title || ""} ${it.ownerName || ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
    if (hits.length === 1) {
      setResults(null);
      onOpen(hits[0]);
      return;
    }
    setResults(hits);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={find} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <p className="font-semibold">Find a listing</p>
            <p className="text-xs text-muted-foreground">By listing ID, title or owner name. Type <span className="font-mono">edit</span> for edited listings.</p>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResults(null); }}
              placeholder="e.g. SMS-00021 or Priya Nair"
              className="pl-10"
              aria-label="Listing ID or name"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {results && results.length === 0 && (
          <p className="mt-3 text-sm text-destructive">{/^edit(ed|s)?$/i.test(query.trim()) ? "No edited listings." : `No listing found for "${query.trim()}".`}</p>
        )}
        {results && results.length === 1 && /^edit(ed|s)?$/i.test(query.trim()) && (
          <p className="mt-3 text-sm text-muted-foreground">1 edited listing: <button type="button" className="font-medium text-primary underline" onClick={() => onOpen(results[0])}>{nameOf(results[0])}</button></p>
        )}
        {results && results.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-muted-foreground">{results.length} listings {/^edit(ed|s)?$/i.test(query.trim()) ? "were edited" : "match"}. Pick one:</p>
            <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
              {results.slice(0, 50).map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(it)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">{listingCode(it.id)}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{nameOf(it)}</span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{it.propertyType}{it.locality ? ` · ${it.locality}` : ""}</span>
                    {it.editedAt && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Edited</span>}
                    <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABEL[it.status || ""] || ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
