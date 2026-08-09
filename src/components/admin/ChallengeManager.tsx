import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, Play, Pause, Target, TrendingUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  target_value: number;
  reward_points: number;
  deadline?: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface ChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at?: string;
  points_earned: number;
  challenges?: {
    title: string;
    target_value: number;
    reward_points: number;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    admission_number: string;
    student_class: string;
  };
}

const ChallengeManager = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    target_value: 0,
    reward_points: 0,
    deadline: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadChallenges();
    loadChallengeProgress();
  }, []);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChallengeProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('challenge_progress')
        .select(`
          *,
          challenges (title, target_value, reward_points),
          profiles:user_id (first_name, last_name, admission_number, student_class)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const progressWithProfiles = (data || []).map((progress: any) => ({
        ...progress,
        profiles: progress.profiles ? {
          first_name: progress.profiles.first_name || '',
          last_name: progress.profiles.last_name || '',
          admission_number: progress.profiles.admission_number || '',
          student_class: progress.profiles.student_class || ''
        } : undefined
      }));

      setChallengeProgress(progressWithProfiles);
    } catch (error) {
      console.error('Error loading challenge progress:', error);
      toast({
        title: "Error",
        description: "Failed to load challenge progress",
        variant: "destructive",
      });
    } finally {
      setProgressLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const insertData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        target_value: formData.target_value,
        reward_points: formData.reward_points,
        created_by: user.id,
        is_active: true
      };
      if (formData.deadline) insertData.deadline = formData.deadline;

      const { error } = await supabase
        .from('challenges')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Challenge created successfully",
      });

      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        type: '',
        target_value: 0,
        reward_points: 0,
        deadline: ''
      });
      loadChallenges();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Error",
        description: "Failed to create challenge",
        variant: "destructive",
      });
    }
  };

  const handleEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      target_value: challenge.target_value,
      reward_points: challenge.reward_points,
      deadline: challenge.deadline || ''
    });
    setShowCreateForm(true);
  };

  const handleUpdateChallenge = async () => {
    if (!editingChallenge) return;

    try {
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        target_value: formData.target_value,
        reward_points: formData.reward_points,
      };
      if (formData.deadline) updateData.deadline = formData.deadline;
      else updateData.deadline = null;

      const { error } = await supabase
        .from('challenges')
        .update(updateData)
        .eq('id', editingChallenge.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Challenge updated successfully",
      });

      setShowCreateForm(false);
      setEditingChallenge(null);
      setFormData({
        title: '',
        description: '',
        type: '',
        target_value: 0,
        reward_points: 0,
        deadline: ''
      });
      loadChallenges();
    } catch (error) {
      console.error('Error updating challenge:', error);
      toast({
        title: "Error",
        description: "Failed to update challenge",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Challenge deleted successfully",
      });

      loadChallenges();
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast({
        title: "Error",
        description: "Failed to delete challenge",
        variant: "destructive",
      });
    }
  };

  const handleToggleChallengeStatus = async (challengeId: string) => {
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) return;

      const { error } = await supabase
        .from('challenges')
        .update({ is_active: !challenge.is_active })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Challenge ${!challenge.is_active ? 'activated' : 'deactivated'}`,
      });

      loadChallenges();
    } catch (error) {
      console.error('Error toggling challenge status:', error);
      toast({
        title: "Error",
        description: "Failed to update challenge status",
        variant: "destructive",
      });
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Challenge Management</h2>
        <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Challenge
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Challenge Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter challenge title"
                />
              </div>
              <div>
                <Label htmlFor="type">Challenge Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select challenge type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="books_read">Books Read</SelectItem>
                    <SelectItem value="quizzes_completed">Quizzes Completed</SelectItem>
                    <SelectItem value="points_earned">Points Earned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter challenge description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="target_value">Target Value</Label>
                <Input
                  id="target_value"
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="reward_points">Reward Points</Label>
                <Input
                  id="reward_points"
                  type="number"
                  value={formData.reward_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, reward_points: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={editingChallenge ? handleUpdateChallenge : handleCreateChallenge}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingChallenge(null);
                  setFormData({
                    title: '',
                    description: '',
                    type: '',
                    target_value: 0,
                    reward_points: 0,
                    deadline: ''
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="challenges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges">
          <div className="grid gap-6">
            {challenges.map((challenge) => (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {challenge.title}
                        <Badge variant={challenge.is_active ? "default" : "secondary"}>
                          {challenge.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">
                          {challenge.type.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{challenge.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleChallengeStatus(challenge.id)}
                      >
                        {challenge.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditChallenge(challenge)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteChallenge(challenge.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Target:</span> {challenge.target_value}
                    </div>
                    <div>
                      <span className="font-medium">Reward:</span> {challenge.reward_points} points
                    </div>
                    <div>
                      <span className="font-medium">Deadline:</span> {challenge.deadline ? new Date(challenge.deadline).toLocaleDateString() : 'No deadline'}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {new Date(challenge.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {challenges.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges created yet</h3>
                  <p className="text-gray-600 mb-4">Create your first challenge to motivate students.</p>
                  <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Challenge
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Challenge Progress
              </CardTitle>
              <CardDescription>View student progress on all challenges</CardDescription>
            </CardHeader>
            <CardContent>
              {progressLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Challenge</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Points Earned</TableHead>
                      <TableHead>Completed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challengeProgress.map((progress) => (
                      <TableRow key={progress.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {progress.profiles?.first_name || 'Unknown'} {progress.profiles?.last_name || 'User'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {progress.profiles?.admission_number || 'N/A'} - {progress.profiles?.student_class || 'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{progress.challenges?.title || 'Unknown Challenge'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{progress.current_progress} / {progress.challenges?.target_value || 0}</span>
                              <span>{Math.round((progress.current_progress / (progress.challenges?.target_value || 1)) * 100)}%</span>
                            </div>
                            <Progress 
                              value={(progress.current_progress / (progress.challenges?.target_value || 1)) * 100} 
                              className="h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={progress.is_completed ? 'default' : 'secondary'}
                            className={progress.is_completed ? 'bg-green-100 text-green-800' : ''}
                          >
                            {progress.is_completed ? 'Completed' : 'In Progress'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            {progress.points_earned}
                          </div>
                        </TableCell>
                        <TableCell>
                          {progress.completed_at ? new Date(progress.completed_at).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {challengeProgress.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No challenge progress found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChallengeManager;
