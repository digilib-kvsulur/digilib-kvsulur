
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Play, Pause, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  target_value: number;
  reward_points: number;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
}

const ChallengeManager = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "books_read",
    target_value: 1,
    reward_points: 50,
    deadline: "",
    is_active: true
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading challenges:', error);
        toast({
          title: "Error",
          description: "Failed to load challenges",
          variant: "destructive",
        });
        return;
      }

      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = () => {
    setEditingChallenge(null);
    setFormData({
      title: "",
      description: "",
      type: "books_read",
      target_value: 1,
      reward_points: 50,
      deadline: "",
      is_active: true
    });
    setShowForm(true);
  };

  const handleEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      type: challenge.type,
      target_value: challenge.target_value,
      reward_points: challenge.reward_points,
      deadline: challenge.deadline || "",
      is_active: challenge.is_active
    });
    setShowForm(true);
  };

  const handleSaveChallenge = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const challengeData = {
        ...formData,
        deadline: formData.deadline || null,
        created_by: user.id
      };

      if (editingChallenge) {
        const { error } = await supabase
          .from('challenges')
          .update(challengeData)
          .eq('id', editingChallenge.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Challenge updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('challenges')
          .insert(challengeData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Challenge created successfully",
        });
      }

      setShowForm(false);
      setEditingChallenge(null);
      loadChallenges();
    } catch (error) {
      console.error('Error saving challenge:', error);
      toast({
        title: "Error",
        description: "Failed to save challenge",
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

  const handleToggleStatus = async (challengeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .update({ is_active: !currentStatus })
        .eq('id', challengeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Challenge ${!currentStatus ? 'activated' : 'deactivated'}`,
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

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setShowForm(false)}>
            ← Back to Challenges
          </Button>
          <h2 className="text-2xl font-bold">
            {editingChallenge ? "Edit Challenge" : "Create New Challenge"}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Challenge Information</CardTitle>
            <CardDescription>Define the challenge details and requirements</CardDescription>
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
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="books_read">Books Read</SelectItem>
                    <SelectItem value="quiz_completed">Quizzes Completed</SelectItem>
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
                placeholder="Describe the challenge requirements"
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

            <div className="flex justify-end">
              <Button onClick={handleSaveChallenge}>
                {editingChallenge ? "Update Challenge" : "Create Challenge"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          Challenge Management
        </h2>
        <Button onClick={handleCreateChallenge} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Challenge
        </Button>
      </div>

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
                    onClick={() => handleToggleStatus(challenge.id, challenge.is_active)}
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
                  <span className="font-medium">Deadline:</span> {challenge.deadline || 'No deadline'}
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
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges created yet</h3>
              <p className="text-gray-600 mb-4">Create your first challenge to engage students.</p>
              <Button onClick={handleCreateChallenge} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Challenge
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChallengeManager;
