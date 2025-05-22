'use client';

import type { WikiArticle } from '@/lib/types';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
      // Sanitize or process HTML here if needed. For now, direct injection.
      // This is a security risk with arbitrary HTML.
      // A production app should use a sanitizer like DOMPurify.
      currentContentRef.innerHTML = article.htmlContent;

      // Add event listeners to internal links
      const links = currentContentRef.querySelectorAll('a[href^="/wiki/"]');
      links.forEach(link => {
        const anchorElement = link as HTMLAnchorElement;
        const href = anchorElement.getAttribute('href');
        if (href) {
          // Prevent navigation for non-article links (e.g., File, Special, Template)
          if (href.startsWith('/wiki/File:') || href.startsWith('/wiki/Special:') || 
              href.startsWith('/wiki/Help:') || href.startsWith('/wiki/Category:') ||
              href.startsWith('/wiki/Wikipedia:') || href.startsWith('/wiki/Template:')) {
            anchorElement.addEventListener('click', (e) => {
              e.preventDefault();
              // Optionally, open these in a new tab or notify user
              window.open(`https://en.wikipedia.org${href}`, '_blank');
            });
            return;
          }

          anchorElement.addEventListener('click', (e) => {
            e.preventDefault();
            const articleTitle = href.replace('/wiki/', '');
            onNavigate(articleTitle);
          });
        }
      });

      // Make external links open in a new tab
      const externalLinks = currentContentRef.querySelectorAll('a[href^="http"], a[href^="https"]');
      externalLinks.forEach(link => {
        const anchorElement = link as HTMLAnchorElement;
        if (!anchorElement.getAttribute('href')?.startsWith(window.location.origin) && !anchorElement.getAttribute('href')?.startsWith('/wiki/')) {
           anchorElement.setAttribute('target', '_blank');
           anchorElement.setAttribute('rel', 'noopener noreferrer');
        }
      });

    }
    // Cleanup listeners when component unmounts or article changes
    return () => {
      if (currentContentRef) {
        const links = currentContentRef.querySelectorAll('a');
        links.forEach(link => {
          // A more robust way would be to store and remove specific listeners
          // but for this example, replacing innerHTML on change handles cleanup.
        });
      }
    };
  }, [article, onNavigate]);

  if (isLoading) {
    return (
      <Card className="flex-grow overflow-auto">
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
      <Card className="flex-grow overflow-auto">
        <CardHeader>
          <CardTitle>{article?.displayTitle || 'Article Error'}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6">
          <div ref={contentRef} dangerouslySetInnerHTML={{ __html: article?.htmlContent || '<p>No article loaded or an error occurred.</p>' }} />
        </CardContent>
      </Card>
    );
  }
  
  // This div will host the potentially unsafe HTML.
  // It should be styled to look like a Wikipedia page.
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
          // Ensure that you have proper sanitization if content can be arbitrary HTML
          // dangerouslySetInnerHTML={{ __html: article.htmlContent || '' }}
        />
      </CardContent>
    </Card>
  );
}
