import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Star, X } from "lucide-react";

interface LevelUpBannerProps {
  newLevel: {
    level_number: number;
    name: string;
    icon_name: string;
    color: string;
  };
  onClose: () => void;
}

const LevelUpBanner = ({ newLevel, onClose }: LevelUpBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 10 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Allow animation to complete
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-500">
      <Card className="bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-300 shadow-lg min-w-96">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  🎉 Level Up! 🎉
                </h3>
                <p className="text-white/90">
                  Congratulations! You've reached{" "}
                  <span className="font-semibold">Level {newLevel.level_number}: {newLevel.name}</span>
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-white fill-white" />
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LevelUpBanner;