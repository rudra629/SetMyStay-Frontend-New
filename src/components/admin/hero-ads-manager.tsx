import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Megaphone, PlusCircle, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { HeroAd } from "@/components/sections/hero-ad-banner";

/** Admin > Management: ads for the moving banner on the home hero. No active ads = no banner. */
export function HeroAdsManager() {
  const { toast } = useToast();
  const [ads, setAds] = useState<HeroAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/hero-ads/?all=1");
      setAds(Array.isArray(data) ? data : data?.results || []);
    } catch { /* keep list */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    let url = link.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    const fd = new FormData();
    fd.append("text", t);
    if (url) fd.append("link_url", url);
    fd.append("is_active", "true");
    fd.append("sort_order", String(ads.length));
    if (file) fd.append("image", file);
    setSaving(true);
    try {
      await api.post("/hero-ads/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast({ title: "Ad added", description: "It now moves across the home page banner." });
      setText(""); setLink(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err: any) {
      const d = err?.response?.data;
      const msg = d?.link_url?.[0] ? "Please enter a valid link." : d?.image || d?.text?.[0] || "Could not add the ad. Please try again.";
      toast({ title: "Not added", description: String(msg), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggle = async (ad: HeroAd, on: boolean) => {
    setAds((a) => a.map((x) => (x.id === ad.id ? { ...x, is_active: on } : x)));
    try { await api.patch(`/hero-ads/${ad.id}/`, { is_active: on }); }
    catch { toast({ title: "Could not update", variant: "destructive" }); load(); }
  };

  const remove = async (ad: HeroAd) => {
    if (!window.confirm(`Remove this ad?\n\n"${ad.text}"`)) return;
    try {
      await api.delete(`/hero-ads/${ad.id}/`);
      setAds((a) => a.filter((x) => x.id !== ad.id));
      toast({ title: "Ad removed" });
    } catch { toast({ title: "Could not remove", variant: "destructive" }); }
  };

  const activeCount = ads.filter((a) => a.is_active !== false).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl"><Megaphone className="h-6 w-6" /> Home Banner Ads</CardTitle>
        <CardDescription>
          Ads move right to left across the top of the home page. {activeCount ? `${activeCount} showing now.` : "No ads are showing, so the banner is hidden."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={add} className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="hero-ad-text">Ad text</Label>
            <Input id="hero-ad-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} placeholder="e.g. 20% off movers this month at QuickShift" />
            <p className="text-right text-xs text-muted-foreground">{text.length}/140</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hero-ad-link">Link (optional)</Label>
              <Input id="hero-ad-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hero-ad-image">Small logo / image (optional)</Label>
              <Input id="hero-ad-image" ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <Button type="submit" disabled={saving || !text.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" />{saving ? "Adding..." : "Add ad"}
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading ads…</p>
        ) : !ads.length ? (
          <p className="text-sm text-muted-foreground">No banner ads yet.</p>
        ) : (
          <div className="space-y-2">
            {ads.map((ad) => (
              <div key={ad.id} className="flex items-center gap-3 rounded-lg border p-3">
                {ad.image_url
                  ? <img src={ad.image_url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                  : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><ImageIcon className="h-5 w-5" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ad.text}</p>
                  {ad.link_url && <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">{ad.link_url}</a>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch checked={ad.is_active !== false} onCheckedChange={(on) => toggle(ad, on)} aria-label="Show this ad" />
                  <Button size="icon" variant="ghost" onClick={() => remove(ad)} aria-label="Remove ad"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
