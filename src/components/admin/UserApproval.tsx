import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, Search, KeyRound, MoreHorizontal, Copy, Users as UsersIcon, RotateCcw, Loader2, GraduationCap, Trash2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddUserDialog from "./AddUserDialog";
import BulkImportStudents from "./BulkImportStudents";
import StudentDetailModal from "./StudentDetailModal";

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
  admission_number?: string;
  points?: number;
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
  const [resetTarget, setResetTarget] = useState<PendingUser | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [editingClassTarget, setEditingClassTarget] = useState<PendingUser | null>(null);
  const [newClassVal, setNewClassVal] = useState("");
  const [updatingClass, setUpdatingClass] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<any | null>(null);
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
      // 1. Try direct SQL RPC call first (instant, bypasses Deno network timeouts)
      const { data: count, error: rpcErr } = await supabase.rpc("sync_missing_auth_profiles");
      if (!rpcErr && typeof count === "number") {
        toast({ title: "Profiles Synced!", description: `Successfully synced ${count} auth users into the profiles table.` });
        await loadUsers();
        return;
      }

      // 2. Fall back to Edge Function if RPC fails or is missing
      const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", {
        body: { action: "sync_all_auth_users" }
      });
      if (error) throw error;
      const totalCount = (data as any)?.totalSynced || 0;
      toast({ title: "Profiles Synced!", description: `Successfully synced ${totalCount} auth users into the profiles table.` });
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message || "Failed to sync auth users", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      let allUsers: PendingUser[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allUsers = [...allUsers, ...data];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setUsers(allUsers);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setSelected(new Set());
      setLoading(false);
    }
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

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const openResetDialog = (u: PendingUser) => {
    setGeneratedPassword(generateTempPassword());
    setResetTarget(u);
  };

  const confirmResetPassword = async () => {
    if (!resetTarget || !generatedPassword) return;
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: resetTarget.id, new_password: generatedPassword }
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast({ title: "Password Reset!", description: `Password for ${resetTarget.first_name} has been updated. Copy the password and hand it to the student.` });
    } catch (e: any) {
      toast({ title: "Reset Failed", description: e.message, variant: "destructive" });
      setResetTarget(null);
    } finally {
      setResetting(false);
    }
  };

  const handleSaveClass = async () => {
    if (!editingClassTarget) return;
    setUpdatingClass(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ student_class: newClassVal.trim() || null })
        .eq("id", editingClassTarget.id);
      if (error) throw error;
      toast({ title: "Success", description: "Class updated successfully." });
      setEditingClassTarget(null);
      await loadUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update class", variant: "destructive" });
    } finally {
      setUpdatingClass(false);
    }
  };

  const deleteUser = async (user: PendingUser) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Cannot delete current account", variant: "destructive" });
      return;
    }
    if (!confirm(`Permanently delete ${user.first_name} ${user.last_name}'s account? This cannot be undone.`)) return;
    setDeletingUserId(user.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: user.id } });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
      toast({ title: "User deleted", description: "The profile and login account were removed." });
      await loadUsers();
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message || "Unable to delete user.", variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
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
                          <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => setDetailUser(u)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Details
                          </Button>
                          <Button size="sm" onClick={() => setApproval([u.id], true)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setApproval([u.id], false)}>
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" disabled={deletingUserId === u.id} onClick={() => deleteUser(u)}>
                            <Trash2 className="h-4 w-4 mr-1" />{deletingUserId === u.id ? "Deleting..." : "Delete"}
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
                            <DropdownMenuItem onClick={() => setDetailUser(u)}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openResetDialog(u)}>
                              <KeyRound className="h-4 w-4 mr-2" />Reset password
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(u.email); toast({ title: "Copied", description: u.email }); }}>
                              <Copy className="h-4 w-4 mr-2" />Copy email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingClassTarget(u); setNewClassVal(u.student_class || ""); }}>
                              <GraduationCap className="h-4 w-4 mr-2" />
                              {u.role === "teacher" ? "Edit Class Teacher" : "Edit Class"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setApproval([u.id], false)}>
                              <XCircle className="h-4 w-4 mr-2" />Revoke access
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" disabled={deletingUserId === u.id} onClick={() => deleteUser(u)}>
                              <Trash2 className="h-4 w-4 mr-2" />{deletingUserId === u.id ? "Deleting..." : "Delete user"}
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

      {/* Student / User Detail Modal */}
      <StudentDetailModal user={detailUser} onClose={() => setDetailUser(null)} />

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open && !resetting) setResetTarget(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-orange-500" /> Reset Password</DialogTitle>
            <DialogDescription>
              A new temporary password will be set for <strong>{resetTarget?.first_name} {resetTarget?.last_name}</strong>. Give this password to the student so they can log in and set a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <code className="text-lg font-mono font-bold tracking-widest text-slate-900 select-all">{generatedPassword}</code>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(generatedPassword); toast({ title: "Copied!", description: "Temporary password copied to clipboard." }); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">The student will be able to log in with this password. They should change it after logging in.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>Cancel</Button>
              <Button onClick={confirmResetPassword} disabled={resetting} className="bg-orange-500 hover:bg-orange-600 text-white">
                {resetting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resetting...</> : <><KeyRound className="h-4 w-4 mr-2" />Confirm Reset</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={!!editingClassTarget} onOpenChange={(open) => { if (!open && !updatingClass) setEditingClassTarget(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-500" /> 
              {editingClassTarget?.role === "teacher" ? "Edit Class Teacher Assignment" : "Edit Class Assignment"}
            </DialogTitle>
            <DialogDescription>
              {editingClassTarget?.role === "teacher" 
                ? `Assign a class to Class Teacher ${editingClassTarget?.first_name} ${editingClassTarget?.last_name}. Leave blank if they have no class.`
                : `Update class for student ${editingClassTarget?.first_name} ${editingClassTarget?.last_name}.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Class / Section</label>
              <Input 
                value={newClassVal} 
                onChange={(e) => setNewClassVal(e.target.value)} 
                placeholder="e.g. 8A, 9B, 10, or leave blank"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingClassTarget(null)} disabled={updatingClass}>Cancel</Button>
              <Button onClick={handleSaveClass} disabled={updatingClass} className="gradient-primary border-0 text-white font-bold">
                {updatingClass ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserApproval;
