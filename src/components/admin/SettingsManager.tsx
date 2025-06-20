
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Database, Shield, Bell, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SettingsManager = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    libraryName: "Digital Library System",
    maxBooksPerUser: 3,
    loanPeriodDays: 14,
    finePerDay: 5,
    enableNotifications: true,
    enableAutoReturn: false,
    requireApproval: true,
    pointsPerBookRead: 25,
    pointsPerQuizPassed: 50,
    maintenanceMode: false
  });

  const handleSaveSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Setting Updated",
      description: `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} has been updated.`,
    });
  };

  const handleSaveAll = () => {
    // In a real implementation, this would save to the database
    toast({
      title: "Settings Saved",
      description: "All settings have been saved successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings Management
        </h2>
        <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700">
          <Save className="h-4 w-4 mr-2" />
          Save All Settings
        </Button>
      </div>

      <div className="grid gap-6">
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
                  value={settings.libraryName}
                  onChange={(e) => handleSaveSetting('libraryName', e.target.value)}
                  placeholder="Enter library name"
                />
              </div>
              <div>
                <Label htmlFor="maxBooks">Max Books Per User</Label>
                <Input
                  id="maxBooks"
                  type="number"
                  value={settings.maxBooksPerUser}
                  onChange={(e) => handleSaveSetting('maxBooksPerUser', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loanPeriod">Loan Period (Days)</Label>
                <Input
                  id="loanPeriod"
                  type="number"
                  value={settings.loanPeriodDays}
                  onChange={(e) => handleSaveSetting('loanPeriodDays', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="fine">Fine Per Day (₹)</Label>
                <Input
                  id="fine"
                  type="number"
                  value={settings.finePerDay}
                  onChange={(e) => handleSaveSetting('finePerDay', parseInt(e.target.value))}
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
                  value={settings.pointsPerBookRead}
                  onChange={(e) => handleSaveSetting('pointsPerBookRead', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="pointsPerQuiz">Points per Quiz Passed</Label>
                <Input
                  id="pointsPerQuiz"
                  type="number"
                  value={settings.pointsPerQuizPassed}
                  onChange={(e) => handleSaveSetting('pointsPerQuizPassed', parseInt(e.target.value))}
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
                checked={settings.requireApproval}
                onCheckedChange={(checked) => handleSaveSetting('requireApproval', checked)}
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
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSaveSetting('maintenanceMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications & Automation
            </CardTitle>
            <CardDescription>Configure automatic notifications and processes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableNotifications">Enable Email Notifications</Label>
                <p className="text-sm text-gray-600">Send reminders for due dates and overdue books</p>
              </div>
              <Switch
                id="enableNotifications"
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => handleSaveSetting('enableNotifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoReturn">Auto-Return Overdue Books</Label>
                <p className="text-sm text-gray-600">Automatically mark books as returned after 30 days overdue</p>
              </div>
              <Switch
                id="autoReturn"
                checked={settings.enableAutoReturn}
                onCheckedChange={(checked) => handleSaveSetting('enableAutoReturn', checked)}
              />
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
    </div>
  );
};

export default SettingsManager;
