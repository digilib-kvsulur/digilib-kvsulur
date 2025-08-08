
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const [identifier, setIdentifier] = useState(""); // Can be email, username, or phone
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Generate class-section combinations
  const getClassOptions = () => {
    const options = [];
    
    // 6th to 10th: A to E sections
    for (let grade = 6; grade <= 10; grade++) {
      for (let section of ['A', 'B', 'C', 'D', 'E']) {
        options.push({ value: `${grade}${section}`, label: `${grade}th ${section}` });
      }
    }
    
    // 11th and 12th: A to C sections
    for (let grade = 11; grade <= 12; grade++) {
      for (let section of ['A', 'B', 'C']) {
        options.push({ value: `${grade}${section}`, label: `${grade}th ${section}` });
      }
    }
    
    return options;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!identifier || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // First, find the user by identifier (email, username, or phone)
      const { data: userData, error: userError } = await supabase.rpc('find_user_by_identifier', {
        identifier: identifier
      });

      if (userError || !userData || userData.length === 0) {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Please check your email/username/phone and password.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const user = userData[0];

      // Check if user is approved
      if (!user.is_approved) {
        toast({
          title: "Account Not Approved",
          description: "Your account is pending admin approval. Please contact the administrator.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Attempt to sign in with email (since Supabase auth requires email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });

      // Small delay to ensure auth state is properly set before navigation
      setTimeout(() => {
        // Navigate based on role
        switch (profile?.role) {
          case "admin":
            navigate("/admin-dashboard", { replace: true });
            break;
          case "teacher":
            navigate("/teacher-dashboard", { replace: true });
            break;
          case "student":
            navigate("/student-dashboard", { replace: true });
            break;
          default:
            navigate("/", { replace: true });
        }
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!identifier || !password || !firstName || !lastName || !role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate email format for signup (since we need an email for Supabase auth)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address for signup",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Prepare phone number - use null if empty to avoid unique constraint issues
      const phoneNumber = phone.trim() || null;
      const usernameValue = username.trim() || null;

      const { error } = await supabase.auth.signUp({
        email: identifier,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
            student_class: studentClass,
            roll_number: rollNumber,
            username: usernameValue,
            phone: phoneNumber,
          }
        }
      });

      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Sign Up Successful",
        description: "Please check your email to confirm your account. Your account will need admin approval before you can log in.",
      });

      setIsSignUp(false);
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign Up Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  const classOptions = getClassOptions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl">{isSignUp ? 'Sign Up' : 'Login'}</CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create your PM SHRI KV Sulur Digital Library account'
              : 'Access your PM SHRI KV Sulur Digital Library account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSignUp && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can login using your email, username, or phone number
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
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

                <div className="space-y-2">
                  <Label htmlFor="username">Username (Optional)</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="john_doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {role === 'student' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="studentClass">Class & Section</Label>
                      <Select value={studentClass} onValueChange={setStudentClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class & section" />
                        </SelectTrigger>
                        <SelectContent>
                          {classOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        type="text"
                        placeholder="e.g., 123"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier">
                {isSignUp ? 'Email' : 'Email / Username / Phone'}
              </Label>
              <Input
                id="identifier"
                type={isSignUp ? "email" : "text"}
                placeholder={isSignUp ? "your.email@example.com" : "Email, username, or phone"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isSignUp && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your account will require admin approval before you can log in
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Login')}
            </Button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-blue-600"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Sign in" : "Sign up"}
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

export default Login;
