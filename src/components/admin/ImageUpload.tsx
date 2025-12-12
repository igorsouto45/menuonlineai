import { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
}

const aspectClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[3/1]',
};

export default function ImageUpload({
  value,
  onChange,
  folder = 'products',
  className,
  aspectRatio = 'video',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadImage = useCallback(async (file: File) => {
    if (!user) return;

    // Validate file
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

    setUploading(true);

    try {
      // Create optimized image (resize if too large)
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

      onChange(publicUrl.publicUrl);
      
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
  }, [user, folder, onChange, toast]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file);
  }, [uploadImage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const removeImage = async () => {
    if (value) {
      // Extract path from URL
      const url = new URL(value);
      const path = url.pathname.split('/restaurant-images/')[1];
      
      if (path) {
        await supabase.storage
          .from('restaurant-images')
          .remove([decodeURIComponent(path)]);
      }
    }
    onChange(null);
  };

  return (
    <div className={cn('relative', className)}>
      {value ? (
        <div className={cn('relative rounded-xl overflow-hidden border border-border', aspectClasses[aspectRatio])}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors',
            aspectClasses[aspectRatio],
            dragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Enviando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                {dragOver ? (
                  <ImageIcon className="w-6 h-6 text-primary" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {dragOver ? 'Solte a imagem aqui' : 'Clique ou arraste uma imagem'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP (máx. 5MB)
                </p>
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
