import { EyeOff } from "lucide-react";
import {
  IMPORTANCE, INTERESTS, LANGUAGES, PROFILE_OPTIONS, PROMPTS, QUESTIONS, SECTIONS, labelOf, type RoommateDetails,
} from "@/lib/roommate-form";

const IMP_STYLE: Record<string, string> = {
  dealbreaker: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  very: "bg-primary/10 text-primary",
};

/**
 * Roommate questionnaire answers. The public sees only what the user chose to show (the server
 * already removes hidden answers); admin/staff (showHidden) also see hidden ones, marked "Hidden".
 */
export function RoommateAnswers({ details, showHidden = false }: { details?: RoommateDetails; showHidden?: boolean }) {
  if (!details || !details.answers || !Object.keys(details.answers).length) return null;
  const a = details.answers || {};
  const vis = details.visible || {};
  const imp = details.importance || {};
  const visibleKey = (k: string) => (k === "weed" ? "smoke" : k);
  const about = [
    details.occupation && labelOf(PROFILE_OPTIONS.occupation, details.occupation),
    details.workplace,
    details.open_to && `Open to: ${labelOf(PROFILE_OPTIONS.open_to, details.open_to)}`,
    details.move_in && `Move-in: ${new Date(details.move_in).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      {about.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {about.map((t) => <span key={t} className="rounded-full border bg-muted/40 px-3 py-1 text-sm">{t}</span>)}
        </div>
      )}
      {SECTIONS.filter((s) => s.steps.some((k) => QUESTIONS[k])).map((s) => {
        const keys = s.steps.flatMap((k) => (k === "smoke" ? ["smoke", "weed"] : [k])).filter((k) => QUESTIONS[k] && a[k]);
        const rows = keys.filter((k) => showHidden || vis[visibleKey(k)] !== false);
        if (!rows.length) return null;
        return (
          <div key={s.title}>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</h5>
            <dl className="divide-y rounded-lg border">
              {rows.map((k) => {
                const hidden = vis[visibleKey(k)] === false;
                const level = k === "weed" ? undefined : imp[k];
                return (
                  <div key={k} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-3">
                    <dt className="text-muted-foreground">{QUESTIONS[k].title}</dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{labelOf(QUESTIONS[k].options, a[k])}</span>
                      {level && level !== "somewhat" && level !== "not_much" && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${IMP_STYLE[level] || ""}`}>{labelOf(IMPORTANCE, level)}</span>
                      )}
                      {showHidden && hidden && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"><EyeOff className="h-3 w-3" />Hidden</span>}
                    </dd>
                  </div>
                );
              })}
              {s.title === "More about you" && details.medical_note && (
                <div className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-3">
                  <dt className="text-muted-foreground">Medical note</dt><dd>{details.medical_note}</dd>
                </div>
              )}
            </dl>
          </div>
        );
      })}
      {((details.interests?.length && (showHidden || vis.interests !== false)) || details.languages?.length) ? (
        <div className="space-y-2">
          {!!details.interests?.length && (showHidden || vis.interests !== false) && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="mr-1 text-muted-foreground">Interests:</span>
              {details.interests.map((x) => <span key={x} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">{labelOf(INTERESTS, x)}</span>)}
            </div>
          )}
          {!!details.languages?.length && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="mr-1 text-muted-foreground">Languages:</span>
              {details.languages.map((x) => <span key={x} className="rounded-full bg-muted px-2.5 py-0.5">{labelOf(LANGUAGES, x)}</span>)}
            </div>
          )}
        </div>
      ) : null}
      {!!details.prompts?.length && (
        <div className="grid gap-2 sm:grid-cols-2">
          {details.prompts.map((p) => (
            <div key={p.q} className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">{labelOf(PROMPTS, p.q)}</p>
              <p className="mt-1 text-sm">{p.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
