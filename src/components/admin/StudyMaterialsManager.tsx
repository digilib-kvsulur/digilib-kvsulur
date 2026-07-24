import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, Download, BookOpen, Loader2 } from "lucide-react";
import BulkImportMaterials from "./BulkImportMaterials";

interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  student_class: string | null;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
}

const CLASSES = ["6", "7", "8", "9", "10", "11", "12", "All"];
const SUBJECTS = ["Mathematics", "Science", "English", "Social Science", "Hindi", "Sanskrit", "Computer Science", "General"];

const StudyMaterialsManager = () => {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", subject: "General", student_class: "All" });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setMaterials((data as Material[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !form.title.trim()) {
      toast({ title: "Missing info", description: "Title and a file are required", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("study-materials").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("study-materials").getPublicUrl(path);

      const { error: insErr } = await supabase.from("study_materials").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        subject: form.subject,
        student_class: form.student_class,
        file_url: pub.publicUrl,
        file_name: file.name,
        file_type: file.type,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast({ title: "Uploaded!", description: `${form.title} is now available to students.` });
      setForm({ title: "", description: "", subject: "General", student_class: "All" });
      setFile(null);
      const fileInput = document.getElementById("sm-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      load();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (m: Material) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      // Extract storage path from public URL
      const marker = "/study-materials/";
      const idx = m.file_url.indexOf(marker);
      if (idx >= 0) {
        const path = m.file_url.substring(idx + marker.length);
        await supabase.storage.from("study-materials").remove([path]);
      }
      const { error } = await supabase.from("study_materials").delete().eq("id", m.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Study Materials
          </h2>
          <p className="text-sm text-muted-foreground">Upload PDFs, notes, and resources for students.</p>
        </div>
        <BulkImportMaterials onImported={load} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" /> Add New Material</CardTitle>
          <CardDescription>Visible to all approved students immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Class 10 Math - Quadratic Equations Notes" required />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={2} />
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={form.subject} onValueChange={v => setForm({ ...form, subject: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class</Label>
              <Select value={form.student_class} onValueChange={v => setForm({ ...form, student_class: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>File * (PDF, DOC, image, etc.)</Label>
              <Input id="sm-file" type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={uploading} className="gradient-primary border-0">
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Material</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uploaded Materials ({materials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : materials.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No materials uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {materials.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.subject} · {m.student_class === "All" ? "All Classes" : `Class ${m.student_class}`}
                      {m.description && ` · ${m.description}`}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                  </Button>
                  <Button onClick={() => handleDelete(m)} variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyMaterialsManager;
