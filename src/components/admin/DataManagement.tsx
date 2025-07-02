import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, AlertTriangle, Shield, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DataManagement = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string>('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const clearAllPoints = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ points: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all profiles

      if (error) throw error;

      toast({
        title: "Success",
        description: "All user points have been cleared",
      });
    } catch (error) {
      console.error('Error clearing points:', error);
      toast({
        title: "Error",
        description: "Failed to clear points",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearQuizHistory = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all quiz results

      if (error) throw error;

      toast({
        title: "Success",
        description: "All quiz history has been cleared",
      });
    } catch (error) {
      console.error('Error clearing quiz history:', error);
      toast({
        title: "Error",
        description: "Failed to clear quiz history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChallengeHistory = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('challenge_progress')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all challenge progress

      if (error) throw error;

      toast({
        title: "Success",
        description: "All challenge history has been cleared",
      });
    } catch (error) {
      console.error('Error clearing challenge history:', error);
      toast({
        title: "Error",
        description: "Failed to clear challenge history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearBookRequestHistory = async () => {
    try {
      setLoading(true);
      // Only clear processed requests, keep pending ones
      const { error } = await supabase
        .from('book_requests')
        .delete()
        .in('status', ['approved', 'rejected']);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Processed book request history has been cleared",
      });
    } catch (error) {
      console.error('Error clearing book request history:', error);
      toast({
        title: "Error",
        description: "Failed to clear book request history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearReadingHistory = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('reading_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all reading history

      if (error) throw error;

      toast({
        title: "Success",
        description: "All reading history has been cleared",
      });
    } catch (error) {
      console.error('Error clearing reading history:', error);
      toast({
        title: "Error",
        description: "Failed to clear reading history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAction = (action: string) => {
    setConfirmAction(action);
    setConfirmText('');
    setShowConfirmDialog(true);
  };

  const executeClearAction = async () => {
    if (confirmText !== 'CLEAR ALL DATA') {
      toast({
        title: "Error",
        description: "Please type 'CLEAR ALL DATA' to confirm",
        variant: "destructive",
      });
      return;
    }

    switch (confirmAction) {
      case 'points':
        await clearAllPoints();
        break;
      case 'quiz':
        await clearQuizHistory();
        break;
      case 'challenge':
        await clearChallengeHistory();
        break;
      case 'requests':
        await clearBookRequestHistory();
        break;
      case 'reading':
        await clearReadingHistory();
        break;
      default:
        break;
    }

    setShowConfirmDialog(false);
    setConfirmAction('');
    setConfirmText('');
  };

  const actionLabels = {
    points: 'Clear All Points',
    quiz: 'Clear Quiz History',
    challenge: 'Clear Challenge History', 
    requests: 'Clear Book Request History',
    reading: 'Clear Reading History'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Data Management</h2>
      </div>

      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Warning:</strong> These actions are irreversible and will permanently delete data from the system. 
          Only administrators should have access to these functions.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              User Points
            </CardTitle>
            <CardDescription>
              Reset all user points to zero across the entire system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => handleClearAction('points')}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Points
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              Quiz History
            </CardTitle>
            <CardDescription>
              Delete all quiz results and attempts from all users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => handleClearAction('quiz')}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Quiz History
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              Challenge History
            </CardTitle>
            <CardDescription>
              Remove all challenge progress and completion records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => handleClearAction('challenge')}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Challenge History
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              Book Requests
            </CardTitle>
            <CardDescription>
              Clear processed book request history (keeps pending requests).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => handleClearAction('requests')}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Request History
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Database className="h-5 w-5" />
              Reading History
            </CardTitle>
            <CardDescription>
              Delete all reading history entries from all users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => handleClearAction('reading')}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Reading History
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Dangerous Action
            </DialogTitle>
            <DialogDescription>
              You are about to {actionLabels[confirmAction as keyof typeof actionLabels]?.toLowerCase()}. 
              This action is <strong>irreversible</strong> and will permanently delete data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                To confirm this action, please type <strong>"CLEAR ALL DATA"</strong> in the field below.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="confirm">Type "CLEAR ALL DATA" to confirm:</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CLEAR ALL DATA"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeClearAction}
              disabled={loading || confirmText !== 'CLEAR ALL DATA'}
            >
              {loading ? 'Processing...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagement;
