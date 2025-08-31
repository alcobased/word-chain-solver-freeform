
"use client";

import { useState, useEffect, useRef, type MouseEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";

type Circle = {
  x: number; // percentage
  y: number; // percentage
};

type Circles = Record<string, Circle>;

type ImageState = {
  src: string;
  width: number;
  height: number;
}

export default function ImageMarker() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [circles, setCircles] = useState<Circles>({});
  const [clickQueue, setClickQueue] = useState<string[]>([]);
  const [markerSize, setMarkerSize] = useState<number>(16);
  const [isClient, setIsClient] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const savedImage = localStorage.getItem("imageMarker-image");
      const savedCircles = localStorage.getItem("imageMarker-circles");
      const savedClickQueue = localStorage.getItem("imageMarker-clickQueue");
      const savedMarkerSize = localStorage.getItem("imageMarker-markerSize");
      
      if (savedImage) {
        setImage(JSON.parse(savedImage));
      }
      if (savedCircles) {
        setCircles(JSON.parse(savedCircles));
      }
      if (savedClickQueue) {
        setClickQueue(JSON.parse(savedClickQueue));
      }
      if (savedMarkerSize) {
        setMarkerSize(JSON.parse(savedMarkerSize));
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        localStorage.removeItem("imageMarker-image");
        localStorage.removeItem("imageMarker-circles");
        localStorage.removeItem("imageMarker-clickQueue");
        localStorage.removeItem("imageMarker-markerSize");
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
        localStorage.setItem("imageMarker-clickQueue", JSON.stringify(clickQueue));
        localStorage.setItem("imageMarker-markerSize", JSON.stringify(markerSize));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [image, circles, clickQueue, markerSize, isClient]);

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
            setCircles({});
            setClickQueue([]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    // Prevent adding a new circle if a circle was clicked.
    if ((e.target as HTMLElement).closest('[data-circle-id]')) {
      return;
    }

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

    const newCircleId = crypto.randomUUID();

    setCircles(prevCircles => ({
      ...prevCircles,
      [newCircleId]: { x: xPercent, y: yPercent }
    }));
    
    setClickQueue(prevQueue => [...prevQueue, newCircleId]);
  };
  
  const handleCircleClick = (clickedCircleId: string) => {
    setClickQueue(prevQueue => [...prevQueue, clickedCircleId]);
  };

  const handleClear = () => {
    setImage(null);
    setCircles({});
    setClickQueue([]);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleMarkerSizeChange = (value: number[]) => {
    setMarkerSize(value[0]);
  };

  const getSortedCircles = () => {
    const sortedIds = Object.keys(circles).sort((a, b) => {
      const lastIndexA = clickQueue.lastIndexOf(a);
      const lastIndexB = clickQueue.lastIndexOf(b);
      return lastIndexA - lastIndexB;
    });

    return sortedIds.map(id => ({
      id,
      ...circles[id]
    }));
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6">
        <h1 className="text-xl font-semibold font-headline">Image Marker</h1>
        <div className="flex items-center gap-2 md:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" disabled={!image}>
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Controls</h4>
                  <p className="text-sm text-muted-foreground">
                    Adjust marker settings.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marker-size">Marker Size ({markerSize}px)</Label>
                  <Slider
                    id="marker-size"
                    min={4}
                    max={64}
                    step={2}
                    value={[markerSize]}
                    onValueChange={handleMarkerSizeChange}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
              {getSortedCircles().map((circle, index) => (
                <div
                  key={circle.id}
                  data-circle-id={circle.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-primary bg-primary/30 ring-2 ring-white"
                  style={{
                    left: `${circle.x * 100}%`,
                    top: `${circle.y * 100}%`,
                    width: `${markerSize}px`,
                    height: `${markerSize}px`,
                    zIndex: index + 1
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCircleClick(circle.id);
                  }}
                  aria-hidden="true"
                />
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
