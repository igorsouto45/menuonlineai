import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductImageCarouselProps {
  productId: string;
  mainImageUrl: string | null;
  productName: string;
  zoomed?: boolean;
  onToggleZoom?: () => void;
}

export function ProductImageCarousel({ 
  productId, 
  mainImageUrl, 
  productName,
  zoomed = false,
  onToggleZoom
}: ProductImageCarouselProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImages() {
      const { data } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (data && data.length > 0) {
        setImages(data);
      }
      setLoading(false);
    }
    loadImages();
  }, [productId]);

  // Combine main image with additional images
  const allImages = mainImageUrl 
    ? [{ id: 'main', image_url: mainImageUrl, display_order: -1 }, ...images]
    : images;

  const hasMultipleImages = allImages.length > 1;

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
        <span className="text-6xl">🍕</span>
      </div>
    );
  }

  if (allImages.length === 0) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer"
        onClick={onToggleZoom}
      >
        <span className="text-8xl">🍕</span>
        <span className="text-sm">Sem imagem</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" onClick={onToggleZoom}>
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={allImages[currentIndex].image_url}
          alt={`${productName} - Imagem ${currentIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full transition-transform duration-500 ${
            zoomed ? 'object-contain scale-110' : 'object-cover'
          }`}
        />
      </AnimatePresence>

      {/* Navigation arrows */}
      {hasMultipleImages && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-lg"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {hasMultipleImages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-primary w-6' 
                  : 'bg-background/60 hover:bg-background/80'
              }`}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      {hasMultipleImages && (
        <div className="absolute top-4 left-4 bg-foreground/50 backdrop-blur-sm text-background text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {allImages.length}
        </div>
      )}
    </div>
  );
}
