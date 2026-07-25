import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Trash2, Download, BookOpen, Loader2, Plus, FileDown } from "lucide-react";
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

interface NcertBookChapter {
  id: string;
  class_number: string;
  subject: string;
  book_name: string;
  chapter_title: string;
  chapter_number: number | null;
  file_url: string;
  created_at: string;
}

const CLASSES = ["6", "7", "8", "9", "10", "11", "12", "All"];
const SUBJECTS = ["Mathematics", "Science", "English", "Social Science", "Physics", "Chemistry", "Biology", "Hindi", "Sanskrit", "Computer Science", "CBSE Curriculum", "General"];

const StudyMaterialsManager = () => {
  const { toast } = useToast();
  
  // General study materials states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMats, setLoadingMats] = useState(true);
  const [uploadingMats, setUploadingMats] = useState(false);
  const [matsForm, setMatsForm] = useState({ title: "", description: "", subject: "General", student_class: "All" });
  const [matsFile, setMatsFile] = useState<File | null>(null);

  // NCERT chapters states
  const [ncertChapters, setNcertChapters] = useState<NcertBookChapter[]>([]);
  const [loadingNcert, setLoadingNcert] = useState(true);
  const [addingNcert, setAddingNcert] = useState(false);
  const [ncertFile, setNcertFile] = useState<File | null>(null);
  const [ncertForm, setNcertForm] = useState({
    class_number: "10",
    subject: "Mathematics",
    book_name: "Mathematics – Class 10",
    chapter_title: "Chapter 1 – Real Numbers",
    chapter_number: "1",
    file_url: "",
  });

  useEffect(() => {
    loadMaterials();
    loadNcertChapters();
  }, []);

  const loadMaterials = async () => {
    setLoadingMats(true);
    const { data, error } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load materials", description: error.message, variant: "destructive" });
    else setMaterials((data as Material[]) || []);
    setLoadingMats(false);
  };

  const loadNcertChapters = async () => {
    setLoadingNcert(true);
    const { data, error } = await supabase.from("ncert_books").select("*").order("class_number", { ascending: true }).order("subject", { ascending: true }).order("chapter_number", { ascending: true });
    if (error) toast({ title: "Failed to load NCERT", description: error.message, variant: "destructive" });
    else setNcertChapters((data as NcertBookChapter[]) || []);
    setLoadingNcert(false);
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matsFile || !matsForm.title.trim()) {
      toast({ title: "Missing info", description: "Title and a file are required", variant: "destructive" });
      return;
    }
    setUploadingMats(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const ext = matsFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("study-materials").upload(path, matsFile, {
        contentType: matsFile.type, upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("study-materials").getPublicUrl(path);

      const { error: insErr } = await supabase.from("study_materials").insert({
        title: matsForm.title.trim(),
        description: matsForm.description.trim() || null,
        subject: matsForm.subject,
        student_class: matsForm.student_class,
        file_url: pub.publicUrl,
        file_name: matsFile.name,
        file_type: matsFile.type,
        uploaded_by: user.id,
      });
      if (insErr) throw insErr;

      toast({ title: "Uploaded!", description: `${matsForm.title} is now available to students.` });
      setMatsForm({ title: "", description: "", subject: "General", student_class: "All" });
      setMatsFile(null);
      const fileInput = document.getElementById("sm-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      loadMaterials();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMats(false);
    }
  };

  const handleDeleteMaterial = async (m: Material) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      const marker = "/study-materials/";
      const idx = m.file_url.indexOf(marker);
      if (idx >= 0) {
        const path = m.file_url.substring(idx + marker.length);
        await supabase.storage.from("study-materials").remove([path]);
      }
      const { error } = await supabase.from("study_materials").delete().eq("id", m.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      loadMaterials();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAddNcertChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncertForm.file_url.trim() && !ncertFile) {
      toast({ title: "Resource URL or File is required", variant: "destructive" });
      return;
    }
    setAddingNcert(true);
    try {
      let finalUrl = ncertForm.file_url.trim();

      if (ncertFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const ext = ncertFile.name.split(".").pop();
        const path = `ncert/${ncertForm.class_number}/${ncertForm.subject}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("study-materials").upload(path, ncertFile, {
          contentType: ncertFile.type, upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("study-materials").getPublicUrl(path);
        finalUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("ncert_books").insert({
        class_number: ncertForm.class_number,
        subject: ncertForm.subject,
        book_name: ncertForm.book_name.trim(),
        chapter_title: ncertForm.chapter_title.trim(),
        chapter_number: parseInt(ncertForm.chapter_number) || null,
        file_url: finalUrl,
      });
      if (error) throw error;

      toast({ title: "NCERT Chapter Added!", description: "Chapter successfully registered in database." });
      setNcertForm(prev => ({
        ...prev,
        chapter_title: `Chapter ${parseInt(prev.chapter_number || "0") + 1} – `,
        chapter_number: String(parseInt(prev.chapter_number || "0") + 1),
        file_url: "",
      }));
      setNcertFile(null);
      const fEl = document.getElementById("nc-file") as HTMLInputElement;
      if (fEl) fEl.value = "";
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Failed to add chapter", description: err.message, variant: "destructive" });
    } finally {
      setAddingNcert(false);
    }
  };

  const handleDeleteNcertChapter = async (c: NcertBookChapter) => {
    if (!confirm(`Delete NCERT chapter "${c.chapter_title}"?`)) return;
    try {
      const { error } = await supabase.from("ncert_books").delete().eq("id", c.id);
      if (error) throw error;
      toast({ title: "Deleted" });
      loadNcertChapters();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Study Materials Hub
          </h2>
          <p className="text-sm text-muted-foreground">Manage reference guides, CBSE curriculum materials, and NCERT books.</p>
        </div>
      </div>

      <Tabs defaultValue="materials" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="materials">Reference & Curriculum Materials</TabsTrigger>
          <TabsTrigger value="ncert">NCERT Books Manager</TabsTrigger>
        </TabsList>

        {/* Tab 1: Reference Materials */}
        <TabsContent value="materials" className="space-y-6 mt-0">
          <div className="flex justify-end">
            <BulkImportMaterials onImported={loadMaterials} />
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-500" /> Add Reference / CBSE Material</CardTitle>
              <CardDescription>Upload notes or curriculum details immediately visible to students.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadMaterial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Title *</Label>
                  <Input value={matsForm.title} onChange={e => setMatsForm({ ...matsForm, title: e.target.value })} placeholder="e.g. CBSE Class 10 Syllabus 2026-27 or Chemistry Notes" required />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={matsForm.description} onChange={e => setMatsForm({ ...matsForm, description: e.target.value })} placeholder="Brief details about the resource..." rows={2} />
                </div>
                <div>
                  <Label>Subject / Category</Label>
                  <Select value={matsForm.subject} onValueChange={v => setMatsForm({ ...matsForm, subject: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Class</Label>
                  <Select value={matsForm.student_class} onValueChange={v => setMatsForm({ ...matsForm, student_class: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c === "All" ? "All Classes" : `Class ${c}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>File * (PDF, Word doc, image, etc.)</Label>
                  <Input id="sm-file" type="file" onChange={e => setMatsFile(e.target.files?.[0] || null)} required />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={uploadingMats} className="gradient-primary border-0 font-bold">
                    {uploadingMats ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Material</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Uploaded Resources ({materials.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingMats ? (
                <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : materials.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No resources uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {materials.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">{m.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.subject} · {m.student_class === "All" ? "All Classes" : `Class ${m.student_class}`}
                          {m.description && ` · ${m.description}`}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="h-8">
                        <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                      </Button>
                      <Button onClick={() => handleDeleteMaterial(m)} variant="ghost" size="sm" className="text-destructive h-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: NCERT Chapters */}
        <TabsContent value="ncert" className="space-y-6 mt-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5 text-indigo-500" /> Add NCERT Chapter</CardTitle>
              <CardDescription>Upload a chapter PDF file or provide a direct web link (e.g. from ncert.nic.in).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddNcertChapter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Class Number *</Label>
                  <Select value={ncertForm.class_number} onValueChange={v => setNcertForm({ ...ncertForm, class_number: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["6", "7", "8", "9", "10", "11", "12"].map(num => <SelectItem key={num} value={num}>Class {num}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Select value={ncertForm.subject} onValueChange={v => setNcertForm({ ...ncertForm, subject: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Mathematics", "Science", "English", "Social Science", "Physics", "Chemistry", "Biology", "Hindi"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Book Name *</Label>
                  <Input value={ncertForm.book_name} onChange={e => setNcertForm({ ...ncertForm, book_name: e.target.value })} placeholder="e.g. Mathematics – Class 10" required />
                </div>
                <div>
                  <Label>Chapter Number (Optional)</Label>
                  <Input type="number" value={ncertForm.chapter_number} onChange={e => setNcertForm({ ...ncertForm, chapter_number: e.target.value })} placeholder="e.g. 1" />
                </div>
                <div className="md:col-span-2">
                  <Label>Chapter Title *</Label>
                  <Input value={ncertForm.chapter_title} onChange={e => setNcertForm({ ...ncertForm, chapter_title: e.target.value })} placeholder="e.g. Chapter 1 – Real Numbers" required />
                </div>
                <div className="md:col-span-2">
                  <div className="border p-4 rounded-xl space-y-3 bg-slate-50">
                    <Label className="font-bold text-slate-700">Choose Resource Option</Label>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Option A: PDF URL (Fastest, saves storage space)</Label>
                        <Input value={ncertForm.file_url} onChange={e => setNcertForm({ ...ncertForm, file_url: e.target.value, ...{ file_file: null } })} placeholder="e.g. https://ncert.nic.in/textbook/pdf/jemh101.pdf" />
                      </div>
                      <div className="text-center text-xs text-muted-foreground">— OR —</div>
                      <div>
                        <Label className="text-xs">Option B: Upload PDF File directly</Label>
                        <Input id="nc-file" type="file" accept=".pdf" onChange={e => setNcertFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={addingNcert} className="gradient-primary border-0 font-bold">
                    {addingNcert ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : <><Plus className="h-4 w-4 mr-2" /> Register NCERT Chapter</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Registered NCERT Chapters ({ncertChapters.length})</CardTitle></CardHeader>
            <CardContent>
              {loadingNcert ? (
                <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
              ) : ncertChapters.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No custom NCERT chapters loaded. Local defaults will be shown to students.</p>
              ) : (
                <div className="space-y-2">
                  {ncertChapters.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-extrabold text-sm">
                          {c.class_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate text-sm">{c.chapter_title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.book_name} ({c.subject})
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8">
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                        </Button>
                        <Button onClick={() => handleDeleteNcertChapter(c)} variant="ghost" size="sm" className="text-destructive h-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudyMaterialsManager;
