'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: { url: string; alt?: string }[];
  className?: string;
}

function GalleryImage({
  src,
  alt,
  fill,
  priority,
  sizes,
  className,
  loading,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
        <ImageOff className="w-6 h-6 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Image unavailable</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      loading={loading}
      sizes={sizes}
      className={className}
      onError={() => setError(true)}
    />
  );
}

export function ImageGallery({ images, className }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) return null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null));
  const next = () =>
    setLightboxIndex((i) => (i !== null ? Math.min(images.length - 1, i + 1) : null));

  return (
    <>
      <div className={cn('grid gap-2', className)}>
        {images.length === 1 ? (
          <button
            type="button"
            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => openLightbox(0)}
            aria-label={`View photo: ${images[0].alt || 'Gallery image'}`}
          >
            <GalleryImage
              src={images[0].url}
              alt={images[0].alt || 'Gallery image 1'}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover motion-safe:hover:scale-105 transition-transform duration-300"
            />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="relative aspect-square rounded-xl overflow-hidden cursor-pointer col-span-1 row-span-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => openLightbox(0)}
              aria-label={`View photo: ${images[0].alt || 'Gallery image 1'}`}
            >
              <GalleryImage
                src={images[0].url}
                alt={images[0].alt || 'Gallery image 1'}
                fill
                priority
                sizes="(max-width: 768px) 50vw, 400px"
                className="object-cover motion-safe:hover:scale-105 transition-transform duration-300"
              />
            </button>
            <div className="grid grid-rows-2 gap-2">
              {images.slice(1, 3).map((img, i) => (
                <button
                  type="button"
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  onClick={() => openLightbox(i + 1)}
                  aria-label={`View photo: ${img.alt || `Gallery image ${i + 2}`}`}
                >
                  <GalleryImage
                    src={img.url}
                    alt={img.alt || `Gallery image ${i + 2}`}
                    fill
                    loading="eager"
                    sizes="(max-width: 768px) 50vw, 400px"
                    className="object-cover motion-safe:hover:scale-105 transition-transform duration-300"
                  />
                  {i === 1 && images.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center" aria-hidden="true">
                      <span className="text-white font-bold text-xl tabular-nums">+{images.length - 3}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <LightboxOverlay
          images={images}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
          onGoTo={setLightboxIndex}
        />
      )}
    </>
  );
}

/** Lightbox overlay with keyboard navigation, focus trap, and touch swipe support */
function LightboxOverlay({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onGoTo,
}: {
  images: { url: string; alt?: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 50) onPrev();  // swipe right = previous
    if (delta < -50) onNext(); // swipe left = next
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while lightbox open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`Image gallery, showing image ${currentIndex + 1} of ${images.length}`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/10 min-w-[44px] min-h-[44px]"
        onClick={onClose}
        aria-label="Close gallery"
      >
        <X className="w-6 h-6" />
      </Button>

      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-white hover:bg-white/10 min-w-[44px] min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      <div
        className="relative max-w-4xl w-full mx-8 aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[currentIndex].url}
          alt={images[currentIndex].alt || `Gallery image ${currentIndex + 1}`}
          fill
          sizes="(max-width: 896px) 100vw, 896px"
          className="object-contain"
        />
      </div>

      {currentIndex < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-white hover:bg-white/10 min-w-[44px] min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" role="tablist" aria-label="Image navigation">
        {images.map((img, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={`Go to image ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              onGoTo(i);
            }}
            className={cn(
              'w-3 h-3 rounded-full transition-colors min-w-[12px] min-h-[12px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              i === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
            )}
          />
        ))}
      </div>

      {/* Image counter for screen readers */}
      <div className="sr-only" aria-live="polite">
        Image {currentIndex + 1} of {images.length}: {images[currentIndex].alt || 'Gallery image'}
      </div>
    </div>
  );
}
