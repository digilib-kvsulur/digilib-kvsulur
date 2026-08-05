import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookmarkCheck, Check, X } from "lucide-react";

export default function ReservationManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");

  const load = async () => {
    const { data } = await supabase.from("book_reservations").select("*").order("created_at", { ascending: true });
    const list = data || [];
    const bookIds = Array.from(new Set(list.map((r: any) => r.book_id)));
    const userIds = Array.from(new Set(list.map((r: any) => r.user_id)));
    let books: Record<string, any> = {};
    let profiles: Record<string, any> = {};
    if (bookIds.length) {
      const { data: b } = await supabase.from("books").select("id, title, author, available_copies").in("id", bookIds);
      (b || []).forEach((x) => { books[x.id] = x; });
    }
    if (userIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, first_name, last_name, student_class").in("id", userIds);
      (p || []).forEach((x) => { profiles[x.id] = x; });
    }
    setRows(list.map((r: any) => ({ ...r, book: books[r.book_id], profile: profiles[r.user_id] })));
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "fulfilled") patch.fulfilled_at = new Date().toISOString();
    const { error } = await supabase.from("book_reservations").update(patch).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated" }); load(); }
  };

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><BookmarkCheck className="h-6 w-6" /> Reservations</h2>
          <p className="text-sm text-muted-foreground">Waitlist queue per book.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No reservations.</p>}
      <div className="space-y-2">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-sm">{r.book?.title || "Book"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.profile?.first_name} {r.profile?.last_name}
                  {r.profile?.student_class ? ` · ${r.profile.student_class}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Reserved {new Date(r.created_at).toLocaleDateString()}
                  {r.book?.available_copies != null ? ` · ${r.book.available_copies} available` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge>
                {r.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => update(r.id, "fulfilled")}><Check className="h-3.5 w-3.5 mr-1" /> Fulfill</Button>
                    <Button size="sm" variant="outline" onClick={() => update(r.id, "cancelled")}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
