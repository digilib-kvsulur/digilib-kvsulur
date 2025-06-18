
import { Button } from "@/components/ui/button";
import { BookOpen, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StudentHeaderProps {
  user: any;
  onLogout: () => void;
}

const StudentHeader = ({ user, onLogout }: StudentHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user.firstName}!</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => navigate('/catalog')} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Browse Books
            </Button>
            <Button onClick={onLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
