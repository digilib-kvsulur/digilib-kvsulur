import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";

export default function Periodicals() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: pubs } = await supabase.from("periodicals").select("*").eq("is_active", true).order("title");
      const list = pubs || [];
      const withIssues = await Promise.all(list.map(async (p) => {
        const { data: issues } = await supabase
          .from("periodical_issues")
          .select("*")
          .eq("periodical_id", p.id)
          .order("issue_date", { ascending: false })
          .limit(1);
        return { ...p, latest: issues?.[0] || null };
      }));
      setItems(withIssues);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Newspaper className="h-5 w-5" /> Newspapers & Magazines</h2>
        <p className="text-sm text-muted-foreground">Browse current periodicals on the library shelf.</p>
      </div>
      {items.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No periodicals listed yet.</CardContent></Card>}
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="font-semibold text-sm">{p.title}</p>
                <Badge variant="secondary" className="capitalize">{p.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.publisher || "—"} · {p.frequency || "—"}</p>
              {p.latest ? (
                <p className="text-xs">
                  Latest: {p.latest.issue_date}
                  {p.latest.issue_number ? ` (#${p.latest.issue_number})` : ""}
                  {p.latest.on_shelf ? " · On shelf" : " · Not on shelf"}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No issues logged</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
