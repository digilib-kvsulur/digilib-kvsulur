
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Edit, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentProfileProps {
  user: any;
  onProfileUpdate?: () => void;
}

const StudentProfile = ({ user, onProfileUpdate }: StudentProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    student_class: user?.student_class || '',
    roll_number: user?.roll_number || '',
    admission_number: user?.admission_number || '',
    username: user?.username || ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        student_class: user.student_class || '',
        roll_number: user.roll_number || '',
        admission_number: user.admission_number || '',
        username: user.username || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          student_class: formData.student_class,
          roll_number: formData.roll_number,
          admission_number: formData.admission_number,
          username: formData.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setIsEditing(false);
      onProfileUpdate?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      student_class: user?.student_class || '',
      roll_number: user?.roll_number || '',
      admission_number: user?.admission_number || '',
      username: user?.username || ''
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
            <CardDescription>Manage your personal information and login credentials</CardDescription>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={formData.email}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            disabled={!isEditing}
            placeholder="Enter username for login"
          />
          <p className="text-xs text-gray-500 mt-1">You can use username or email to login</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="student_class">Class</Label>
            <Input
              id="student_class"
              value={formData.student_class}
              onChange={(e) => setFormData(prev => ({ ...prev, student_class: e.target.value }))}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="roll_number">Roll Number</Label>
            <Input
              id="roll_number"
              value={formData.roll_number}
              onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="admission_number">Admission Number</Label>
            <Input
              id="admission_number"
              value={formData.admission_number}
              onChange={(e) => setFormData(prev => ({ ...prev, admission_number: e.target.value }))}
              disabled={!isEditing}
              placeholder="Enter admission number"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            disabled={!isEditing}
          />
        </div>

        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Total Points:</span>
              <p className="text-2xl font-bold text-blue-600">{user?.points || 0}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Account Status:</span>
              <p className={`font-medium ${user?.is_approved ? 'text-green-600' : 'text-orange-600'}`}>
                {user?.is_approved ? 'Approved' : 'Pending Approval'}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Member Since:</span>
              <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentProfile;
