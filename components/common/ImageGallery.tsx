'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: { url: string; alt?: string }[];
  className?: string;
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
          <div
            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer"
            onClick={() => openLightbox(0)}
          >
            <Image
              src={images[0].url}
              alt={images[0].alt || ''}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div
              className="relative aspect-square rounded-xl overflow-hidden cursor-pointer col-span-1 row-span-2"
              onClick={() => openLightbox(0)}
            >
              <Image
                src={images[0].url}
                alt={images[0].alt || ''}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="grid grid-rows-2 gap-2">
              {images.slice(1, 3).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(i + 1)}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || ''}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {i === 1 && images.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </Button>

          {lightboxIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}

          <div
            className="relative max-w-4xl w-full mx-8 aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].alt || ''}
              fill
              className="object-contain"
            />
          </div>

          {lightboxIndex < images.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(i);
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === lightboxIndex ? 'bg-white' : 'bg-white/40'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
