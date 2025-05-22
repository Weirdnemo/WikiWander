
export interface WikipediaArticleSummary {
  type: string;
  title: string;
  displaytitle: string;
  namespace: {
    id: number;
    text: string;
  };
  wikibase_item: string;
  titles: {
    canonical: string;
    normalized: string;
    display: string;
  };
  pageid: number;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source:string;
    width: number;
    height: number;
  };
  lang: string;
  dir: string;
  revision: string;
  tid: string;
  timestamp: string;
  description?: string;
  description_source?: string;
  content_urls: {
    desktop: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
    mobile: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
  };
  extract: string;
  extract_html: string;
}

export interface WikipediaArticleParseResult {
  parse: {
    title: string;
    pageid: number;
    text: string; // This contains the HTML content
  };
}

export interface WikiArticle {
  title: string; // Normalized title used for API calls
  displayTitle: string; // Title for display
  htmlContent?: string;
  summary?: string; // Short description
  isError?: boolean; // True if this represents an error page or failed fetch
}

export interface GameState {
  startArticle: WikiArticle | null;
  targetArticle: WikiArticle | null;
  currentArticle: WikiArticle | null;
  history: WikiArticle[]; // History of visited articles
  clicks: number;
  elapsedTime: number; // in seconds
  isGameActive: boolean;
  isGameWon: boolean;
  isLoading: boolean; // General loading state for articles/setup
  isLoadingHint: boolean;
  hint: string | null;
  errorMessage: string | null;
}
