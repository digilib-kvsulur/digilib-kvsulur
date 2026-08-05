import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Edit, Save, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/utils";

const compressImage = (file: File, maxW: number, maxH: number, quality: number): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            else resolve(file);
          },
          "image/jpeg",
          quality
        );
      };
    };
  });
};

interface AdminProfileProps {
  user: any;
  onProfileUpdate?: () => void;
}

const AdminProfile = ({ user, onProfileUpdate }: AdminProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    username: "",
    bio: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadAvatar = async (path?: string | null) => {
    const p = path || user?.avatar_url;
    if (!p) {
      setAvatarUrl(null);
      return;
    }
    if (String(p).startsWith("http")) {
      setAvatarUrl(p);
      return;
    }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(p, 60 * 60 * 24 * 7);
    setAvatarUrl(data?.signedUrl || getAvatarUrl(p) || null);
  };

  useEffect(() => {
    if (!user) return;
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      username: user.username || "",
      bio: user.bio || "",
    });
    loadAvatar(user.avatar_url);
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadAvatar = async (file: File) => {
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file, 800, 800, 0.75);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, compressedFile, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (dbErr) throw dbErr;
      await loadAvatar(path);
      toast({ title: "Profile picture updated" });
      onProfileUpdate?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.first_name.trim()) {
      toast({ title: "Validation Error", description: "First name is required", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          username: formData.username.trim(),
          bio: formData.bio.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile updated" });
      setIsEditing(false);
      onProfileUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        username: user.username || "",
        bio: user.bio || "",
      });
    }
    setIsEditing(false);
  };

  const initials = `${(user?.first_name?.[0] || "").toUpperCase()}${(user?.last_name?.[0] || "").toUpperCase()}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="overflow-hidden border-border/50">
        <div className="h-28 sm:h-36 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />
        <CardContent className="relative pt-0 pb-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
            <div className="relative self-start">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg">
                {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">{initials || "A"}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow border border-background hover:opacity-90"
                title="Change photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl sm:text-2xl font-bold truncate">
                {user?.first_name} {user?.last_name}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {user?.username ? `@${user.username}` : user?.email}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge>Administrator</Badge>
                <Badge variant="outline" className="text-success border-success/30">Active</Badge>
              </div>
            </div>
            <div className="flex gap-2 sm:pb-1">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={loading} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving…" : "Save"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" disabled={loading} size="sm">
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
          {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading photo…</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5" /> Profile details
          </CardTitle>
          <CardDescription>Same account options as students — photo, bio, username, and contact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={formData.email} disabled className="bg-muted/40" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              disabled={!isEditing}
              placeholder="Username for login"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={!isEditing}
              placeholder="Phone number"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              disabled={!isEditing}
              rows={3}
              placeholder="Short bio shown on your community profile"
              maxLength={300}
            />
          </div>

          <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Member since</span>
              <p className="font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Role</span>
              <p className="font-medium text-primary">Administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfile;
