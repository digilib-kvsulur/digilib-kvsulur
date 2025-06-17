
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    studentClass: "",
    rollNumber: "",
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.role === "student" && (!formData.studentClass || !formData.rollNumber)) {
      toast({
        title: "Missing Student Information",
        description: "Please provide class and roll number",
        variant: "destructive",
      });
      return;
    }

    // Mock registration - in real app, this would connect to Firebase
    const userData = {
      ...formData,
      points: formData.role === "student" ? 0 : undefined,
      joinDate: new Date().toISOString(),
    };
    
    localStorage.setItem("user", JSON.stringify(userData));
    
    toast({
      title: "Registration Successful",
      description: "Welcome to PM SHRI KV Sulur Digital Library!",
    });

    // Navigate based on role
    switch (formData.role) {
      case "admin":
        navigate("/admin-dashboard");
        break;
      case "teacher":
        navigate("/teacher-dashboard");
        break;
      case "student":
        navigate("/student-dashboard");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join PM SHRI KV Sulur Digital Library
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin (Library In-charge)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "student" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentClass">Class</Label>
                  <Select value={formData.studentClass} onValueChange={(value) => handleInputChange("studentClass", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6th">6th</SelectItem>
                      <SelectItem value="7th">7th</SelectItem>
                      <SelectItem value="8th">8th</SelectItem>
                      <SelectItem value="9th">9th</SelectItem>
                      <SelectItem value="10th">10th</SelectItem>
                      <SelectItem value="11th">11th</SelectItem>
                      <SelectItem value="12th">12th</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    placeholder="001"
                    value={formData.rollNumber}
                    onChange={(e) => handleInputChange("rollNumber", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Create Account
            </Button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-blue-600"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            </p>
          </div>

          <div className="text-center mt-4">
            <Button 
              variant="link" 
              className="p-0 h-auto text-gray-500"
              onClick={() => navigate("/")}
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
