import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, LayoutTemplate, Megaphone, Eye, Sparkles } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useToast } from "@/hooks/use-toast";

export default function HomePageEditor() {
  const { settings, loading, saving, updateSettings } = useSchoolSettings();
  const { toast } = useToast();

  const [form, setForm] = useState(settings);

  // Sync state once loaded from DB
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const res = await updateSettings(form);
    if (res.success) {
      toast({
        title: "Home Page Saved",
        description: "Landing page customizations have been published successfully.",
      });
    } else {
      toast({
        title: "Error Saving",
        description: res.error,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Home Page Editor
          </h2>
          <p className="text-sm text-muted-foreground">
            Personalize hero messages, CTA actions, showcase widgets, and broadcast alerts on the home page.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Publish Changes
        </Button>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="hero">Hero Section</TabsTrigger>
          <TabsTrigger value="sections">Section Toggles</TabsTrigger>
          <TabsTrigger value="announcement">Announcement Bar</TabsTrigger>
        </TabsList>

        {/* Hero Section Tab */}
        <TabsContent value="hero" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Hero Banner Copy</CardTitle>
                  <CardDescription>
                    The main welcoming headline and message greeting students and teachers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="hero_title">Headline / Main Title</Label>
                    <Input
                      id="hero_title"
                      value={form.home_hero_title}
                      onChange={(e) => handleChange("home_hero_title", e.target.value)}
                      placeholder="e.g. A Library That Grows With Every Reader."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="hero_subtitle">Subtitle / Intro Paragraph</Label>
                    <Textarea
                      id="hero_subtitle"
                      rows={3}
                      value={form.home_hero_subtitle}
                      onChange={(e) => handleChange("home_hero_subtitle", e.target.value)}
                      placeholder="Introductory welcoming text..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cta_text">Primary Button Text</Label>
                      <Input
                        id="cta_text"
                        value={form.home_cta_text}
                        onChange={(e) => handleChange("home_cta_text", e.target.value)}
                        placeholder="e.g. Open Account"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cta_link">Button Destination</Label>
                      <Select
                        value={form.home_cta_link}
                        onValueChange={(val) => handleChange("home_cta_link", val)}
                      >
                        <SelectTrigger id="cta_link">
                          <SelectValue placeholder="Select Destination" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="/login">Login / Sign In</SelectItem>
                          <SelectItem value="/catalog">Book Catalog</SelectItem>
                          <SelectItem value="/download">Download App</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Card Preview */}
            <div className="lg:col-span-5">
              <Card className="h-full border-dashed bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Live Hero Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 rounded-xl border bg-card shadow-sm space-y-3 text-left">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3" /> {form.school_name || "KV SCHOOL"}
                    </span>
                    <h3 className="text-base font-extrabold text-foreground leading-snug">
                      {form.home_hero_title || "Library Headline"}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {form.home_hero_subtitle || "Welcome to our digital library..."}
                    </p>
                    <div className="pt-2">
                      <span
                        className="inline-block text-xs font-bold text-white px-3 py-1.5 rounded-lg shadow-xs"
                        style={{ backgroundColor: form.school_primary_color || "#4f46e5" }}
                      >
                        {form.home_cta_text || "Get Started"} &rarr;
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Preview reflects real-time adjustments before publishing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Section Toggles Tab */}
        <TabsContent value="sections" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Enable or Disable Sections</CardTitle>
              <CardDescription>
                Customize which blocks are shown to visitors on your public landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Statistics Band</Label>
                  <p className="text-xs text-muted-foreground">
                    Shows total books, circulation numbers, and active student reader counters.
                  </p>
                </div>
                <Switch
                  checked={form.home_show_stats}
                  onCheckedChange={(val) => handleChange("home_show_stats", val)}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Upcoming Events & Activities</Label>
                  <p className="text-xs text-muted-foreground">
                    Displays scheduled reading competitions, author meets, and celebrations.
                  </p>
                </div>
                <Switch
                  checked={form.home_show_events}
                  onCheckedChange={(val) => handleChange("home_show_events", val)}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Book of the Week Showcase</Label>
                  <p className="text-xs text-muted-foreground">
                    Featured recommendations spotlighted by the librarian.
                  </p>
                </div>
                <Switch
                  checked={form.home_show_botw}
                  onCheckedChange={(val) => handleChange("home_show_botw", val)}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Trending & Popular Books Grid</Label>
                  <p className="text-xs text-muted-foreground">
                    Carousel of most recently borrowed and top-rated books.
                  </p>
                </div>
                <Switch
                  checked={form.home_show_trending}
                  onCheckedChange={(val) => handleChange("home_show_trending", val)}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Library Photo Gallery</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-scrolling showcase of campus library events and photos.
                  </p>
                </div>
                <Switch
                  checked={form.home_show_gallery}
                  onCheckedChange={(val) => handleChange("home_show_gallery", val)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcement Bar Tab */}
        <TabsContent value="announcement" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" /> Top Broadcast Announcement
              </CardTitle>
              <CardDescription>
                Displays a prominent alert banner at the very top of your school's landing page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Show Announcement Bar</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn on when you have important dates, holidays, or book return drives.
                  </p>
                </div>
                <Switch
                  checked={form.home_announcement_enabled}
                  onCheckedChange={(val) => handleChange("home_announcement_enabled", val)}
                />
              </div>

              {form.home_announcement_enabled && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="announce_text">Announcement Message</Label>
                    <Input
                      id="announce_text"
                      value={form.home_announcement_text}
                      onChange={(e) => handleChange("home_announcement_text", e.target.value)}
                      placeholder="e.g. 📚 Annual Book Fair starting next Monday! All classes are invited."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="announce_type">Banner Alert Style</Label>
                    <Select
                      value={form.home_announcement_type}
                      onValueChange={(val: any) => handleChange("home_announcement_type", val)}
                    >
                      <SelectTrigger id="announce_type" className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info (Blue)</SelectItem>
                        <SelectItem value="warning">Notice / Alert (Amber)</SelectItem>
                        <SelectItem value="success">Celebration (Green)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Banner Preview */}
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground mb-1 block">Live Banner Preview:</Label>
                    <div
                      className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                        form.home_announcement_type === "warning"
                          ? "bg-amber-50 text-amber-900 border-amber-200"
                          : form.home_announcement_type === "success"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                          : "bg-blue-50 text-blue-900 border-blue-200"
                      }`}
                    >
                      <Megaphone className="h-4 w-4 shrink-0" />
                      <span>{form.home_announcement_text || "Your announcement text will appear here"}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Publish Home Page Changes
        </Button>
      </div>
    </div>
  );
}
