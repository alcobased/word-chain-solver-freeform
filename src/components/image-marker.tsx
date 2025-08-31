"use client";

import { useState, useEffect, useRef, type MouseEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X } from "lucide-react";

type Circle = {
  x: number; // percentage
  y: number; // percentage
};

type ImageState = {
  src: string;
  width: number;
  height: number;
}

export default function ImageMarker() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isClient, setIsClient] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const savedImage = localStorage.getItem("imageMarker-image");
      const savedCircles = localStorage.getItem("imageMarker-circles");
      if (savedImage) {
        setImage(JSON.parse(savedImage));
      }
      if (savedCircles) {
        setCircles(JSON.parse(savedCircles));
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        localStorage.removeItem("imageMarker-image");
        localStorage.removeItem("imageMarker-circles");
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        if (image) {
          localStorage.setItem("imageMarker-image", JSON.stringify(image));
        } else {
          localStorage.removeItem("imageMarker-image");
        }
        localStorage.setItem("imageMarker-circles", JSON.stringify(circles));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [image, circles, isClient]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
            setImage({
                src: dataUrl,
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
            setCircles([]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const rect = img.getBoundingClientRect();

    const clickX = e.clientX;
    const clickY = e.clientY;

    if (
      clickX < rect.left || clickX > rect.right ||
      clickY < rect.top || clickY > rect.bottom
    ) {
      return;
    }

    const relativeX = clickX - rect.left;
    const relativeY = clickY - rect.top;

    const xPercent = relativeX / rect.width;
    const yPercent = relativeY / rect.height;

    setCircles(prevCircles => [...prevCircles, { x: xPercent, y: yPercent }]);
  };

  const handleClear = () => {
    setImage(null);
    setCircles([]);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6">
        <h1 className="text-xl font-semibold font-headline">Image Marker</h1>
        <div className="flex items-center gap-2 md:gap-4">
          <Button onClick={handleClear} variant="ghost" size="sm" disabled={!image}>
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
          <Label htmlFor="image-upload" className="cursor-pointer">
            <Button asChild variant="default">
              <div className="flex items-center">
                <UploadCloud className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </div>
            </Button>
          </Label>
          <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={fileInputRef} />
        </div>
      </header>
      <main className="relative flex-grow" onClick={handleContainerClick}>
        {isClient && image ? (
          <div className="absolute inset-0 p-2 sm:p-4">
            <div className="relative h-full w-full">
              <Image
                ref={imageRef}
                src={image.src}
                width={image.width}
                height={image.height}
                alt="Uploaded content for marking"
                className="h-full w-full select-none object-contain drop-shadow-lg"
                priority
              />
              {circles.map((circle, index) => (
                <div
                  key={index}
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary/30 ring-2 ring-white"
                  style={{
                    left: `${circle.x * 100}%`,
                    top: `${circle.y * 100}%`,
                  }}
                  aria-hidden="true"
                ></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <UploadCloud className="mx-auto h-12 w-12" />
              <p className="mt-4 text-lg font-medium">Upload an image to start marking</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
