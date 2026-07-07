import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AddUserDialog = ({ onCreated }: { onCreated?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", first_name: "", last_name: "",
    role: "student", student_class: "", roll_number: "", admission_number: "", phone: "", username: "",
  });
  const { toast } = useToast();

  const upd = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.password || !form.first_name) {
      toast({ title: "Missing fields", description: "Email, password and first name are required", variant: "destructive" });
      return;
    }
    if (form.role === "student" && !/^\d{5}$/.test(form.admission_number.trim())) {
      toast({ title: "Admission number required", description: "Enter a 5-digit admission number for students.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "User created", description: `${form.first_name} has been added and approved.` });
      setOpen(false);
      setForm({ email: "", password: "", first_name: "", last_name: "", role: "student", student_class: "", roll_number: "", admission_number: "", phone: "", username: "" });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gradient-primary border-0"><UserPlus className="h-4 w-4 mr-2" />Add User</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => upd("first_name", e.target.value)} /></div>
            <div><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => upd("last_name", e.target.value)} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} /></div>
          <div><Label>Password *</Label><Input type="text" value={form.password} onChange={(e) => upd("password", e.target.value)} placeholder="Min 6 chars" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => upd("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} /></div>
          </div>
          {form.role === "student" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Class</Label><Input value={form.student_class} onChange={(e) => upd("student_class", e.target.value)} /></div>
              <div><Label>Roll No.</Label><Input value={form.roll_number} onChange={(e) => upd("roll_number", e.target.value)} /></div>
              <div className="col-span-2"><Label>Admission No. * (5 digits)</Label><Input maxLength={5} pattern="\d{5}" placeholder="e.g. 12345" value={form.admission_number} onChange={(e) => upd("admission_number", e.target.value.replace(/\D/g, "").slice(0, 5))} /></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="gradient-primary border-0">{loading ? "Creating..." : "Create User"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
