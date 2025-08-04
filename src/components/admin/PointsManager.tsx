import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PointsEntry {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  awarded_by: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    admission_number: string;
  };
}

const PointsManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("");
  const [pointsToAward, setPointsToAward] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load approved users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, admission_number, points')
        .eq('is_approved', true)
        .eq('role', 'student')
        .order('first_name');

      if (usersError) throw usersError;

      // Load points history (we'll create this table)
      const { data: historyData, error: historyError } = await supabase
        .from('points_history')
        .select(`
          *,
          profiles (first_name, last_name, admission_number)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // If the table doesn't exist yet, we'll handle the error gracefully
      if (historyError && !historyError.message.includes('does not exist')) {
        throw historyError;
      }

      setUsers(usersData || []);
      setPointsHistory(historyData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load points data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedUser || !pointsToAward || !reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const points = parseInt(pointsToAward);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Invalid Points",
        description: "Please enter a valid positive number of points",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user (admin)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      // Update user points
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          points: users.find(u => u.id === selectedUser)?.points + points 
        })
        .eq('id', selectedUser);

      if (updateError) throw updateError;

      // Record points history
      const { error: historyError } = await supabase
        .from('points_history')
        .insert({
          user_id: selectedUser,
          points: points,
          reason: reason,
          awarded_by: user?.id
        });

      // If the points_history table doesn't exist, we'll create it via migration
      if (historyError && historyError.message.includes('does not exist')) {
        console.log('Points history table does not exist - points awarded but not logged');
      } else if (historyError) {
        throw historyError;
      }

      toast({
        title: "Success",
        description: `${points} points awarded successfully`,
      });

      // Reset form and reload data
      setSelectedUser("");
      setPointsToAward("");
      setReason("");
      loadData();
    } catch (error) {
      console.error('Error awarding points:', error);
      toast({
        title: "Error",
        description: "Failed to award points",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Award Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Award Points to Student
          </CardTitle>
          <CardDescription>Give extra points for discipline, work submission, or achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select Student</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.admission_number}) - {user.points} pts
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
                min="1"
                value={pointsToAward}
                onChange={(e) => setPointsToAward(e.target.value)}
                placeholder="Enter points"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discipline">Good Discipline</SelectItem>
                  <SelectItem value="assignment">Assignment Submission</SelectItem>
                  <SelectItem value="participation">Class Participation</SelectItem>
                  <SelectItem value="leadership">Leadership</SelectItem>
                  <SelectItem value="helping">Helping Others</SelectItem>
                  <SelectItem value="improvement">Academic Improvement</SelectItem>
                  <SelectItem value="other">Other Achievement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleAwardPoints} 
                disabled={isSubmitting}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isSubmitting ? "Awarding..." : "Award Points"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Points Awards
          </CardTitle>
          <CardDescription>History of manually awarded points</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pointsHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {entry.profiles?.first_name} {entry.profiles?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{entry.profiles?.admission_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      +{entry.points} pts
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {pointsHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                    No points history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PointsManager;