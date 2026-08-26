import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BookPlus, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BookRequestForm = ({ open, onOpenChange, onSuccess }: BookRequestFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', author: '', isbn: '', description: '', reason: '' });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => setFormData({ title: '', author: '', isbn: '', description: '', reason: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      toast({ title: "Missing Information", description: "Please provide at least the book title and author.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Auth Error", description: "Please log in.", variant: "destructive" }); return; }

      const { error } = await supabase.from('book_requests').insert({
        book_id: null,
        user_id: user.id,
        requested_title: formData.title,
        requested_author: formData.author,
        requested_isbn: formData.isbn || null,
        requested_description: formData.description || null,
        admin_notes: formData.reason ? `Reason: ${formData.reason}` : null,
        status: 'pending'
      });
      if (error) throw error;

      // Auto-add to book_suggestions table
      await supabase.from("book_suggestions").insert({
        title: formData.title,
        author: formData.author || null,
        reason: formData.reason || formData.description || null,
        user_id: user.id,
        status: "pending"
      });

      // Auto-add to posts table for survey
      await supabase.from("posts").insert({
        title: formData.title,
        content: `[STATUS:voting] Author: ${formData.author}\n\nReason: ${formData.reason || formData.description || 'Request via Catalog'}`,
        post_type: "suggestion_book",
        user_id: user.id
      });

      toast({ title: "Request Submitted! 🎉", description: "Your book request has been sent to the admin for review." });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting book request:', error);
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookPlus className="h-4 w-4 text-primary" />
            </div>
            Request a New Book
          </DialogTitle>
          <DialogDescription>
            Suggest a book for the library. The admin will review your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium">Book Title *</Label>
              <Input id="title" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="e.g. The Great Gatsby" required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="author" className="text-xs font-medium">Author *</Label>
              <Input id="author" value={formData.author} onChange={(e) => handleInputChange('author', e.target.value)} placeholder="e.g. F. Scott Fitzgerald" required className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="isbn" className="text-xs font-medium">ISBN (Optional)</Label>
            <Input id="isbn" value={formData.isbn} onChange={(e) => handleInputChange('isbn', e.target.value)} placeholder="e.g. 978-0-7432-7356-5" className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Book Description (Optional)</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Brief description of the book" rows={2} className="resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-warning" /> Why should the library get this?
            </Label>
            <Textarea id="reason" value={formData.reason} onChange={(e) => handleInputChange('reason', e.target.value)} placeholder="Tell us why this book would be great for the library..." rows={2} className="resize-none" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !formData.title || !formData.author} className="gradient-primary border-0">
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" /> Submitting...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Submit Request</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookRequestForm;
