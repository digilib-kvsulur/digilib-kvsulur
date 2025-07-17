
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, Trash2, Award, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as Icons from "lucide-react";

interface Level {
  id: string;
  level_number: number;
  name: string;
  min_points: number;
  max_points: number | null;
  icon_name: string;
  color: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Common icon options for levels
const ICON_OPTIONS = [
  'book-open', 'graduation-cap', 'search', 'compass', 'award', 
  'crown', 'trophy', 'sparkles', 'star', 'medal', 'gem', 'zap'
];

const COLOR_OPTIONS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Green', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Rose', value: '#dc2626' },
  { name: 'Violet', value: '#7c3aed' }
];

const LevelManager = () => {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    level_number: '',
    name: '',
    min_points: '',
    max_points: '',
    icon_name: 'star',
    color: '#3b82f6',
    description: ''
  });

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast({
        title: "Error",
        description: "Failed to load levels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      level_number: '',
      name: '',
      min_points: '',
      max_points: '',
      icon_name: 'star',
      color: '#3b82f6',
      description: ''
    });
  };

  const handleSubmit = async (isEdit: boolean = false) => {
    try {
      const levelData = {
        level_number: parseInt(formData.level_number),
        name: formData.name,
        min_points: parseInt(formData.min_points),
        max_points: formData.max_points ? parseInt(formData.max_points) : null,
        icon_name: formData.icon_name,
        color: formData.color,
        description: formData.description,
        updated_at: new Date().toISOString()
      };

      let error;

      if (isEdit && editingLevel) {
        const { error: updateError } = await supabase
          .from('levels')
          .update(levelData)
          .eq('id', editingLevel.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('levels')
          .insert([levelData]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Level ${isEdit ? 'updated' : 'created'} successfully`,
      });

      resetForm();
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingLevel(null);
      loadLevels();
    } catch (error) {
      console.error('Error saving level:', error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? 'update' : 'create'} level`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (level: Level) => {
    setEditingLevel(level);
    setFormData({
      level_number: level.level_number.toString(),
      name: level.name,
      min_points: level.min_points.toString(),
      max_points: level.max_points?.toString() || '',
      icon_name: level.icon_name,
      color: level.color,
      description: level.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (level: Level) => {
    if (!confirm(`Are you sure you want to delete level "${level.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', level.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Level deleted successfully",
      });

      loadLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
      toast({
        title: "Error",
        description: "Failed to delete level",
        variant: "destructive",
      });
    }
  };

  const LevelForm = ({ isEdit = false }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="level_number">Level Number *</Label>
          <Input
            id="level_number"
            type="number"
            value={formData.level_number}
            onChange={(e) => setFormData(prev => ({ ...prev, level_number: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="min_points">Min Points *</Label>
          <Input
            id="min_points"
            type="number"
            value={formData.min_points}
            onChange={(e) => setFormData(prev => ({ ...prev, min_points: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Level Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="max_points">Max Points (optional)</Label>
          <Input
            id="max_points"
            type="number"
            value={formData.max_points}
            onChange={(e) => setFormData(prev => ({ ...prev, max_points: e.target.value }))}
            placeholder="Leave empty for highest level"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="icon_name">Icon</Label>
          <Select value={formData.icon_name} onValueChange={(value) => setFormData(prev => ({ ...prev, icon_name: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((icon) => {
                const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<any>;
                return (
                  <SelectItem key={icon} value={icon}>
                    <div className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      {icon}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="color">Color</Label>
          <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this level"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingLevel(null);
          }}
        >
          Cancel
        </Button>
        <Button onClick={() => handleSubmit(isEdit)}>
          {isEdit ? 'Update Level' : 'Create Level'}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading levels...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Level Management
              </CardTitle>
              <CardDescription>
                Configure student levels and progression system
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Level</DialogTitle>
                  <DialogDescription>
                    Add a new level to the progression system
                  </DialogDescription>
                </DialogHeader>
                <LevelForm />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {levels.map((level) => {
              const IconComponent = Icons[level.icon_name as keyof typeof Icons] as React.ComponentType<any>;
              
              return (
                <div key={level.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {IconComponent && (
                        <IconComponent 
                          className="h-5 w-5" 
                          style={{ color: level.color }}
                        />
                      )}
                      <Badge variant="outline">Level {level.level_number}</Badge>
                    </div>
                    <div>
                      <h3 className="font-medium">{level.name}</h3>
                      <p className="text-sm text-gray-600">
                        {level.min_points} - {level.max_points || '∞'} points
                      </p>
                      {level.description && (
                        <p className="text-sm text-gray-500 mt-1">{level.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(level)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(level)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {levels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No levels configured yet. Create your first level to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Level</DialogTitle>
            <DialogDescription>
              Update level information and settings
            </DialogDescription>
          </DialogHeader>
          <LevelForm isEdit={true} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LevelManager;
