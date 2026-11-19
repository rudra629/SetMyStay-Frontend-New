import { History, PencilLine } from "lucide-react";
import { changeFieldLabel, changeValueLabel } from "@/lib/roommate-form";
import type { ListingEditChange } from "@/lib/types";

/** Admin / staff only. "Edited" tag shown at the top of a listing the owner changed after approval. */
export function EditedTag({ editedAt }: { editedAt?: string }) {
  if (!editedAt) return null;
  const when = new Date(editedAt);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
      title={`Edited by the owner on ${when.toLocaleString("en-IN")}`}>
      <PencilLine className="h-3.5 w-3.5" /> Edited · {when.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
    </span>
  );
}

const isUrl = (v: unknown) => typeof v === "string" && /^https?:\/\//.test(v);
const DOC_FIELDS = ["document_aadhaar", "document_electricity", "document_noc", "video"];

function Value({ field, v, kind }: { field: string; v: unknown; kind: "old" | "new" }) {
  if (field === "photos" && Array.isArray(v)) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1 align-middle">
        <span>{changeValueLabel(field, v)}</span>
        {v.slice(0, 6).map((u) => (
          <a key={String(u)} href={String(u)} target="_blank" rel="noopener noreferrer">
            <img src={String(u)} alt="" className={`h-8 w-8 rounded object-cover ${kind === "old" ? "opacity-50 grayscale" : ""}`} />
          </a>
        ))}
      </span>
    );
  }
  if (DOC_FIELDS.includes(field)) {
    if (!v) return <span>—</span>;
    return isUrl(v) ? <a href={String(v)} target="_blank" rel="noopener noreferrer" className="underline">View file</a> : <span>Uploaded</span>;
  }
  return <span className="break-words">{changeValueLabel(field, v)}</span>;
}

/** List of changed fields: old value struck out, new value right beside it. */
export function ListingChanges({ changes, title = "Changes made by the owner" }: { changes?: ListingEditChange[]; title?: string }) {
  if (!changes || !changes.length) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <h4 className="mb-3 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200"><History className="h-4 w-4" /> {title}</h4>
      <ul className="space-y-2 text-sm">
        {changes.map((c) => (
          <li key={c.field} className="grid gap-1 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-3">
            <span className="font-medium text-muted-foreground">{changeFieldLabel(c.field)}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <del className="text-rose-700 decoration-2 dark:text-rose-300"><Value field={c.field} v={c.old} kind="old" /></del>
              <span aria-hidden className="text-muted-foreground">→</span>
              <ins className="font-semibold text-emerald-700 no-underline dark:text-emerald-300"><Value field={c.field} v={c.new} kind="new" /></ins>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Inline value in the details grid: if this field changed, show the old one struck out and the new one beside it. */
export function ChangedInline({ changes, field, children }: { changes?: ListingEditChange[]; field: string; children: React.ReactNode }) {
  const c = changes?.find((x) => x.field === field);
  if (!c) return <>{children}</>;
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      <del className="text-rose-700 decoration-2 dark:text-rose-300">{changeValueLabel(field, c.old)}</del>
      <span className="font-semibold text-emerald-700 dark:text-emerald-300">{changeValueLabel(field, c.new)}</span>
    </span>
  );
}
