
'use client';

import type { WikiArticle } from '@/lib/types';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ArticleDisplayProps {
  article: WikiArticle | null;
  isLoading: boolean;
  onNavigate: (articleTitle: string) => void;
}

export function ArticleDisplay({ article, isLoading, onNavigate }: ArticleDisplayProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (currentContentRef && article?.htmlContent) {
      currentContentRef.innerHTML = article.htmlContent;

      const links = currentContentRef.querySelectorAll('a');
      links.forEach(link => {
        const anchorElement = link as HTMLAnchorElement;
        const href = anchorElement.getAttribute('href');

        if (href) {
          if (href.startsWith('/wiki/')) {
            // Prevent navigation for non-article links (e.g., File, Special, Template, Category, Help, Wikipedia:)
            // These will still be styled as external-like links or muted links based on globals.css
            if (href.startsWith('/wiki/File:') || 
                href.startsWith('/wiki/Special:') || 
                href.startsWith('/wiki/Help:') || 
                href.startsWith('/wiki/Category:') ||
                href.startsWith('/wiki/Wikipedia:') || 
                href.startsWith('/wiki/Template:')) {
              anchorElement.classList.add('non-article-wiki-link');
              anchorElement.setAttribute('target', '_blank');
              anchorElement.setAttribute('rel', 'noopener noreferrer');
              anchorElement.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any SPA-like behavior
                window.open(`https://en.wikipedia.org${href}`, '_blank');
              });
            } else {
              // This is an internal, navigable article link
              anchorElement.classList.add('internal-wiki-link');
              anchorElement.addEventListener('click', (e) => {
                e.preventDefault();
                const articleTitle = decodeURIComponent(href.replace('/wiki/', ''));
                onNavigate(articleTitle);
              });
            }
          } else if (href.startsWith('http://') || href.startsWith('https://')) {
            // External links
             if (!anchorElement.getAttribute('href')?.startsWith(window.location.origin)) {
                 anchorElement.setAttribute('target', '_blank');
                 anchorElement.setAttribute('rel', 'noopener noreferrer');
                 anchorElement.classList.add('external-wiki-link');
             }
          } else if (href.startsWith('#')) {
            // Anchor links / citations
            anchorElement.classList.add('citation-wiki-link');
            // Allow default behavior for anchor links (scrolling within page)
            // Or, if they need to be specially handled:
            // anchorElement.addEventListener('click', (e) => {
            //   e.preventDefault();
            //   // custom scroll or no-op
            // });
          }
        }
      });
    }
  }, [article, onNavigate]);

  if (isLoading) {
    return (
      <Card className="flex-grow overflow-auto h-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!article || article.isError) {
    return (
      <Card className="flex-grow overflow-auto h-full">
        <CardHeader>
          <CardTitle>{article?.displayTitle || 'Article Error'}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6">
          <div dangerouslySetInnerHTML={{ __html: article?.htmlContent || '<p>No article loaded or an error occurred.</p>' }} />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="flex-grow overflow-auto h-full">
      <CardHeader>
        <CardTitle>{article.displayTitle}</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6">
        <div 
          ref={contentRef} 
          className="wikipedia-content" 
          data-ai-hint="wikipedia article"
        />
      </CardContent>
    </Card>
  );
}
