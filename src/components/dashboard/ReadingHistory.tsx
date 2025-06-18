
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star } from "lucide-react";

interface ReadingHistoryBook {
  title: string;
  completedDate: string;
  rating: number;
  points: number;
}

interface ReadingHistoryProps {
  books: ReadingHistoryBook[];
}

const ReadingHistory = ({ books }: ReadingHistoryProps) => {
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
          {books.map((book, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{book.title}</h4>
                <p className="text-sm text-gray-600">
                  Completed: {new Date(book.completedDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < book.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <Badge variant="outline">+{book.points} points</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingHistory;
