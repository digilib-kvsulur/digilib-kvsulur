
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReadingHistoryEntry {
  id: string;
  book_title: string;
  book_author: string;
  completed_date: string;
  rating?: number;
  points_earned: number;
}

const RealReadingHistory = () => {
  const [entries, setEntries] = useState<ReadingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
        .order('completed_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading reading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Reading History
          </CardTitle>
          <CardDescription>Books you've completed recently</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Reading History
        </CardTitle>
        <CardDescription>Books you've completed recently</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{entry.book_title}</h4>
                  <p className="text-sm text-gray-600 mb-1">by {entry.book_author}</p>
                  <p className="text-sm text-gray-600">
                    Completed: {new Date(entry.completed_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {entry.rating && (
                    <div className="flex items-center gap-1 mb-1">
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
                  <Badge variant="outline">+{entry.points_earned} points</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No reading history yet</p>
              <p className="text-sm text-gray-500">Add completed books in the Reading section to see them here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealReadingHistory;
