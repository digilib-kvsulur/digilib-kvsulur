import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, IndianRupee, Target, Award, Upload, Trash2, Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFineSettings,
  fetchMonthlyReadingGoal,
  fetchCertificateTemplateUrl,
  fetchDevMessageSettings,
  fetchGamesScheduleSettings,
  fetchDownloadUrls,
  fetchGoogleAiApiKey,
  fetchGlobalNewsColor
} from "@/lib/librarySettings";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Clock, MessageSquare, Megaphone, DownloadCloud, Key } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LibrarySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finePerDay, setFinePerDay] = useState(1);
  const [upiId, setUpiId] = useState("");
  const [upiPayeeName, setUpiPayeeName] = useState("PM SHRI KV AFS Sulur Library");
  const [monthlyGoal, setMonthlyGoal] = useState(3);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zones, setZones] = useState<{ label: string; color: string }[]>([]);

  const [devMessageEnabled, setDevMessageEnabled] = useState(false);
  const [devMessageTitle, setDevMessageTitle] = useState("News & Updates");
  const [devMessageBody, setDevMessageBody] = useState("");
  const [devMessageLinkUrl, setDevMessageLinkUrl] = useState("");
  const [devMessageLinkText, setDevMessageLinkText] = useState("Learn More");
  const [globalNewsColor, setGlobalNewsColor] = useState("blue");

  // Games Schedule
  const [gamesScheduleEnabled, setGamesScheduleEnabled] = useState(false);
  const [gamesScheduleStart, setGamesScheduleStart] = useState("09:00");
  const [gamesScheduleEnd, setGamesScheduleEnd] = useState("17:00");

  // App Downloads
  const [downloadApkUrl, setDownloadApkUrl] = useState("");
  const [downloadExeUrl, setDownloadExeUrl] = useState("");

  const [googleAiKey, setGoogleAiKey] = useState("");
  const [libraryBotVisible, setLibraryBotVisible] = useState(true);
  const [libraryBotName, setLibraryBotName] = useState("LibraryBot");

  const load = async () => {
    setLoading(true);
    try {
      const [fine, goal, cert, devMsg, gamesSch, downloads, aiKey, newsColor, botVisible, botNameSetting] = await Promise.all([
        fetchFineSettings(),
        fetchMonthlyReadingGoal(),
        fetchCertificateTemplateUrl(),
        fetchDevMessageSettings(),
        fetchGamesScheduleSettings(),
        fetchDownloadUrls(),
        fetchGoogleAiApiKey(),
        fetchGlobalNewsColor(),
        supabase.from("system_settings").select("value").eq("key", "library_bot_visible").maybeSingle().then(res => {
          if (res.data?.value === undefined) return true;
          return res.data.value === "true" || res.data.value === true;
        }),
        supabase.from("system_settings").select("value").eq("key", "library_bot_name").maybeSingle().then(res => {
          return res.data?.value ? String(res.data.value).trim() : "LibraryBot";
        })
      ]);
      setFinePerDay(fine.finePerDay);
      setUpiId(fine.upiId);
      setUpiPayeeName(fine.upiPayeeName);
      setMonthlyGoal(goal);
      setTemplateUrl(cert);
      setDevMessageEnabled(devMsg.enable);
      setDevMessageTitle(devMsg.title);
      setDevMessageBody(devMsg.message);
      setDevMessageLinkUrl(devMsg.linkUrl || "");
      setDevMessageLinkText(devMsg.linkText || "Learn More");
      setGlobalNewsColor(newsColor);
      setGamesScheduleEnabled(gamesSch.enable);
      setGamesScheduleStart(gamesSch.start);
      setGamesScheduleEnd(gamesSch.end);
      setDownloadApkUrl(downloads.apkUrl);
      setDownloadExeUrl(downloads.exeUrl);
      setGoogleAiKey(aiKey);
      setLibraryBotVisible(botVisible);
      setLibraryBotName(botNameSetting);

      const { data: zonesData } = await supabase.from("system_settings").select("value").eq("key", "library_map_zones").maybeSingle();
      if (zonesData?.value) {
        try {
          const parsed = typeof zonesData.value === "string" ? JSON.parse(zonesData.value) : zonesData.value;
          if (Array.isArray(parsed)) {
            setZones(parsed);
          } else {
            setZones([]);
          }
        } catch { setZones([]); }
      } else {
        setZones([
          { label: "Fiction & Novels", color: "bg-blue-100 text-blue-800" },
          { label: "Science & Math", color: "bg-emerald-100 text-emerald-800" },
          { label: "History & Geography", color: "bg-amber-100 text-amber-800" },
          { label: "NCERT & Textbooks", color: "bg-indigo-100 text-indigo-800" },
          { label: "Reference & Encyclopedias", color: "bg-purple-100 text-purple-800" },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (finePerDay < 0) {
      toast({ title: "Invalid fine", description: "Fine per day cannot be negative.", variant: "destructive" });
      return;
    }
    if (monthlyGoal < 1) {
      toast({ title: "Invalid goal", description: "Monthly reading goal must be at least 1.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const upserts = [
        { key: "fine_per_day", value: finePerDay as any },
        { key: "upi_id", value: upiId.trim() as any },
        { key: "upi_payee_name", value: (upiPayeeName.trim() || "PM SHRI KV AFS Sulur Library") as any },
        { key: "monthly_reading_goal", value: monthlyGoal as any },
        { key: "certificate_template_url", value: (templateUrl || null) as any },
        { key: "dev_message_enabled", value: devMessageEnabled as any },
        { key: "dev_message_title", value: devMessageTitle.trim() as any },
        { key: "dev_message_body", value: devMessageBody.trim() as any },
        { key: "dev_message_link_url", value: devMessageLinkUrl.trim() as any },
        { key: "dev_message_link_text", value: devMessageLinkText.trim() as any },
        { key: "enable_games_schedule", value: gamesScheduleEnabled as any },
        { key: "games_schedule_start", value: gamesScheduleStart as any },
        { key: "games_schedule_end", value: gamesScheduleEnd as any },
        { key: "library_map_zones", value: zones as any },
        { key: "download_apk_url", value: downloadApkUrl.trim() as any },
        { key: "download_exe_url", value: downloadExeUrl.trim() as any },
        { key: "google_ai_api_key", value: googleAiKey.trim() as any },
        { key: "global_news_color", value: globalNewsColor.trim() as any },
        { key: "library_bot_visible", value: libraryBotVisible as any },
        { key: "library_bot_name", value: libraryBotName.trim() as any },
      ];
      const { error } = await supabase.from("system_settings").upsert(upserts, { onConflict: "key" });
      if (error) throw error;
      await supabase.from("fine_settings").upsert({
        id: 1,
        rate_per_day: finePerDay,
        upi_id: upiId.trim(),
        upi_payee_name: upiPayeeName.trim() || "PM SHRI KV AFS Sulur Library",
        updated_at: new Date().toISOString(),
      });
      const month = new Date().toISOString().substring(0, 7);
      // Upsert school-wide reading goal row
      await supabase.from("reading_goals").delete().is("user_id", null).eq("month", month);
      await supabase.from("reading_goals").insert({ user_id: null as any, month, target_books: monthlyGoal });
      toast({ title: "Settings saved", description: "Library settings have been updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image (PNG/JPG).", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `templates/certificate-template-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("certificates").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("certificates").getPublicUrl(path);
      setTemplateUrl(data.publicUrl);
      await supabase.from("system_settings").upsert(
        [{ key: "certificate_template_url", value: data.publicUrl as any }],
        { onConflict: "key" }
      );
      toast({ title: "Template uploaded", description: "Certificate design saved." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const [resettingLeaderboard, setResettingLeaderboard] = useState(false);

  const handleResetMonthlyLeaderboard = async () => {
    const confirmReset = window.confirm("Are you sure you want to reset the monthly leaderboard? All student monthly points will be reset to 0 and current standings will be archived.");
    if (!confirmReset) return;
    setResettingLeaderboard(true);
    try {
      const { error } = await supabase.rpc("reset_monthly_leaderboard");
      if (error) throw error;
      toast({ title: "Leaderboard Reset!", description: "Student monthly points have been reset to 0 and current standings have been archived." });
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message || "Failed to reset leaderboard", variant: "destructive" });
    } finally {
      setResettingLeaderboard(false);
    }
  };

  const clearTemplate = async () => {
    setTemplateUrl(null);
    await supabase.from("system_settings").upsert(
      [{ key: "certificate_template_url", value: null as any }],
      { onConflict: "key" }
    );
    toast({ title: "Template removed" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Library Settings
          </h2>
          <p className="text-sm text-muted-foreground">Fines, UPI payments, reading goals, and certificates.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" /> Overdue Fines & UPI
          </CardTitle>
          <CardDescription>
            Students see a Pay via UPI link when books are overdue. Works with any UPI ID (GPay, PhonePe, BHIM, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="finePerDay">Fine per day (₹)</Label>
              <Input
                id="finePerDay"
                type="number"
                min={0}
                step={1}
                value={finePerDay}
                onChange={(e) => setFinePerDay(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Default ₹1/day. Change anytime.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upiPayee">Payee name (shown in UPI apps)</Label>
              <Input
                id="upiPayee"
                value={upiPayeeName}
                onChange={(e) => setUpiPayeeName(e.target.value)}
                placeholder="PM SHRI KV AFS Sulur Library"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="library@upi or phonenumber@paytm"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to show fine amount only (no payment link).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> School-wide Monthly Reading Goal
          </CardTitle>
          <CardDescription>
            Applies to all students. They can track progress but cannot change the target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="monthlyGoal">Books per month</Label>
            <Input
              id="monthlyGoal"
              type="number"
              min={1}
              max={50}
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 1)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Award className="h-4 w-4" /> Reset Monthly Leaderboard
          </CardTitle>
          <CardDescription>
            Reset monthly points for all students back to 0. The current rankings will be archived into the history standings table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleResetMonthlyLeaderboard} disabled={resettingLeaderboard}>
            {resettingLeaderboard ? "Resetting..." : "Reset Leaderboard Now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Global News & Updates
          </CardTitle>
          <CardDescription>
            Display a popup message across all dashboards (News Corner / Developer Message).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable News Corner Popup</Label>
              <p className="text-sm text-muted-foreground">Turn on to show the popup.</p>
            </div>
            <Switch checked={devMessageEnabled} onCheckedChange={setDevMessageEnabled} />
          </div>
          {devMessageEnabled && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="devMsgTitle">Title</Label>
                <Input
                  id="devMsgTitle"
                  value={devMessageTitle}
                  onChange={(e) => setDevMessageTitle(e.target.value)}
                  placeholder="e.g. News & Updates"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="devMsgBody">Message Body</Label>
                <Textarea
                  id="devMsgBody"
                  value={devMessageBody}
                  onChange={(e) => setDevMessageBody(e.target.value)}
                  placeholder="Enter the news or developer message..."
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="devMsgLinkUrl">Optional Button Link URL</Label>
                <Input
                  id="devMsgLinkUrl"
                  value={devMessageLinkUrl}
                  onChange={(e) => setDevMessageLinkUrl(e.target.value)}
                  placeholder="e.g. https://google.com (Leave blank for no button)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="devMsgLinkText">Button Label</Label>
                <Input
                  id="devMsgLinkText"
                  value={devMessageLinkText}
                  onChange={(e) => setDevMessageLinkText(e.target.value)}
                  placeholder="e.g. Learn More"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="globalNewsColor">Popup Color Theme</Label>
                <Select value={globalNewsColor} onValueChange={setGlobalNewsColor}>
                  <SelectTrigger id="globalNewsColor">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue (Info)</SelectItem>
                    <SelectItem value="amber">Amber (Warning)</SelectItem>
                    <SelectItem value="emerald">Emerald (Success)</SelectItem>
                    <SelectItem value="purple">Purple (Event)</SelectItem>
                    <SelectItem value="rose">Rose (Alert)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Games Schedule
          </CardTitle>
          <CardDescription>
            Control when the Games Corner is accessible to students.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Games Schedule</Label>
              <p className="text-sm text-muted-foreground">If disabled, games are always available.</p>
            </div>
            <Switch checked={gamesScheduleEnabled} onCheckedChange={setGamesScheduleEnabled} />
          </div>
          {gamesScheduleEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="gamesStart">Start Time</Label>
                <Input
                  id="gamesStart"
                  type="time"
                  value={gamesScheduleStart}
                  onChange={(e) => setGamesScheduleStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gamesEnd">End Time</Label>
                <Input
                  id="gamesEnd"
                  type="time"
                  value={gamesScheduleEnd}
                  onChange={(e) => setGamesScheduleEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-500" /> Library Map Zones Config
          </CardTitle>
          <CardDescription>
            Configure the zones/categories shown on the Library Map Explorer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zones.map((zone, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-4 border rounded-xl bg-slate-50 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 hover:bg-red-100 text-red-500"
                onClick={() => setZones(zones.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Zone Label</Label>
                  <Input
                    placeholder="e.g. Science & Math"
                    value={zone.label}
                    onChange={(e) => {
                      const updated = [...zones];
                      updated[idx].label = e.target.value;
                      setZones(updated);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color Scheme</Label>
                  <Select
                    value={zone.color}
                    onValueChange={(val) => {
                      const updated = [...zones];
                      updated[idx].color = val;
                      setZones(updated);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Color Scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bg-blue-100 text-blue-800">Blue</SelectItem>
                      <SelectItem value="bg-emerald-100 text-emerald-800">Emerald</SelectItem>
                      <SelectItem value="bg-amber-100 text-amber-800">Amber</SelectItem>
                      <SelectItem value="bg-indigo-100 text-indigo-800">Indigo</SelectItem>
                      <SelectItem value="bg-purple-100 text-purple-800">Purple</SelectItem>
                      <SelectItem value="bg-rose-100 text-rose-800">Rose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Assigned Cupboards (comma separated)</Label>
                  <Input
                    placeholder="e.g. C-1, C-2, C-3"
                    value={(zone as any).cupboards || ""}
                    onChange={(e) => {
                      const updated = [...zones];
                      (updated[idx] as any).cupboards = e.target.value;
                      setZones(updated);
                    }}
                  />
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs">X Pos</Label>
                    <Input type="number" value={(zone as any).x || 50} onChange={e => { const u = [...zones]; (u[idx] as any).x = Number(e.target.value); setZones(u); }} />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs">Y Pos</Label>
                    <Input type="number" value={(zone as any).y || 50} onChange={e => { const u = [...zones]; (u[idx] as any).y = Number(e.target.value); setZones(u); }} />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs">Width</Label>
                    <Input type="number" value={(zone as any).w || 200} onChange={e => { const u = [...zones]; (u[idx] as any).w = Number(e.target.value); setZones(u); }} />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-xs">Height</Label>
                    <Input type="number" value={(zone as any).h || 200} onChange={e => { const u = [...zones]; (u[idx] as any).h = Number(e.target.value); setZones(u); }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZones([...zones, { label: "", color: "bg-blue-100 text-blue-800" }])}
          >
            Add New Zone
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" /> Certificate Design
          </CardTitle>
          <CardDescription>
            Upload a certificate background/template image. Used when issuing certificates to students.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templateUrl ? (
            <div className="space-y-3">
              <img
                src={templateUrl}
                alt="Certificate template"
                className="max-h-48 rounded-lg border object-contain bg-muted/30"
              />
              <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <label htmlFor="certUpload" className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {uploading ? "Uploading..." : "Replace"}
                  </label>
                </Button>
                <Button variant="ghost" size="sm" onClick={clearTemplate}>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center">
              <Award className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No template uploaded yet</p>
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <label htmlFor="certUpload" className="cursor-pointer">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploading ? "Uploading..." : "Upload template"}
                </label>
              </Button>
            </div>
          )}
          <input
            id="certUpload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleTemplateUpload}
          />
          <Separator />
          <p className="text-xs text-muted-foreground">
            Issue certificates from the Certificates tab after uploading a design.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <DownloadCloud className="h-4 w-4" /> App Downloads
          </CardTitle>
          <CardDescription>
            Configure the URLs for downloading the DLMS client apps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apkUrl">Android APK URL</Label>
            <Input
              id="apkUrl"
              value={downloadApkUrl}
              onChange={(e) => setDownloadApkUrl(e.target.value)}
              placeholder="https://example.com/app.apk"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exeUrl">Windows EXE URL</Label>
            <Input
              id="exeUrl"
              value={downloadExeUrl}
              onChange={(e) => setDownloadExeUrl(e.target.value)}
              placeholder="https://example.com/app.exe"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Key className="h-4 w-4" /> AI Integrations
          </CardTitle>
          <CardDescription>
            Configure API keys for AI features like generative insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="googleAiKey">Google AI Studio API Key</Label>
            <Input
              id="googleAiKey"
              type="password"
              value={googleAiKey}
              onChange={(e) => setGoogleAiKey(e.target.value)}
              placeholder="Enter API key"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for library assistant and book recommendations.
            </p>
          </div>
          <div className="space-y-1.5 pt-4 border-t border-border mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Chat Assistant</Label>
                <p className="text-xs text-muted-foreground">Show the chat assistant in the student dashboard and home page.</p>
              </div>
              <Switch checked={libraryBotVisible} onCheckedChange={setLibraryBotVisible} />
            </div>
          </div>
          {libraryBotVisible && (
            <div className="space-y-1.5 pt-3">
              <Label htmlFor="libraryBotName">Chat Assistant Display Name</Label>
              <Input
                id="libraryBotName"
                value={libraryBotName}
                onChange={(e) => setLibraryBotName(e.target.value)}
                placeholder="e.g. LibraryBot or E-Librarian"
                className="max-w-xs h-9 text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
