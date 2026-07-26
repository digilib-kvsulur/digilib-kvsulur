import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
const compressImage = (file: File, maxW: number, maxH: number, quality: number): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
    };
  });
};

export default function GalleryManager() {
  const { toast } = useToast();
  const [images, setImages] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ image_url: "", caption: "", is_active: true });

  const load = async () => {
    const { data } = await supabase.from("gallery_images").select("*").order("created_at", { ascending: false });
    setImages(data || []);
  };

  useEffect(() => { load(); }, []);

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    if (selectedFiles.length > 0) {
      setPreviewUrls(selectedFiles.map(f => URL.createObjectURL(f)));
      setForm(prev => ({ ...prev, image_url: "" }));
    } else {
      setPreviewUrls([]);
    }
  };

  const handleAdd = async () => {
    if (!form.image_url && files.length === 0) {
      toast({ title: "Please provide an image URL or upload files", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newImages = [];

      if (files.length > 0) {
        if (!user) throw new Error("Not signed in");
        
        for (const f of files) {
          const compressedFile = await compressImage(f, 2000, 2000, 0.85);
          const ext = f.name.split(".").pop();
          const path = `gallery/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          
          const { error: upErr } = await supabase.storage.from("gallery-images").upload(path, compressedFile, {
            contentType: "image/jpeg", upsert: false
          });
          if (upErr) throw upErr;
          
          const { data: pub } = supabase.storage.from("gallery-images").getPublicUrl(path);
          newImages.push({
            image_url: pub.publicUrl,
            caption: "",
            is_active: form.is_active
          });
        }
      } else {
        newImages.push({
          image_url: form.image_url,
          caption: "",
          is_active: form.is_active
        });
      }

      const { error } = await supabase.from("gallery_images").insert(newImages);
      if (error) throw error;
      toast({ title: `${newImages.length} image(s) added successfully` });
      setOpen(false);
      setForm({ image_url: "", caption: "", is_active: true });
      setFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    await supabase.from("gallery_images").delete().eq("id", id);
    toast({ title: "Image deleted" });
    load();
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await supabase.from("gallery_images").update({ is_active: !currentStatus }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6" /> Gallery Manager
          </h2>
          <p className="text-sm text-muted-foreground">Manage scrolling gallery images for the homepage via uploads or URLs.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setFiles([]); previewUrls.forEach(url => URL.revokeObjectURL(url)); setPreviewUrls([]); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Image</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader><DialogTitle>Add Gallery Image</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="border p-4 rounded-xl space-y-3 bg-slate-50">
                <Label className="font-bold text-slate-700">Choose Image Source</Label>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Option A: Upload Image File(s)</Label>
                    <Input type="file" accept="image/*" multiple onChange={handleFileChange} />
                  </div>
                  
                  <div className="text-center text-xs text-muted-foreground">— OR —</div>
                  
                  <div>
                    <Label className="text-xs">Option B: External Image URL</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-9" 
                        placeholder="https://imgur.com/... or Google Drive link" 
                        value={form.image_url} 
                        onChange={e => {
                          setForm({ ...form, image_url: e.target.value });
                          setFiles([]);
                          previewUrls.forEach(url => URL.revokeObjectURL(url));
                          setPreviewUrls([]);
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                <Label>Active (Show on homepage)</Label>
              </div>
              
              {(previewUrls.length > 0 || form.image_url) && (
                <div className="mt-4 border rounded-md overflow-x-auto bg-slate-50 h-32 flex items-center p-2 gap-2">
                  {previewUrls.length > 0 ? (
                    previewUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Preview ${idx}`} className="h-full w-auto object-contain shrink-0" />
                    ))
                  ) : (
                    <img src={form.image_url} alt="Preview" className="h-full w-auto object-contain shrink-0 mx-auto" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  )}
                </div>
              )}
              
              <Button onClick={handleAdd} className="w-full mt-4" disabled={loading}>
                {loading ? "Adding..." : "Add Image"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <Card key={img.id} className="overflow-hidden flex flex-col">
            <div className="relative h-40 bg-slate-100 flex items-center justify-center border-b group">
              <img src={img.image_url} alt={img.caption || "Gallery image"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="destructive" onClick={() => remove(img.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <CardContent className="p-3 flex-1 flex flex-col justify-between">
              <p className="text-sm font-medium line-clamp-2 mb-3" title={img.caption}>{img.caption || <span className="text-muted-foreground italic">No caption</span>}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-muted-foreground">Status:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{img.is_active ? "Active" : "Hidden"}</span>
                  <Switch checked={img.is_active} onCheckedChange={() => toggleActive(img.id, img.is_active)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {images.length === 0 && (
          <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No gallery images added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
