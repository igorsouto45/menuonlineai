import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageItem {
  id?: string;
  url: string;
  display_order: number;
}

interface MultiImageUploadProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  folder?: string;
  maxImages?: number;
  className?: string;
}

export default function MultiImageUpload({
  images,
  onChange,
  folder = 'products',
  maxImages = 5,
  className,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const optimizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200;
        
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          0.85
        );
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = useCallback(async (file: File) => {
    if (!user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (images.length >= maxImages) {
      toast({
        title: 'Limite atingido',
        description: `Máximo de ${maxImages} imagens permitidas.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const optimizedFile = await optimizeImage(file);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, optimizedFile, { 
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(fileName);

      const newImage: ImageItem = {
        url: publicUrl.publicUrl,
        display_order: images.length,
      };

      onChange([...images, newImage]);
      
      toast({
        title: 'Imagem enviada!',
        description: 'A imagem foi carregada com sucesso.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [user, folder, onChange, toast, images, maxImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => uploadImage(file));
  }, [uploadImage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => uploadImage(file));
    e.target.value = '';
  };

  const removeImage = async (index: number) => {
    const image = images[index];
    
    if (image.url) {
      try {
        const url = new URL(image.url);
        const path = url.pathname.split('/restaurant-images/')[1];
        
        if (path) {
          await supabase.storage
            .from('restaurant-images')
            .remove([decodeURIComponent(path)]);
        }
      } catch (e) {
        console.error('Error removing image from storage:', e);
      }
    }

    const newImages = images
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, display_order: i }));
    
    onChange(newImages);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    
    onChange(newImages.map((img, i) => ({ ...img, display_order: i })));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div
              key={image.url}
              className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-muted"
            >
              <img
                src={image.url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Controls overlay */}
              <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    className="w-8 h-8 rounded-full bg-background text-foreground flex items-center justify-center hover:bg-muted transition-colors"
                    title="Mover para esquerda"
                  >
                    ←
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  title="Remover"
                >
                  <X className="w-4 h-4" />
                </button>
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    className="w-8 h-8 rounded-full bg-background text-foreground flex items-center justify-center hover:bg-muted transition-colors"
                    title="Mover para direita"
                  >
                    →
                  </button>
                )}
              </div>

              {/* Badge for first image */}
              {index === 0 && (
                <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {images.length < maxImages && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors p-6',
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Enviando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {dragOver ? (
                  <ImageIcon className="w-5 h-5 text-primary" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {dragOver ? 'Solte as imagens aqui' : 'Adicionar imagens'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {images.length}/{maxImages} imagens • JPG, PNG (máx. 5MB cada)
                </p>
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}