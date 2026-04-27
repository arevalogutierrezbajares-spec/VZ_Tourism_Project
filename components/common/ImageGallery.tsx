'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ImageOff, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: { url: string; alt?: string }[];
  className?: string;
  /** "default" = contained 2x2 grid; "hero" = full-width bento with 5 slots */
  variant?: 'default' | 'hero';
  /** Optional overlay elements (e.g. save/share buttons) rendered on top of the gallery */
  overlay?: React.ReactNode;
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

export function ImageGallery({ images, className, variant = 'default', overlay }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) return null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () => setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null));
  const next = () =>
    setLightboxIndex((i) => (i !== null ? Math.min(images.length - 1, i + 1) : null));

  if (variant === 'hero') {
    return (
      <>
        <div className={cn('relative', className)}>
          {images.length === 1 ? (
            <button
              type="button"
              className="relative w-full aspect-[16/7] md:aspect-[2.5/1] rounded-2xl overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => openLightbox(0)}
              aria-label={`View photo: ${images[0].alt || 'Gallery image'}`}
            >
              <GalleryImage
                src={images[0].url}
                alt={images[0].alt || 'Gallery image 1'}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </button>
          ) : images.length <= 3 ? (
            <div className="grid grid-cols-2 gap-1.5 md:gap-2 rounded-2xl overflow-hidden">
              <button
                type="button"
                className="relative aspect-[4/5] md:aspect-[3/4] cursor-pointer row-span-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => openLightbox(0)}
                aria-label={`View photo: ${images[0].alt || 'Gallery image 1'}`}
              >
                <GalleryImage
                  src={images[0].url}
                  alt={images[0].alt || 'Gallery image 1'}
                  fill
                  priority
                  sizes="(max-width: 768px) 50vw, 50vw"
                  className="object-cover"
                />
              </button>
              <div className="grid grid-rows-2 gap-1.5 md:gap-2">
                {images.slice(1, 3).map((img, i) => (
                  <button
                    type="button"
                    key={i}
                    className="relative aspect-square cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => openLightbox(i + 1)}
                    aria-label={`View photo: ${img.alt || `Gallery image ${i + 2}`}`}
                  >
                    <GalleryImage
                      src={img.url}
                      alt={img.alt || `Gallery image ${i + 2}`}
                      fill
                      loading="eager"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* 5-image bento grid: 1 large left + 4 small right (2x2) */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 rounded-2xl overflow-hidden">
              <button
                type="button"
                className="relative aspect-[4/5] md:aspect-auto cursor-pointer col-span-2 row-span-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => openLightbox(0)}
                aria-label={`View photo: ${images[0].alt || 'Gallery image 1'}`}
              >
                <GalleryImage
                  src={images[0].url}
                  alt={images[0].alt || 'Gallery image 1'}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </button>
              {images.slice(1, 5).map((img, i) => (
                <button
                  type="button"
                  key={i}
                  className={cn(
                    'relative hidden md:block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    'aspect-[4/3]'
                  )}
                  onClick={() => openLightbox(i + 1)}
                  aria-label={`View photo: ${img.alt || `Gallery image ${i + 2}`}`}
                >
                  <GalleryImage
                    src={img.url}
                    alt={img.alt || `Gallery image ${i + 2}`}
                    fill
                    loading="eager"
                    sizes="25vw"
                    className="object-cover"
                  />
                  {i === 3 && images.length > 5 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg tabular-nums">+{images.length - 5}</span>
                    </div>
                  )}
                </button>
              ))}
              {/* Mobile: show second image + overflow count */}
              {images.length > 1 && (
                <button
                  type="button"
                  className="relative aspect-[4/5] md:hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => openLightbox(1)}
                  aria-label={`View all ${images.length} photos`}
                >
                  <GalleryImage
                    src={images[1].url}
                    alt={images[1].alt || 'Gallery image 2'}
                    fill
                    loading="eager"
                    sizes="50vw"
                    className="object-cover"
                  />
                  {images.length > 2 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-semibold tabular-nums">+{images.length - 2}</span>
                    </div>
                  )}
                </button>
              )}
            </div>
          )}
          {/* "Show all" button — bottom-right over gallery */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-white/90 backdrop-blur-sm text-foreground text-xs md:text-sm font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-white transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Grid className="w-3.5 h-3.5" />
              Show all photos
            </button>
          )}
          {/* Overlay content (save/share buttons) */}
          {overlay}
        </div>
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

  // Default variant (original behavior)
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
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on mount
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

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
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center outline-none"
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

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2" role="tablist" aria-label="Image navigation">
        {images.length <= 12 ? (
          images.map((_img, i) => (
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
          ))
        ) : (
          <span className="text-white text-sm font-medium tabular-nums">
            {currentIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Image counter for screen readers */}
      <div className="sr-only" aria-live="polite">
        Image {currentIndex + 1} of {images.length}: {images[currentIndex].alt || 'Gallery image'}
      </div>
    </div>
  );
}
