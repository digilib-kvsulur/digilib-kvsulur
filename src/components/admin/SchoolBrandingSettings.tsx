import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Palette, Building, Sparkles, Check, Globe, Phone, Mail, MapPin } from "lucide-react";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { applyThemePrimaryColor } from "@/lib/utils";

const COLOR_PRESETS = [
  { name: "Indigo (Default)", color: "#4f46e5" },
  { name: "Teal", color: "#0d9488" },
  { name: "Emerald", color: "#10b981" },
  { name: "Amber", color: "#f59e0b" },
  { name: "Rose", color: "#e11d48" },
  { name: "Violet", color: "#7c3aed" },
  { name: "Sky Blue", color: "#0284c7" },
  { name: "Midnight", color: "#1e293b" },
];

export default function SchoolBrandingSettings() {
  const { settings, loading, saving, updateSettings } = useSchoolSettings();
  const { toast } = useToast();

  const [form, setForm] = useState(settings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Sync state once settings are loaded from DB
  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "banner" | "favicon"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be under 5MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (type === "logo") setUploadingLogo(true);
      if (type === "banner") setUploadingBanner(true);
      if (type === "favicon") setUploadingFavicon(true);

      const ext = file.name.split(".").pop();
      const filePath = `branding/${type}_${Date.now()}.${ext}`;

      // Upload to public storage bucket (using 'public-assets' or 'covers' bucket as fallback)
      const { error: uploadError } = await supabase.storage
        .from("book-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Try fallback bucket if exists
        throw uploadError;
      }

      const { data } = supabase.storage.from("book-covers").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      if (type === "logo") setForm((prev) => ({ ...prev, school_logo_url: publicUrl }));
      if (type === "banner") setForm((prev) => ({ ...prev, school_banner_url: publicUrl }));
      if (type === "favicon") setForm((prev) => ({ ...prev, school_favicon_url: publicUrl }));

      toast({
        title: "Image Uploaded",
        description: `${type.toUpperCase()} image has been uploaded successfully. Click Save to persist.`,
      });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload image. You can also paste an image URL directly.",
        variant: "destructive",
      });
    } finally {
      if (type === "logo") setUploadingLogo(false);
      if (type === "banner") setUploadingBanner(false);
      if (type === "favicon") setUploadingFavicon(false);
    }
  };

  const handleSave = async () => {
    const res = await updateSettings(form);
    if (res.success) {
      toast({
        title: "Branding Saved",
        description: "School branding and identity settings updated successfully.",
      });
      // Dynamically inject valid HSL color channels
      if (form.school_primary_color) {
        applyThemePrimaryColor(form.school_primary_color);
      }
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
            <Building className="h-5 w-5 text-primary" /> School Branding & Identity
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure your school's unique branding, names, photos, colors, and logos.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Basic Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">School Information</CardTitle>
          <CardDescription>
            Display name and titles used on headers, certificates, and the landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school_name">School Full Name</Label>
              <Input
                id="school_name"
                value={form.school_name}
                onChange={(e) => handleChange("school_name", e.target.value)}
                placeholder="e.g. PM SHRI KV SULUR"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school_tagline">Tagline / Subheading</Label>
              <Input
                id="school_tagline"
                value={form.school_tagline}
                onChange={(e) => handleChange("school_tagline", e.target.value)}
                placeholder="e.g. Digital Library Management System"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Identity & Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Logos & Banners</CardTitle>
          <CardDescription>
            Upload school crests, logos, and custom hero photography.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>School Crest / Logo</Label>
              <div className="border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                {form.school_logo_url ? (
                  <div className="relative w-20 h-20 rounded-full border bg-white p-2 shadow-sm flex items-center justify-center">
                    <img
                      src={form.school_logo_url}
                      alt="School Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="h-8 w-8" />
                  </div>
                )}
                <input
                  type="file"
                  ref={logoInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "logo")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="gap-2"
                >
                  {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload Logo
                </Button>
                <Input
                  className="text-xs h-8"
                  placeholder="Or paste direct image URL"
                  value={form.school_logo_url}
                  onChange={(e) => handleChange("school_logo_url", e.target.value)}
                />
              </div>
            </div>

            {/* Banner Photo Section */}
            <div className="space-y-2 md:col-span-2">
              <Label>Hero Background / Campus Photo</Label>
              <div className="border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                {form.school_banner_url ? (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border shadow-sm">
                    <img
                      src={form.school_banner_url}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
                    No custom banner uploaded (default library background will be used)
                  </div>
                )}
                <input
                  type="file"
                  ref={bannerInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "banner")}
                />
                <div className="flex gap-2 w-full justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingBanner}
                    onClick={() => bannerInputRef.current?.click()}
                    className="gap-2"
                  >
                    {uploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload Campus Photo
                  </Button>
                </div>
                <Input
                  className="text-xs h-8"
                  placeholder="Or paste direct banner image URL"
                  value={form.school_banner_url}
                  onChange={(e) => handleChange("school_banner_url", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors & Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Primary Color & Theme
          </CardTitle>
          <CardDescription>
            Choose your school's signature color theme for buttons, badges, and headers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => handleChange("school_primary_color", preset.color)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  form.school_primary_color === preset.color
                    ? "ring-2 ring-primary ring-offset-2 border-transparent font-bold"
                    : "hover:bg-muted"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                  style={{ backgroundColor: preset.color }}
                />
                {preset.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Label htmlFor="custom_color" className="text-xs">Custom Hex:</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="custom_color"
                value={form.school_primary_color}
                onChange={(e) => handleChange("school_primary_color", e.target.value)}
                className="w-8 h-8 rounded border cursor-pointer p-0.5"
              />
              <Input
                className="w-28 h-8 text-xs font-mono uppercase"
                value={form.school_primary_color}
                onChange={(e) => handleChange("school_primary_color", e.target.value)}
              />
            </div>
            <div
              className="text-xs px-3 py-1.5 rounded-md font-bold text-white shadow-xs ml-4"
              style={{ backgroundColor: form.school_primary_color }}
            >
              Preview Button
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact & Footer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Contact & Campus Location</CardTitle>
          <CardDescription>
            Shown in the top header strip and footer for parents and visitors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school_location" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Campus Location / City
              </Label>
              <Input
                id="school_location"
                value={form.school_location}
                onChange={(e) => handleChange("school_location", e.target.value)}
                placeholder="e.g. PM SHRI KV AFS Sulur, Coimbatore"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school_contact_email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Official Contact Email
              </Label>
              <Input
                id="school_contact_email"
                value={form.school_contact_email}
                onChange={(e) => handleChange("school_contact_email", e.target.value)}
                placeholder="e.g. dlms@kvsulur.in"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school_contact_phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Contact Phone (Optional)
              </Label>
              <Input
                id="school_contact_phone"
                value={form.school_contact_phone}
                onChange={(e) => handleChange("school_contact_phone", e.target.value)}
                placeholder="e.g. 0422-2687222"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school_website" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Official Website URL
              </Label>
              <Input
                id="school_website"
                value={form.school_website}
                onChange={(e) => handleChange("school_website", e.target.value)}
                placeholder="e.g. https://kvsulur.kvs.ac.in"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save Branding Changes
        </Button>
      </div>
    </div>
  );
}
