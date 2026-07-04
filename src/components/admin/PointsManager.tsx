import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Award, Plus, CheckSquare, Square } from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  student_class?: string;
  points: number;
}

const PointsManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pointsToAward, setPointsToAward] = useState("");
  const [reason, setReason] = useState("");
  
  // Selection state for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkPoints, setBulkPoints] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkAwarding, setBulkAwarding] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, student_class, points')
        .eq('role', 'student')
        .eq('is_approved', true)
        .order('first_name');

      if (error) {
        console.error('Error loading users:', error);
        toast({ title: "Error", description: "Failed to load students.", variant: "destructive" });
        return;
      }

      setUsers(data || []);
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedUserId) {
      toast({ title: "Error", description: "Please select a student.", variant: "destructive" });
      return;
    }

    const points = parseInt(pointsToAward);
    if (!points || points <= 0) {
      toast({ title: "Error", description: "Please enter a valid number of points.", variant: "destructive" });
      return;
    }

    if (!reason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for awarding points.", variant: "destructive" });
      return;
    }

    try {
      setAwarding(true);

      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', selectedUserId)
        .single();

      if (fetchError) throw fetchError;

      const newPoints = (currentUser.points || 0) + points;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', selectedUserId);

      if (updateError) throw updateError;

      toast({ title: "Success", description: `Successfully awarded ${points} points!` });
      setSelectedUserId(""); setPointsToAward(""); setReason("");
      loadUsers();
    } catch (error) {
      console.error('Error awarding points:', error);
      toast({ title: "Error", description: "Failed to award points.", variant: "destructive" });
    } finally {
      setAwarding(false);
    }
  };

  const handleBulkAwardPoints = async () => {
    if (selectedUserIds.size === 0) return;
    const points = parseInt(bulkPoints);
    if (!points || points <= 0) {
      toast({ title: "Error", description: "Please enter valid bulk points.", variant: "destructive" });
      return;
    }
    if (!bulkReason) {
      toast({ title: "Error", description: "Please select a reason.", variant: "destructive" });
      return;
    }

    setBulkAwarding(true);
    try {
      const promises = Array.from(selectedUserIds).map(async (uid) => {
        const student = users.find(u => u.id === uid);
        if (!student) return;
        const newPoints = (student.points || 0) + points;
        return supabase.from('profiles').update({ points: newPoints }).eq('id', uid);
      });

      await Promise.all(promises);
      toast({ title: "Bulk Points Awarded", description: `Successfully awarded +${points} points to ${selectedUserIds.size} students.` });
      setBulkPoints(""); setBulkReason("");
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed", description: "Failed to award bulk points.", variant: "destructive" });
    } finally {
      setBulkAwarding(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUserIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(users.map(u => u.id)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Award Card if any selected */}
      {selectedUserIds.size > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" /> Bulk Action: Award Points ({selectedUserIds.size} Selected)</CardTitle>
            <CardDescription>Award points to all checked students at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="bulk-points">Points to Award</Label>
                <Input id="bulk-points" type="number" min={1} value={bulkPoints} onChange={e => setBulkPoints(e.target.value)} placeholder="e.g. 50" />
              </div>
              <div className="space-y-1">
                <Label>Reason</Label>
                <Select value={bulkReason} onValueChange={setBulkReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent_reading">Excellent Reading</SelectItem>
                    <SelectItem value="quiz_performance">Quiz Performance</SelectItem>
                    <SelectItem value="participation">Class Participation</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="helping_others">Helping Others</SelectItem>
                    <SelectItem value="extra_effort">Extra Effort</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedUserIds(new Set())}>Clear Selection</Button>
              <Button size="sm" disabled={bulkAwarding} onClick={handleBulkAwardPoints}>
                {bulkAwarding ? "Awarding..." : `Award to ${selectedUserIds.size} Students`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Award Points Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Award Points to Student
          </CardTitle>
          <CardDescription>
            Award points to students for achievements and good behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student">Select Student</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} 
                      {user.student_class && ` (${user.student_class})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points to Award</Label>
              <Input
                id="points"
                type="number"
                value={pointsToAward}
                onChange={(e) => setPointsToAward(e.target.value)}
                placeholder="Enter points"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent_reading">Excellent Reading</SelectItem>
                  <SelectItem value="quiz_performance">Quiz Performance</SelectItem>
                  <SelectItem value="participation">Class Participation</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="helping_others">Helping Others</SelectItem>
                  <SelectItem value="extra_effort">Extra Effort</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button 
              onClick={handleAwardPoints} 
              disabled={awarding}
              className="w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              {awarding ? "Awarding..." : "Award Points"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Student Points Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Student Points Overview</CardTitle>
          <CardDescription>
            Current points for all students (Select students to use bulk actions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No students found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedUserIds.size === users.length && users.length > 0} 
                      onChange={toggleSelectAll} 
                    />
                  </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Current Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .sort((a, b) => (b.points || 0) - (a.points || 0))
                  .map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedUserIds.has(user.id)} 
                          onChange={() => toggleSelectUser(user.id)} 
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.student_class || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.points || 0} points
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PointsManager;