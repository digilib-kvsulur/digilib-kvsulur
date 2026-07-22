
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Star, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReadingHistoryEntry {
  id: string;
  book_title: string;
  book_author: string;
  completed_date: string;
  rating?: number;
  points_earned: number;
  notes?: string;
  status?: string;
}

interface ReadingHistoryManagerProps {
  onPointsUpdate?: () => void;
}

const ReadingHistoryManager = ({ onPointsUpdate }: ReadingHistoryManagerProps) => {
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ReadingHistoryEntry | null>(null);
  const [formData, setFormData] = useState({
    book_title: '',
    book_author: '',
    completed_date: '',
    rating: 5,
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadReadingHistory();
  }, []);

  const loadReadingHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading reading history:', error);
      toast({
        title: "Error",
        description: "Failed to load reading history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fixed points calculation based on rating
      const pointsEarned = formData.rating * 5; // 1 star = 5 points, 5 stars = 25 points

      const entryData = {
        ...formData,
        user_id: user.id,
        points_earned: pointsEarned,
        completed_date: formData.completed_date || new Date().toISOString().split('T')[0]
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('reading_history')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Reading history updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('reading_history')
          .insert({ ...entryData, status: 'pending' });

        if (error) throw error;

        toast({
          title: "Entry submitted for approval",
          description: `Your reading entry will be reviewed by the admin. Points will be awarded after approval.`,
        });
      }

      setShowAddDialog(false);
      setEditingEntry(null);
      setFormData({
        book_title: '',
        book_author: '',
        completed_date: '',
        rating: 5,
        notes: ''
      });
      loadReadingHistory();
      onPointsUpdate?.();
    } catch (error) {
      console.error('Error saving reading history:', error);
      toast({
        title: "Error",
        description: "Failed to save reading history",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (entry: ReadingHistoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      book_title: entry.book_title,
      book_author: entry.book_author,
      completed_date: entry.completed_date,
      rating: entry.rating || 5,
      notes: entry.notes || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('reading_history')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reading history entry deleted",
      });

      loadReadingHistory();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Reading History
          </h3>
          <p className="text-sm text-gray-600">Track books you've completed and earn points based on your rating</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingEntry(null);
              setFormData({
                book_title: '',
                book_author: '',
                completed_date: '',
                rating: 5,
                notes: ''
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit' : 'Add'} Reading Entry</DialogTitle>
              <DialogDescription>
                {editingEntry ? 'Update your reading entry' : 'Add a book you\'ve completed. An admin will review and award points after approval.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="book_title">Book Title</Label>
                <Input
                  id="book_title"
                  value={formData.book_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, book_title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="book_author">Author</Label>
                <Input
                  id="book_author"
                  value={formData.book_author}
                  onChange={(e) => setFormData(prev => ({ ...prev, book_author: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="completed_date">Completion Date</Label>
                <Input
                  id="completed_date"
                  type="date"
                  value={formData.completed_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, completed_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="rating">Rating (1-5 stars)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                />
                <p className="text-xs text-gray-500 mt-1">Points earned: {formData.rating * 5} points</p>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Your thoughts about the book..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingEntry ? 'Update' : 'Add'} Book
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{entry.book_title}</h4>
                  <p className="text-gray-600 mb-2">by {entry.book_author}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                    <span>Completed: {new Date(entry.completed_date).toLocaleDateString()}</span>
                    {entry.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < entry.rating! ? "text-yellow-400 fill-current" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-gray-700 mb-2">{entry.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'approved' ? (
                    <Badge className="bg-success/10 text-success border-success/20">+{entry.points_earned} pts</Badge>
                  ) : entry.status === 'rejected' ? (
                    <Badge variant="destructive">Rejected</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">⏳ Pending Approval</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(entry)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {entries.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reading history yet</h3>
              <p className="text-gray-600 mb-4">Start adding books you've completed to earn points!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReadingHistoryManager;
