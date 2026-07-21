import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Search, KeyRound, MoreHorizontal, Copy, Users as UsersIcon, RotateCcw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddUserDialog from "./AddUserDialog";
import BulkImportStudents from "./BulkImportStudents";

interface PendingUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  student_class?: string;
  roll_number?: string;
  username?: string;
  phone?: string;
  created_at: string;
  is_approved: boolean;
  approved_at?: string;
}

const UserApproval = () => {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    await loadUsers();
  };

  const syncAllProfiles = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", {
        body: { action: "sync_all_auth_users" }
      });
      if (error) throw error;
      const count = (data as any)?.totalSynced || 0;
      toast({ title: "Profiles Synced!", description: `Successfully synced ${count} auth users into the profiles table.` });
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message || "Failed to sync auth users", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } else {
      setUsers(data || []);
    }
    setSelected(new Set());
    setLoading(false);
  };

  const setApproval = async (ids: string[], approve: boolean) => {
    if (!currentUser || ids.length === 0) return;
    const update = approve
      ? { is_approved: true, approved_by: currentUser.id, approved_at: new Date().toISOString() }
      : { is_approved: false, approved_by: null, approved_at: null };
    const { error } = await supabase.from("profiles").update(update).in("id", ids);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Success", description: `${ids.length} user${ids.length === 1 ? "" : "s"} ${approve ? "approved" : "revoked"}.` });
    loadUsers();
  };

  const resetPassword = async (u: PendingUser) => {
    const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { user_id: u.id } });
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    const pwd = (data as any).password;
    await navigator.clipboard.writeText(pwd).catch(() => {});
    toast({
      title: "Password reset",
      description: `New password for ${u.email}: ${pwd} (copied to clipboard)`,
    });
  };

  const classes = useMemo(() => {
    const s = new Set<string>();
    users.forEach(u => u.student_class && s.add(u.student_class));
    return Array.from(s).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (classFilter !== "all" && u.student_class !== classFilter) return false;
      if (!q) return true;
      return (
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.roll_number?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      );
    });
  }, [users, search, roleFilter, classFilter]);

  const pending = filtered.filter(u => !u.is_approved);
  const approved = filtered.filter(u => u.is_approved);

  const toggleSelect = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAllPending = () => {
    if (pending.every(u => selected.has(u.id))) setSelected(new Set());
    else setSelected(new Set(pending.map(u => u.id)));
  };

  if (loading) {
    return (
      <Card><CardContent className="pt-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading users...</p>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="h-6 w-6 text-primary" />User Management</h2>
          <p className="text-sm text-muted-foreground">{users.length} total · {users.filter(u => !u.is_approved).length} pending</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={syncAllProfiles} disabled={syncing} className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
            <RotateCcw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Auth Users"}
          </Button>
          <BulkImportStudents onImported={loadUsers} />
          <AddUserDialog onCreated={loadUsers} />
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, username, roll, phone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-orange-500" />Pending Approval ({pending.length})</CardTitle>
              <CardDescription>Users awaiting approval to access the system</CardDescription>
            </div>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <Badge variant="secondary" className="self-center">{selected.size} selected</Badge>
                <Button size="sm" onClick={() => setApproval(Array.from(selected), true)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" />Approve selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No pending users</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input type="checkbox" checked={pending.length > 0 && pending.every(u => selected.has(u.id))} onChange={toggleAllPending} />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Class / Roll</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map(u => (
                    <TableRow key={u.id}>
                      <TableCell><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} /></TableCell>
                      <TableCell>
                        <div className="font-medium">{u.first_name} {u.last_name}</div>
                        {u.username && <div className="text-xs text-muted-foreground">@{u.username}</div>}
                      </TableCell>
                      <TableCell>
                        <div>{u.email}</div>
                        {u.phone && <div className="text-xs text-muted-foreground">{u.phone}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell>
                        {u.student_class ? <span>Class {u.student_class}{u.roll_number ? ` · #${u.roll_number}` : ""}</span> : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setApproval([u.id], true)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setApproval([u.id], false)}>
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Approved Users ({approved.length})</CardTitle>
          <CardDescription>Active users with system access</CardDescription>
        </CardHeader>
        <CardContent>
          {approved.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No approved users</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Class / Roll</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approved.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.first_name} {u.last_name}</div>
                        {u.username && <div className="text-xs text-muted-foreground">@{u.username}</div>}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell>{u.student_class ? `Class ${u.student_class}${u.roll_number ? ` · #${u.roll_number}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-xs">{u.approved_at && new Date(u.approved_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resetPassword(u)}>
                              <KeyRound className="h-4 w-4 mr-2" />Reset password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(u.email); toast({ title: "Copied", description: u.email }); }}>
                              <Copy className="h-4 w-4 mr-2" />Copy email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setApproval([u.id], false)}>
                              <XCircle className="h-4 w-4 mr-2" />Revoke access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserApproval;
