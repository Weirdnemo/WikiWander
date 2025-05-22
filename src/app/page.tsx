
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, WikiArticle, WikipediaArticleSummary } from '@/lib/types';
import { fetchRandomArticleSummary, fetchArticleContent, fetchArticleSummary, searchArticles } from '@/lib/wikipedia';
import { getHint } from '@/ai/flows/get-hint';
import { ArticleDisplay } from '@/components/article-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTimer, formatTime } from '@/hooks/use-timer';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AlertTriangle, CheckCircle2, Dices, Flag, Lightbulb, Loader2, Play, RotateCcw, Target, History, Info, Search } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';


const initialGameState: GameState = {
  startArticle: null,
  targetArticle: null,
  currentArticle: null,
  history: [],
  clicks: 0,
  elapsedTime: 0,
  isGameActive: false,
  isGameWon: false,
  isLoading: false,
  isLoadingHint: false,
  hint: null,
  errorMessage: null,
};

const DEBOUNCE_DELAY = 300;

export default function WikiWanderPage() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [startInput, setStartInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const { toast } = useToast();
  const { elapsedTime, resetTimer, startTimer, stopTimer } = useTimer(gameState.isGameActive);

  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [targetSuggestions, setTargetSuggestions] = useState<string[]>([]);
  const [isLoadingStartSuggestions, setIsLoadingStartSuggestions] = useState(false);
  const [isLoadingTargetSuggestions, setIsLoadingTargetSuggestions] = useState(false);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showTargetSuggestions, setShowTargetSuggestions] = useState(false);

  const startInputRef = useRef<HTMLDivElement>(null);
  const targetInputRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (gameState.isGameActive) {
      setGameState(prev => ({ ...prev, elapsedTime }));
    }
  }, [elapsedTime, gameState.isGameActive]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (startInputRef.current && !startInputRef.current.contains(event.target as Node)) {
        setShowStartSuggestions(false);
      }
      if (targetInputRef.current && !targetInputRef.current.contains(event.target as Node)) {
        setShowTargetSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const handleSetArticle = async (type: 'start' | 'target', title?: string) => {
    setGameState(prev => ({ ...prev, isLoading: true, errorMessage: null }));
    setShowStartSuggestions(false);
    setShowTargetSuggestions(false);
    let summary: WikipediaArticleSummary | null = null;

    if (title) {
      summary = await fetchArticleSummary(title);
      if (!summary) {
        toast({ title: "Error", description: `Could not find article: ${title}`, variant: "destructive" });
        setGameState(prev => ({ ...prev, isLoading: false, errorMessage: `Article "${title}" not found.` }));
        if (type === 'start') setStartInput(title); else setTargetInput(title);
        return;
      }
    } else {
      summary = await fetchRandomArticleSummary();
      if (!summary) {
        toast({ title: "Error", description: "Could not fetch random article.", variant: "destructive" });
        setGameState(prev => ({ ...prev, isLoading: false, errorMessage: "Failed to fetch random article." }));
        return;
      }
    }
    
    const article: WikiArticle = {
      title: summary.titles.normalized,
      displayTitle: summary.titles.normalized, 
      summary: summary.description || summary.extract?.substring(0, 150) + '...',
    };

    if (type === 'start') {
      setGameState(prev => ({ ...prev, startArticle: article, isLoading: false }));
      setStartInput(article.displayTitle);
    } else {
      setGameState(prev => ({ ...prev, targetArticle: article, isLoading: false }));
      setTargetInput(article.displayTitle);
    }
  };

  const debouncedSearch = useCallback(
    (searchType: 'start' | 'target', searchTerm: string) => {
      if (!searchTerm.trim()) {
        if (searchType === 'start') setStartSuggestions([]); else setTargetSuggestions([]);
        if (searchType === 'start') setShowStartSuggestions(false); else setShowTargetSuggestions(false);
        return;
      }

      if (searchType === 'start') setIsLoadingStartSuggestions(true); else setIsLoadingTargetSuggestions(true);

      searchArticles(searchTerm).then(suggestions => {
        if (searchType === 'start') {
          setStartSuggestions(suggestions);
          setIsLoadingStartSuggestions(false);
          setShowStartSuggestions(true);
        } else {
          setTargetSuggestions(suggestions);
          setIsLoadingTargetSuggestions(false);
          setShowTargetSuggestions(true);
        }
      }).catch(() => {
         if (searchType === 'start') setIsLoadingStartSuggestions(false); else setIsLoadingTargetSuggestions(false);
      });
    },
    [] 
  );

  const handleInputChange = (type: 'start' | 'target', value: string) => {
    if (type === 'start') {
      setStartInput(value);
      if (value.length > 2) { 
        const timerId = setTimeout(() => debouncedSearch('start', value), DEBOUNCE_DELAY);
        return () => clearTimeout(timerId);
      } else {
        setStartSuggestions([]);
        setShowStartSuggestions(false);
      }
    } else {
      setTargetInput(value);
       if (value.length > 2) {
        const timerId = setTimeout(() => debouncedSearch('target', value), DEBOUNCE_DELAY);
        return () => clearTimeout(timerId);
      } else {
        setTargetSuggestions([]);
        setShowTargetSuggestions(false);
      }
    }
  };
  
  const handleSuggestionClick = (type: 'start' | 'target', title: string) => {
    if (type === 'start') {
      setStartInput(title);
      setShowStartSuggestions(false);
      handleSetArticle('start', title);
    } else {
      setTargetInput(title);
      setShowTargetSuggestions(false);
      handleSetArticle('target', title);
    }
  };


  const startGame = async () => {
    if (!gameState.startArticle || !gameState.targetArticle) {
      toast({ title: "Setup Incomplete", description: "Please select both start and target articles.", variant: "destructive" });
      return;
    }
    if (gameState.startArticle.title === gameState.targetArticle.title) {
      toast({ title: "Same Articles", description: "Start and target articles cannot be the same.", variant: "destructive" });
      return;
    }

    setGameState(prev => ({ ...prev, isLoading: true, errorMessage: null }));
    const content = await fetchArticleContent(gameState.startArticle.title);
    
    resetTimer();
    setGameState(prev => ({
      ...prev,
      currentArticle: content,
      history: [content],
      clicks: 0,
      isGameActive: true,
      isGameWon: false,
      isLoading: false,
      hint: null,
    }));
    startTimer();
  };

  const handleNavigate = useCallback(async (newTitle: string) => {
    if (!gameState.isGameActive || gameState.isLoading) return;

    setGameState(prev => ({ ...prev, isLoading: true, hint: null, errorMessage: null }));
    const newArticleContent = await fetchArticleContent(newTitle);

    if (newArticleContent.isError) {
        toast({ title: "Navigation Error", description: `Could not load article: ${newArticleContent.displayTitle}`, variant: "destructive" });
        setGameState(prev => ({ ...prev, isLoading: false, errorMessage: `Failed to load ${newArticleContent.displayTitle}. You might be stuck.` }));
        return;
    }

    const newClicks = gameState.clicks + 1;
    const newHistory = [...gameState.history, newArticleContent];

    setGameState(prev => ({
      ...prev,
      currentArticle: newArticleContent,
      clicks: newClicks,
      history: newHistory,
      isLoading: false,
    }));

    if (newArticleContent.title === gameState.targetArticle?.title) {
      stopTimer();
      setGameState(prev => ({ ...prev, isGameWon: true, isGameActive: false }));
      toast({
        title: "Congratulations!",
        description: `You reached ${gameState.targetArticle?.displayTitle} in ${newClicks} clicks and ${formatTime(elapsedTime)}.`,
        duration: 10000,
      });
    }
  }, [gameState.isGameActive, gameState.isLoading, gameState.clicks, gameState.targetArticle?.title, gameState.history, stopTimer, elapsedTime, toast, formatTime]);

  const requestHint = async () => {
    if (!gameState.currentArticle || !gameState.targetArticle || gameState.isLoadingHint) return;
    setGameState(prev => ({ ...prev, isLoadingHint: true, hint: null, errorMessage: null }));
    try {
      const hintResult = await getHint({
        currentArticleTitle: gameState.currentArticle.displayTitle,
        targetArticleTitle: gameState.targetArticle.displayTitle,
      });
      setGameState(prev => ({ ...prev, hint: hintResult.hint, isLoadingHint: false }));
      toast({ title: "Hint Unlocked!", description: hintResult.hint });
    } catch (error) {
      console.error("Error getting hint:", error);
      toast({ title: "Hint Error", description: "Could not generate a hint at this time.", variant: "destructive" });
      setGameState(prev => ({ ...prev, isLoadingHint: false, errorMessage: "Failed to get hint." }));
    }
  };

  const restartGame = () => {
    stopTimer();
    setGameState(initialGameState);
    setStartInput('');
    setTargetInput('');
    setStartSuggestions([]);
    setTargetSuggestions([]);
    resetTimer();
  };
  
  const surrenderGame = () => {
    stopTimer();
    setGameState(prev => ({ ...prev, isGameActive: false }));
    toast({
        title: "Game Over",
        description: `You surrendered. The target was ${gameState.targetArticle?.displayTitle}.`,
        variant: "destructive"
    });
  };

  const renderSuggestions = (type: 'start' | 'target') => {
    const suggestions = type === 'start' ? startSuggestions : targetSuggestions;
    const isLoading = type === 'start' ? isLoadingStartSuggestions : isLoadingTargetSuggestions;
    const show = type === 'start' ? showStartSuggestions : showTargetSuggestions;

    if (!show || (!isLoading && suggestions.length === 0 && (type === 'start' ? startInput.length : targetInput.length) <=2)) return null;


    return (
      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((title) => (
            <div
              key={title}
              className="p-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onClick={() => handleSuggestionClick(type, title)}
            >
              {title}
            </div>
          ))
        ) : (
          (type === 'start' ? startInput.length : targetInput.length) > 2 && <div className="p-2 text-sm text-muted-foreground">No suggestions found.</div>
        )}
      </div>
    );
  };

  const renderGameSetup = () => (
    <Card className="shadow-xl rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Game Setup</CardTitle>
        <CardDescription>Choose your start and target Wikipedia articles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2" ref={startInputRef}>
          <Label htmlFor="start-article">Start Article</Label>
          <div className="relative">
            <Input
              id="start-article"
              placeholder="Enter start article or get random"
              value={startInput}
              onChange={(e) => handleInputChange('start', e.target.value)}
              onFocus={() => startInput.length > 2 && setShowStartSuggestions(true)}
              disabled={gameState.isLoading}
              className="w-full"
            />
            {renderSuggestions('start')}
          </div>
          <Button variant="secondary" onClick={() => handleSetArticle('start')} disabled={gameState.isLoading} className="w-full mt-2">
            <Dices className="mr-2 h-4 w-4" /> Random Start Article
          </Button>
          {gameState.startArticle && <p className="text-sm text-muted-foreground mt-1">Selected: {gameState.startArticle.displayTitle}</p>}
        </div>
        
        <div className="space-y-2" ref={targetInputRef}>
          <Label htmlFor="target-article">Target Article</Label>
           <div className="relative">
            <Input
              id="target-article"
              placeholder="Enter target article or get random"
              value={targetInput}
              onChange={(e) => handleInputChange('target', e.target.value)}
              onFocus={() => targetInput.length > 2 && setShowTargetSuggestions(true)}
              disabled={gameState.isLoading}
              className="w-full"
            />
            {renderSuggestions('target')}
          </div>
          <Button variant="secondary" onClick={() => handleSetArticle('target')} disabled={gameState.isLoading} className="w-full mt-2">
            <Dices className="mr-2 h-4 w-4" /> Random Target Article
          </Button>
          {gameState.targetArticle && <p className="text-sm text-muted-foreground mt-1">Selected: {gameState.targetArticle.displayTitle}</p>}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          onClick={startGame}
          disabled={!gameState.startArticle || !gameState.targetArticle || gameState.isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {gameState.isLoading && (!gameState.isGameActive && !gameState.isGameWon) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
          Start Wander
        </Button>
      </CardFooter>
    </Card>
  );

  const renderGamePlayControls = () => (
    <div className="grid grid-cols-2 gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={restartGame} aria-label="Restart Game">
              <RotateCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Restart Game</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
             <Button variant="outline" onClick={surrenderGame} aria-label="Surrender Game">
              <Flag />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Surrender Game</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              onClick={requestHint} 
              disabled={gameState.isLoadingHint || !gameState.currentArticle || !gameState.targetArticle || gameState.currentArticle.title === gameState.targetArticle.title || gameState.clicks === 0}
              className="col-span-2"
              aria-label="Get Hint"
            >
              {gameState.isLoadingHint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              Get Hint
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Get an AI-powered hint</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
  
  const renderGameStats = () => (
    <Card className="shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl">Game Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="font-medium text-muted-foreground">Current:</span>
          <span className="truncate font-semibold" title={gameState.currentArticle?.displayTitle}>{gameState.currentArticle?.displayTitle || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-muted-foreground">Target:</span>
          <span className="truncate font-semibold text-primary" title={gameState.targetArticle?.displayTitle}>{gameState.targetArticle?.displayTitle || 'N/A'}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-center">
          <span className="font-medium text-muted-foreground">Clicks:</span>
          <span className="font-semibold text-accent">{gameState.clicks}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-muted-foreground">Time:</span>
          <span className="font-semibold text-accent">{formatTime(gameState.elapsedTime)}</span>
        </div>
        {gameState.hint && (
          <Card className="mt-2 bg-secondary/50 p-3 border border-border rounded-md">
            <CardDescription className="text-xs text-secondary-foreground">
              <Info size={14} className="inline mr-1"/> {gameState.hint}
            </CardDescription>
          </Card>
        )}
         {gameState.errorMessage && (
          <Card className="mt-2 bg-destructive/10 border-destructive p-3 rounded-md">
            <CardDescription className="text-xs text-destructive">
               <AlertTriangle size={14} className="inline mr-1"/> {gameState.errorMessage}
            </CardDescription>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  const renderHistory = () => (
    <Card className="shadow-md mt-4 rounded-lg">
        <CardHeader>
            <CardTitle className="text-xl flex items-center"><History className="mr-2" /> Navigation History</CardTitle>
        </CardHeader>
        <CardContent>
            {gameState.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No articles visited yet.</p>
            ) : (
                <ScrollArea className="h-[150px] pr-3">
                    <ul className="space-y-1 list-decimal list-inside">
                        {gameState.history.map((article, index) => (
                            <li key={`${article.title}-${index}`} className="text-sm truncate text-muted-foreground">
                                <span className={cn(index === gameState.history.length - 1 ? 'font-semibold text-foreground' : '', 'hover:text-primary cursor-pointer')}
                                      title={article.displayTitle}
                                      onClick={() => {
                                        // Future: Allow navigating back in history
                                      }}>
                                    {article.displayTitle}
                                </span>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            )}
        </CardContent>
    </Card>
  );


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <Sidebar side="left" variant="sidebar" collapsible="icon" className="shadow-xl border-r-0">
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-semibold">WikiWander</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4 space-y-6 flex-grow">
            <ScrollArea className="h-full pr-2">
              {!gameState.isGameActive && !gameState.isGameWon ? renderGameSetup() : null}
              {(gameState.isGameActive || gameState.isGameWon) && (
                <>
                  {renderGameStats()}
                  {renderHistory()}
                  {!gameState.isGameWon && gameState.isGameActive && (
                    <div className="mt-6 sticky bottom-0 py-2 bg-sidebar rounded-md">
                        {renderGamePlayControls()}
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} WikiWander. Powered by Wikipedia.</p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="flex flex-col h-screen p-2 md:p-4">
            <div className="md:hidden p-2 border-b mb-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-semibold">WikiWander</h1>
                </div>
                <SidebarTrigger />
            </div>
            
            {gameState.isGameWon ? (
              <div className="flex-grow flex items-center justify-center">
                <Card className="bg-primary/5 border-primary/50 shadow-xl rounded-xl w-full max-w-md">
                  <CardHeader className="items-center text-center">
                    <CheckCircle2 className="h-16 w-16 text-primary mb-2" />
                    <CardTitle className="text-3xl text-primary">You Won!</CardTitle>
                    <CardDescription className="text-foreground/80">
                      You successfully navigated from <span className="font-semibold">{gameState.startArticle?.displayTitle}</span> to <span className="font-semibold">{gameState.targetArticle?.displayTitle}</span>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p>Clicks: <span className='font-semibold text-accent'>{gameState.clicks}</span></p>
                    <p>Time: <span className='font-semibold text-accent'>{formatTime(gameState.elapsedTime)}</span></p>
                  </CardContent>
                  <CardFooter className="flex justify-center">
                    <Button onClick={restartGame} size="lg">
                      <RotateCcw className="mr-2 h-5 w-5" /> Play Again
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ) : (!gameState.isGameActive && !gameState.isGameWon && !gameState.isLoading) ? (
                 <Card className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-card shadow-xl rounded-xl">
                    <CardHeader>
                        <Target size={64} className="mx-auto text-primary mb-4" />
                        <CardTitle className="text-3xl mb-2">Welcome to WikiWander!</CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">
                            Your goal is to navigate from a starting Wikipedia article to a target article using only internal links.
                            <br />Use the sidebar to set up your game and start your journey.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Good luck, and happy wandering!</p>
                    </CardContent>
                </Card>
            ) : gameState.isLoading && !gameState.currentArticle && !gameState.isGameActive ? (
                <div className="flex-grow flex flex-col items-center justify-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading game...</p>
                </div>
            ) : (gameState.isGameActive || (gameState.isLoading && gameState.currentArticle)) && !gameState.isGameWon ? (
              <ArticleDisplay
                article={gameState.currentArticle}
                isLoading={gameState.isLoading && !gameState.currentArticle?.htmlContent} 
                onNavigate={handleNavigate}
              />
            ) : null}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
