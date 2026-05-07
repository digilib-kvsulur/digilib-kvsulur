import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Search, BookOpen, Loader2 } from "lucide-react";

interface Material {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  student_class: string | null;
  file_url: string;
  file_name: string | null;
  created_at: string;
}

const StudyMaterials = ({ studentClass }: { studentClass?: string }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("study_materials").select("*").order("created_at", { ascending: false });
      const all = (data as Material[]) || [];
      const filtered = studentClass ? all.filter(m => !m.student_class || m.student_class === "All" || m.student_class === studentClass) : all;
      setMaterials(filtered);
      setLoading(false);
    })();
  }, [studentClass]);

  const visible = materials.filter(m =>
    !search.trim() ||
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.subject || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Study Materials
        </h2>
        <p className="text-sm text-muted-foreground">Resources shared by your teachers.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or subject..." className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          {search ? "No matches." : "No study materials available yet."}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visible.map(m => (
            <Card key={m.id} className="hover-lift">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-1">{m.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.subject}{m.student_class && ` · ${m.student_class === "All" ? "All Classes" : `Class ${m.student_class}`}`}
                  </p>
                  {m.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
                  <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3 mr-1" /> Open</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyMaterials;
