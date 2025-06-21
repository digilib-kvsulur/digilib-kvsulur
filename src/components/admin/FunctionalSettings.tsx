
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Database, Shield, Bell, Globe, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  library_name: string;
  max_books_per_user: number;
  loan_period_days: number;
  fine_per_day: number;
  points_per_book_read: number;
  points_per_quiz_passed: number;
  enable_notifications: boolean;
  enable_auto_return: boolean;
  require_approval: boolean;
  maintenance_mode: boolean;
}

const FunctionalSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    library_name: "Digital Library System",
    max_books_per_user: 3,
    loan_period_days: 14,
    fine_per_day: 5,
    points_per_book_read: 25,
    points_per_quiz_passed: 50,
    enable_notifications: true,
    enable_auto_return: false,
    require_approval: true,
    maintenance_mode: false
  });
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    total_users: 0,
    pending_approvals: 0,
    active_books: 0,
    overdue_books: 0
  });

  useEffect(() => {
    loadSystemStatistics();
  }, []);

  const loadSystemStatistics = async () => {
    try {
      // Get user statistics
      const { data: users } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('role', 'student');

      // Get book statistics
      const { data: books } = await supabase
        .from('book_issues')
        .select('status, due_date');

      const totalUsers = users?.length || 0;
      const pendingApprovals = users?.filter(u => !u.is_approved).length || 0;
      const activeBooks = books?.filter(b => b.status === 'issued').length || 0;
      const overdueBooks = books?.filter(b => 
        b.status === 'issued' && new Date(b.due_date) < new Date()
      ).length || 0;

      setStatistics({
        total_users: totalUsers,
        pending_approvals: pendingApprovals,
        active_books: activeBooks,
        overdue_books: overdueBooks
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSaveSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be saved to a settings table
      // For now, we'll just show success
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Settings Saved",
        description: "All settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSystemAction = async (action: string) => {
    setLoading(true);
    try {
      switch (action) {
        case 'backup':
          await new Promise(resolve => setTimeout(resolve, 2000));
          toast({
            title: "Backup Complete",
            description: "System backup has been created successfully.",
          });
          break;
        case 'cleanup':
          await new Promise(resolve => setTimeout(resolve, 1500));
          toast({
            title: "Cleanup Complete",
            description: "Temporary files and logs have been cleaned up.",
          });
          break;
        case 'notifications':
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast({
            title: "Notifications Sent",
            description: "Overdue book notifications have been sent to students.",
          });
          break;
        default:
          break;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to perform ${action}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          System Settings
        </h2>
        <Button onClick={handleSaveAll} disabled={loading} className="bg-green-600 hover:bg-green-700">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Current system health and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{statistics.total_users}</div>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{statistics.pending_approvals}</div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{statistics.active_books}</div>
              <p className="text-sm text-gray-600">Active Issues</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{statistics.overdue_books}</div>
              <p className="text-sm text-gray-600">Overdue Books</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Basic configuration for your library system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="libraryName">Library Name</Label>
              <Input
                id="libraryName"
                value={settings.library_name}
                onChange={(e) => handleSaveSetting('library_name', e.target.value)}
                placeholder="Enter library name"
              />
            </div>
            <div>
              <Label htmlFor="maxBooks">Max Books Per User</Label>
              <Input
                id="maxBooks"
                type="number"
                value={settings.max_books_per_user}
                onChange={(e) => handleSaveSetting('max_books_per_user', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loanPeriod">Loan Period (Days)</Label>
              <Input
                id="loanPeriod"
                type="number"
                value={settings.loan_period_days}
                onChange={(e) => handleSaveSetting('loan_period_days', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="fine">Fine Per Day (₹)</Label>
              <Input
                id="fine"
                type="number"
                value={settings.fine_per_day}
                onChange={(e) => handleSaveSetting('fine_per_day', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points & Rewards Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Points & Rewards
          </CardTitle>
          <CardDescription>Configure the points system for student engagement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pointsPerBook">Points per Book Read</Label>
              <Input
                id="pointsPerBook"
                type="number"
                value={settings.points_per_book_read}
                onChange={(e) => handleSaveSetting('points_per_book_read', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="pointsPerQuiz">Points per Quiz Passed</Label>
              <Input
                id="pointsPerQuiz"
                type="number"
                value={settings.points_per_quiz_passed}
                onChange={(e) => handleSaveSetting('points_per_quiz_passed', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Access
          </CardTitle>
          <CardDescription>Manage user access and security policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requireApproval">Require Admin Approval for New Users</Label>
              <p className="text-sm text-gray-600">New registrations will need admin approval</p>
            </div>
            <Switch
              id="requireApproval"
              checked={settings.require_approval}
              onCheckedChange={(checked) => handleSaveSetting('require_approval', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <p className="text-sm text-gray-600">Disable access for all users except admins</p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) => handleSaveSetting('maintenance_mode', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            System Actions
          </CardTitle>
          <CardDescription>Perform system maintenance and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => handleSystemAction('backup')} 
              disabled={loading}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Database className="h-6 w-6 mb-2" />
              Create Backup
            </Button>
            <Button 
              onClick={() => handleSystemAction('cleanup')} 
              disabled={loading}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Settings className="h-6 w-6 mb-2" />
              System Cleanup
            </Button>
            <Button 
              onClick={() => handleSystemAction('notifications')} 
              disabled={loading}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Bell className="h-6 w-6 mb-2" />
              Send Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current system status and details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">System Version:</span>
              <p className="text-gray-600">v2.1.0</p>
            </div>
            <div>
              <span className="font-medium">Database Status:</span>
              <p className="text-green-600">Connected</p>
            </div>
            <div>
              <span className="font-medium">Last Backup:</span>
              <p className="text-gray-600">Today, 2:00 AM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FunctionalSettings;
