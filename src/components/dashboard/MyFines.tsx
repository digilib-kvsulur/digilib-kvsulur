import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IndianRupee } from "lucide-react";
import { buildUpiPaymentLink } from "@/lib/librarySettings";

interface MyFinesProps { userId: string }

export default function MyFines({ userId }: MyFinesProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [upi, setUpi] = useState({ upi_id: "", upi_payee_name: "KV Library" });

  const load = async () => {
    const [{ data }, { data: fs }] = await Promise.all([
      supabase.from("library_fines").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("fine_settings").select("upi_id, upi_payee_name").eq("id", 1).maybeSingle(),
    ]);
    setRows(data || []);
    if (fs) setUpi({ upi_id: fs.upi_id || "", upi_payee_name: fs.upi_payee_name || "KV Library" });
  };

  useEffect(() => { if (userId) load(); }, [userId]);

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("library_fines").update({
      payment_method: "upi",
      payment_ref: "pending_confirmation",
    }).eq("id", id).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Marked as paid", description: "Waiting for librarian confirmation." }); load(); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><IndianRupee className="h-5 w-5" /> My Fines</h2>
        <p className="text-sm text-muted-foreground">Overdue fines and payment status.</p>
      </div>
      {rows.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No fines on your account.</CardContent></Card>
      )}
      <div className="space-y-2">
        {rows.map((r) => {
          const link = r.status === "pending"
            ? buildUpiPaymentLink({
                upiId: upi.upi_id,
                payeeName: upi.upi_payee_name,
                amount: Number(r.total_amount),
                note: `Fine: ${r.book_title || "Library"}`,
              })
            : null;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{r.book_title || "Library fine"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.days_overdue} days overdue · ₹{r.total_amount}
                    </p>
                  </div>
                  <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status}</Badge>
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    {link && (
                      <Button size="sm" asChild>
                        <a href={link}>Pay via UPI / GPay</a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => markPaid(r.id)}
                      disabled={r.payment_ref === "pending_confirmation"}>
                      {r.payment_ref === "pending_confirmation" ? "Awaiting confirmation" : "I've paid"}
                    </Button>
                  </div>
                )}
                {r.status === "paid" && (
                  <p className="text-xs text-success">Paid{r.paid_at ? ` on ${new Date(r.paid_at).toLocaleDateString()}` : ""}.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
