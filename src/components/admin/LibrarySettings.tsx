import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, IndianRupee, Target, Award, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFineSettings,
  fetchMonthlyReadingGoal,
  fetchCertificateTemplateUrl,
  fetchDevMessageSettings,
  fetchGamesScheduleSettings,
} from "@/lib/librarySettings";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Clock, MessageSquare, Megaphone } from "lucide-react";

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

  // Dev Message / News Corner
  const [devMessageEnabled, setDevMessageEnabled] = useState(false);
  const [devMessageTitle, setDevMessageTitle] = useState("News & Updates");
  const [devMessageBody, setDevMessageBody] = useState("");

  // Games Schedule
  const [gamesScheduleEnabled, setGamesScheduleEnabled] = useState(false);
  const [gamesScheduleStart, setGamesScheduleStart] = useState("09:00");
  const [gamesScheduleEnd, setGamesScheduleEnd] = useState("17:00");

  const load = async () => {
    setLoading(true);
    try {
      const [fine, goal, cert, devMsg, gamesSch] = await Promise.all([
        fetchFineSettings(),
        fetchMonthlyReadingGoal(),
        fetchCertificateTemplateUrl(),
        fetchDevMessageSettings(),
        fetchGamesScheduleSettings(),
      ]);
      setFinePerDay(fine.finePerDay);
      setUpiId(fine.upiId);
      setUpiPayeeName(fine.upiPayeeName);
      setMonthlyGoal(goal);
      setTemplateUrl(cert);
      setDevMessageEnabled(devMsg.enable);
      setDevMessageTitle(devMsg.title);
      setDevMessageBody(devMsg.message);
      setGamesScheduleEnabled(gamesSch.enable);
      setGamesScheduleStart(gamesSch.start);
      setGamesScheduleEnd(gamesSch.end);
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
        { key: "enable_games_schedule", value: gamesScheduleEnabled as any },
        { key: "games_schedule_start", value: gamesScheduleStart as any },
        { key: "games_schedule_end", value: gamesScheduleEnd as any },
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
    </div>
  );
}
