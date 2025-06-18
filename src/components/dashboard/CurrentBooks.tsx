
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface Book {
  id: number;
  title: string;
  author: string;
  issueDate: string;
  dueDate: string;
  daysLeft: number;
}

interface CurrentBooksProps {
  books: Book[];
}

const CurrentBooks = ({ books }: CurrentBooksProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Currently Issued Books
        </CardTitle>
        <CardDescription>Books you have currently issued</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {books.map((book) => (
            <div key={book.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium">{book.title}</h4>
                <p className="text-sm text-gray-600">by {book.author}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Issued: {new Date(book.issueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={book.daysLeft <= 3 ? "destructive" : "default"}>
                  {book.daysLeft} days left
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Due: {new Date(book.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentBooks;
