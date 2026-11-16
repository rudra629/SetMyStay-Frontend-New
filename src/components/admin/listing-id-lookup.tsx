import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listingCode, matchesListingCode } from "@/lib/utils";

/** "Find by listing ID" box for the admin and staff panels: type SMS-00021 (or 21) and open that listing. */
export function ListingIdLookup<T extends { id: string; status?: string }>({
  items,
  onOpen,
}: {
  items: T[];
  onOpen: (item: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const find = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    const hit = items.find((it) => matchesListingCode(q, it.id));
    if (hit) {
      setMessage(null);
      onOpen(hit);
    } else {
      setMessage(/\d/.test(q) ? `No listing found with ID ${listingCode(q.replace(/\D/g, "")) || q}.` : "Enter a listing ID like SMS-00021.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={find} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <p className="font-semibold">Find by listing ID</p>
            <p className="text-xs text-muted-foreground">The ID owners see in My Properties.</p>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setMessage(null); }}
              placeholder="e.g. SMS-00021"
              className="pl-10"
              aria-label="Listing ID"
            />
          </div>
          <Button type="submit">Open listing</Button>
        </form>
        {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
      </CardContent>
    </Card>
  );
}
