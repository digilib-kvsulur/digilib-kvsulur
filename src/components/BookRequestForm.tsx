
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookRequestFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const BookRequestForm = ({ onClose, onSuccess }: BookRequestFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    description: '',
    reason: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.author) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the book title and author.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to request books.",
          variant: "destructive",
        });
        return;
      }

      // Check if book already exists (students can read from books table)
      const { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .eq('title', formData.title)
        .eq('author', formData.author)
        .maybeSingle();

      let bookId: string;
      let requestNotes = '';

      if (existingBook) {
        // Book exists, create request for existing book
        bookId = existingBook.id;
        requestNotes = formData.reason ? `Student request reason: ${formData.reason}` : 'Request for existing book';
      } else {
        // Book doesn't exist, we need to create a placeholder request
        // Since students can't create books directly, we'll create a temporary book ID
        // and let admin handle book creation during approval
        
        // Create a request with detailed information in admin_notes for new book
        requestNotes = `NEW BOOK REQUEST - Title: ${formData.title}, Author: ${formData.author}`;
        if (formData.isbn) requestNotes += `, ISBN: ${formData.isbn}`;
        if (formData.description) requestNotes += `, Description: ${formData.description}`;
        if (formData.reason) requestNotes += `, Reason: ${formData.reason}`;
        
        // We'll use a special approach - create a request without a book_id initially
        // But we need a book_id for the foreign key constraint, so let's first create a placeholder book
        // Actually, let's try a different approach - we'll store the book info in admin_notes
        // and set book_id to a placeholder that admin can update later
        
        // For now, let's just inform the user that admin will need to add the book first
        toast({
          title: "Book Not Found",
          description: "This book is not in our library yet. Please ask an admin to add it first, then you can request it.",
          variant: "destructive",
        });
        return;
      }

      // Create the book request for existing book
      const { error: requestError } = await supabase
        .from('book_requests')
        .insert({
          book_id: bookId,
          user_id: user.id,
          admin_notes: requestNotes
        });

      if (requestError) {
        throw requestError;
      }

      toast({
        title: "Request Submitted",
        description: "Your book request has been submitted successfully. Admin will review it soon.",
      });

      // Reset form
      setFormData({
        title: '',
        author: '',
        isbn: '',
        description: '',
        reason: ''
      });

      if (onSuccess) {
        onSuccess();
      }

      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('Error submitting book request:', error);
      toast({
        title: "Error",
        description: "Failed to submit book request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Request a Book
        </CardTitle>
        <CardDescription>
          Request a book that's available in our library catalog. If the book isn't available yet, please ask an admin to add it first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter book title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="author">Author *</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Enter author name"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why do you want this book? (Optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Tell us why you're interested in this book"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.author}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Submit Request
                </div>
              )}
            </Button>
            
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookRequestForm;
