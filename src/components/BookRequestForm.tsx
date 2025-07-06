
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookPlus, Send } from "lucide-react";
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

      // Create a book request record with book information in admin_notes
      // This is a request for the library to purchase a new book
      const requestNotes = `NEW BOOK PURCHASE REQUEST - Title: ${formData.title}, Author: ${formData.author}`;
      const additionalInfo = [];
      
      if (formData.isbn) additionalInfo.push(`ISBN: ${formData.isbn}`);
      if (formData.description) additionalInfo.push(`Description: ${formData.description}`);
      if (formData.reason) additionalInfo.push(`Reason for request: ${formData.reason}`);
      
      const finalNotes = additionalInfo.length > 0 
        ? `${requestNotes}, ${additionalInfo.join(', ')}`
        : requestNotes;

      // We'll create a temporary book entry that admin can approve and finalize
      const { data: tempBook, error: bookError } = await supabase
        .from('books')
        .insert({
          title: `[PENDING PURCHASE] ${formData.title}`,
          author: formData.author,
          isbn: formData.isbn || null,
          description: formData.description || null,
          total_copies: 0,
          available_copies: 0,
        })
        .select()
        .single();

      if (bookError) {
        throw bookError;
      }

      // Create the book request
      const { error: requestError } = await supabase
        .from('book_requests')
        .insert({
          book_id: tempBook.id,
          user_id: user.id,
          admin_notes: finalNotes
        });

      if (requestError) {
        throw requestError;
      }

      toast({
        title: "Request Submitted",
        description: "Your book purchase request has been submitted. Admin will review it for library acquisition.",
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
        description: "Failed to submit book purchase request. Please try again.",
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
          <BookPlus className="h-5 w-5" />
          Request New Book for Library
        </CardTitle>
        <CardDescription>
          Request a new book to be purchased for the library. Admin will review your request and consider adding it to the collection.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN (Optional)</Label>
              <Input
                id="isbn"
                value={formData.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                placeholder="Enter ISBN if known"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Book Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the book"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Why should the library buy this book? *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Explain why this book would be a valuable addition to the library"
              rows={3}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.title || !formData.author || !formData.reason}
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
                  Submit Purchase Request
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
