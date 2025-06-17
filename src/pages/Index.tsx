
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, BarChart3, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PM SHRI KV Sulur</h1>
                <p className="text-sm text-gray-600">Digital Library</p>
              </div>
            </div>
            <Button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700">
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to PM SHRI KV Sulur's Digital Library!
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover, learn, and grow with our comprehensive digital library management system. 
            Access thousands of books, track your reading progress, and earn points for your achievements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/register')} 
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3"
            >
              Get Started
            </Button>
            <Button 
              onClick={() => navigate('/catalog')} 
              variant="outline" 
              className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-3"
            >
              Browse Books
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BookOpen className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <CardTitle className="text-lg">Digital Catalog</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Browse our extensive collection of books across various genres and subjects
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <CardTitle className="text-lg">Community</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with fellow readers, share reviews, and participate in reading challenges
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-12 w-12 mx-auto text-purple-600 mb-4" />
              <CardTitle className="text-lg">Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor your reading progress and earn points for your literary achievements
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <User className="h-12 w-12 mx-auto text-orange-600 mb-4" />
              <CardTitle className="text-lg">Personal Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage your issued books, view history, and track your library points
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">Library Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">5,000+</div>
              <div className="text-gray-600">Books Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">1,200+</div>
              <div className="text-gray-600">Active Readers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">25,000+</div>
              <div className="text-gray-600">Books Issued</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 PM SHRI KV Sulur Digital Library. Empowering minds through reading.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
