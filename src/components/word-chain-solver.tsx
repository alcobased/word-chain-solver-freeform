
"use client";

import { useState, useEffect, useRef, type MouseEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X, Undo2, BookText, Save, FolderOpen, Wand2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Circle = {
  x: number; // percentage
  y: number; // percentage
  char?: string;
};

type Circles = Record<string, Circle>;

type ImageState = {
  src: string;
  width: number;
  height: number;
}

type AppState = {
    image: ImageState | null;
    circles: Circles;
    clickQueue: string[];
    markerSize: number;
    wordList: string;
    wordConnections: Record<string, string[]>;
}

export default function WordChainSolver() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [circles, setCircles] = useState<Circles>({});
  const [clickQueue, setClickQueue] = useState<string[]>([]);
  const [markerSize, setMarkerSize] = useState<number>(16);
  const [wordList, setWordList] = useState<string>("");
  const [wordConnections, setWordConnections] = useState<Record<string, string[]>>({});
  const [isClient, setIsClient] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadStateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const savedImage = localStorage.getItem("wordChainSolver-image");
      const savedCircles = localStorage.getItem("wordChainSolver-circles");
      const savedClickQueue = localStorage.getItem("wordChainSolver-clickQueue");
      const savedMarkerSize = localStorage.getItem("wordChainSolver-markerSize");
      const savedWordList = localStorage.getItem("wordChainSolver-wordList");
      const savedWordConnections = localStorage.getItem("wordChainSolver-wordConnections");
      
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
      if (savedWordList) {
        setWordList(savedWordList);
      }
      if (savedWordConnections) {
        setWordConnections(JSON.parse(savedWordConnections));
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        localStorage.removeItem("wordChainSolver-image");
        localStorage.removeItem("wordChainSolver-circles");
        localStorage.removeItem("wordChainSolver-clickQueue");
        localStorage.removeItem("wordChainSolver-markerSize");
        localStorage.removeItem("wordChainSolver-wordList");
        localStorage.removeItem("wordChainSolver-wordConnections");
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        if (image) {
          localStorage.setItem("wordChainSolver-image", JSON.stringify(image));
        } else {
          localStorage.removeItem("wordChainSolver-image");
        }
        localStorage.setItem("wordChainSolver-circles", JSON.stringify(circles));
        localStorage.setItem("wordChainSolver-clickQueue", JSON.stringify(clickQueue));
        localStorage.setItem("wordChainSolver-markerSize", JSON.stringify(markerSize));
        localStorage.setItem("wordChainSolver-wordList", wordList);
        localStorage.setItem("wordChainSolver-wordConnections", JSON.stringify(wordConnections));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [image, circles, clickQueue, markerSize, wordList, wordConnections, isClient]);

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
    setClickQueue(prevQueue => {
      const clickCount = prevQueue.filter(id => id === clickedCircleId).length;
      if (clickCount < 2) {
        return [...prevQueue, clickedCircleId];
      }
      return prevQueue;
    });
  };

  const handleClear = () => {
    setImage(null);
    setCircles({});
    setClickQueue([]);
    setWordList("");
    setWordConnections({});
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const handleMarkerSizeChange = (value: number[]) => {
    setMarkerSize(value[0]);
  };

  const handleCharChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (clickQueue.length === 0) return;

    const lastClickedId = clickQueue[clickQueue.length - 1];
    const newChar = e.target.value.toUpperCase().slice(0, 1);

    setCircles(prev => ({
        ...prev,
        [lastClickedId]: {
            ...prev[lastClickedId],
            char: newChar
        }
    }))
  }

  const handleUndoClick = () => {
    if (clickQueue.length === 0) return;

    const lastClickedId = clickQueue[clickQueue.length - 1];
    const clickCount = clickQueue.filter(id => id === lastClickedId).length;

    if (clickCount === 1) {
      // If it's the first click on this circle, remove the circle.
      setCircles(prevCircles => {
        const newCircles = { ...prevCircles };
        delete newCircles[lastClickedId];
        return newCircles;
      });
    }

    // In both cases (1 or 2 clicks), remove the last entry from the queue.
    setClickQueue(prevQueue => prevQueue.slice(0, -1));
  };

  const processWordList = () => {
    const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());
    const newConnections: Record<string, string[]> = {};

    for (const keyWord of words) {
        newConnections[keyWord] = [];
        for (const otherWord of words) {
            if (keyWord === otherWord) continue;
            if (keyWord.slice(-2) === otherWord.slice(0, 2)) {
                newConnections[keyWord].push(otherWord);
            }
        }
    }
    setWordConnections(newConnections);
    console.log("Word Connections:", newConnections);
  }

  const getSortedCirclesWithIds = () => {
    // Create a set of unique IDs from the click queue to define the order.
    const orderedUniqueIds = [...new Set(clickQueue)];
  
    return orderedUniqueIds.map(id => ({
      id,
      ...circles[id]
    }));
  }

  const handleSaveState = () => {
    const filename = window.prompt("Enter a filename for your save state:", "word-chain-solver-state.json");
    if (!filename) {
      return;
    }

    const stateToSave: AppState = {
      image,
      circles,
      clickQueue,
      markerSize,
      wordList,
      wordConnections
    };

    const blob = new Blob([JSON.stringify(stateToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadState = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loadedState: AppState = JSON.parse(event.target?.result as string);
          // Basic validation
          if (
            'image' in loadedState &&
            'circles' in loadedState &&
            'clickQueue' in loadedState &&
            'markerSize' in loadedState &&
            'wordList' in loadedState &&
            'wordConnections' in loadedState
          ) {
            setImage(loadedState.image);
            setCircles(loadedState.circles);
            setClickQueue(loadedState.clickQueue);
            setMarkerSize(loadedState.markerSize);
            setWordList(loadedState.wordList);
            setWordConnections(loadedState.wordConnections);
          } else {
            console.error("Invalid state file format.");
            alert("Invalid state file format.");
          }
        } catch (error) {
          console.error("Failed to parse state file.", error);
          alert("Failed to read or parse the state file.");
        }
      };
      reader.readAsText(file);
      // Reset file input to allow loading the same file again
      if (loadStateInputRef.current) {
        loadStateInputRef.current.value = "";
      }
    }
  };

  const solveLocally = (
    queue: string[],
    allCircles: Circles,
    words: string[],
    connections: Record<string, string[]>
  ): { solution: string[], reasoning: string } => {
    const totalLength = queue.length;
    const knownChars = queue.map((id, index) => ({
      char: allCircles[id]?.char,
      index
    })).filter(item => item.char);

    const findSolutions = (
      currentChain: string,
      usedWords: string[],
      lastWord: string | null
    ): string[][] => {
      if (currentChain.length > totalLength) {
        return [];
      }
      
      if (currentChain.length === totalLength) {
        for (const { char, index } of knownChars) {
          if (currentChain[index] !== char) {
            return [];
          }
        }
        return [usedWords];
      }

      let solutions: string[][] = [];
      
      const possibleNextWords = lastWord ? connections[lastWord] || [] : words;

      for (const word of possibleNextWords) {
        if (usedWords.includes(word)) continue;

        const newChain = lastWord ? currentChain + word.slice(2) : word;
        
        // Pre-check known characters
        let possible = true;
        for (const { char, index } of knownChars) {
          if (index < newChain.length && newChain[index] !== char) {
            possible = false;
            break;
          }
        }
        if (!possible) continue;
        
        const results = findSolutions(newChain, [...usedWords, word], word);
        solutions = solutions.concat(results);
      }

      return solutions;
    };
    
    const solutions = findSolutions("", [], null);
    
    if (solutions.length > 0) {
      return {
        solution: solutions[0],
        reasoning: `Found a solution with the word chain: ${solutions[0].join(" -> ")}`,
      };
    } else {
      return {
        solution: [],
        reasoning: "No valid word chain could be found to fit the puzzle constraints.",
      };
    }
  };

  const handleFindSolution = async () => {
    const orderedCircles = getSortedCirclesWithIds();
    const words = wordList.split(/\s+/).filter(w => w.length > 1).map(w => w.toUpperCase());

    if (orderedCircles.length === 0 || words.length === 0 || Object.keys(wordConnections).length === 0) {
      toast({
        variant: "destructive",
        title: "Cannot Find Solution",
        description: "Please add markers, a word list, and process the list before finding a solution.",
      });
      return;
    }
    
    setIsSolving(true);
    try {
      const result = solveLocally(clickQueue, circles, words, wordConnections);
      
      if (result.solution.length > 0) {
        let solutionString = "";
        if (result.solution.length > 0) {
          solutionString = result.solution[0];
          for (let i = 1; i < result.solution.length; i++) {
            solutionString += result.solution[i].slice(2);
          }
        }

        const updatedCircles = { ...circles };
        const uniqueOrderedIds = [...new Set(clickQueue)];
        
        clickQueue.forEach((circleId, index) => {
            if(index < solutionString.length) {
                if (updatedCircles[circleId]) {
                    updatedCircles[circleId] = {
                        ...updatedCircles[circleId],
                        char: solutionString[index]
                    };
                }
            }
        });

        setCircles(updatedCircles);

        toast({
            title: "Solution Found!",
            description: result.reasoning,
        });

      } else {
        toast({
            variant: "destructive",
            title: "No Solution Found",
            description: result.reasoning,
        });
      }

    } catch (error) {
      console.error("Failed to find solution:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while trying to find a solution.",
      });
    } finally {
      setIsSolving(false);
    }
  };
  
  const lastClickedId = clickQueue.length > 0 ? clickQueue[clickQueue.length - 1] : null;
  const lastCircleChar = lastClickedId ? circles[lastClickedId]?.char : '';

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 shadow-sm md:px-6">
        <h1 className="text-xl font-semibold font-headline">Word Chain Solver</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2 md:gap-4">
            <Button onClick={handleFindSolution} variant="default" size="sm" disabled={isSolving || !image}>
                <Wand2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isSolving ? "Solving..." : "Find Solution"}</span>
            </Button>
            <Button onClick={handleSaveState} variant="outline" size="sm" disabled={!image}>
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
            </Button>
            <Label htmlFor="load-state-input" className="cursor-pointer">
                <Button asChild variant="outline" size="sm">
                    <div className="flex items-center">
                        <FolderOpen className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Load</span>
                    </div>
                </Button>
            </Label>
            <Input id="load-state-input" type="file" accept=".json" className="hidden" onChange={handleLoadState} ref={loadStateInputRef} />
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                        <BookText className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Word List</h4>
                            <p className="text-sm text-muted-foreground">
                                Enter a list of words, one per line.
                            </p>
                        </div>
                        <Textarea
                            placeholder="Type your words here."
                            className="w-full resize-y bg-background"
                            rows={10}
                            value={wordList}
                            onChange={(e) => setWordList(e.target.value)}
                        />
                         <Button onClick={processWordList} disabled={!wordList.trim()}>Process Word List</Button>
                    </div>
                </PopoverContent>
            </Popover>
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
                <div className="grid gap-2">
                    <Label htmlFor="marker-char">Marker Character</Label>
                    <Input id="marker-char" 
                        maxLength={1}
                        value={lastCircleChar || ''}
                        onChange={handleCharChange}
                        disabled={clickQueue.length === 0}
                        placeholder="Set for last marker"
                    />
                </div>
                <Button onClick={handleUndoClick} variant="outline" size="sm" disabled={clickQueue.length === 0}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Undo
                </Button>
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
              {getSortedCirclesWithIds().map((circle, index) => {
                const clickCount = clickQueue.filter(id => id === circle.id).length;
                return (
                <div
                  key={circle.id}
                  data-circle-id={circle.id}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-primary ring-2 ring-white flex items-center justify-center text-white font-bold",
                    clickCount > 1 ? "bg-accent" : "bg-primary/30"
                  )}
                  style={{
                    left: `${circle.x * 100}%`,
                    top: `${circle.y * 100}%`,
                    width: `${markerSize}px`,
                    height: `${markerSize}px`,
                    fontSize: `${markerSize * 0.6}px`,
                    zIndex: index + 10
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCircleClick(circle.id);
                  }}
                  aria-hidden="true"
                >
                  {circle.char}
                </div>
              )})}
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
