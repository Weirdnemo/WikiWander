
import type { WikipediaArticleSummary, WikipediaArticleParseResult, WikiArticle } from './types';

const WIKIPEDIA_API_BASE_URL = 'https://en.wikipedia.org/api/rest_v1';
const WIKIPEDIA_PARSE_API_URL = 'https://en.wikipedia.org/w/api.php';

// Fetches a summary for a random Wikipedia article
export async function fetchRandomArticleSummary(): Promise<WikipediaArticleSummary | null> {
  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE_URL}/page/random/summary`);
    if (!response.ok) {
      console.error('Failed to fetch random article summary:', response.statusText);
      return null;
    }
    const data: WikipediaArticleSummary = await response.json();
    // Attempt to get a standard article, retry once if not.
    if (data.type !== "standard") {
        const retryResponse = await fetch(`${WIKIPEDIA_API_BASE_URL}/page/random/summary`);
        if (retryResponse.ok) {
            const retryData: WikipediaArticleSummary = await retryResponse.json();
            if (retryData.type === "standard") return retryData;
        }
        // Fallback to the original if retry fails or is not standard,
        // but prefer standard articles if possible to avoid issues with special pages.
        if (data.type !== "standard") {
          console.warn("Fetched a non-standard random article:", data.title);
        }
        return data; 
    }
    return data;
  } catch (error) {
    console.error('Error fetching random article summary:', error);
    return null;
  }
}

// Fetches the HTML content of a Wikipedia article
export async function fetchArticleContent(title: string): Promise<WikiArticle> {
  try {
    const params = new URLSearchParams({
      action: 'parse',
      page: title,
      prop: 'text',
      format: 'json',
      formatversion: '2', 
      origin: '*', 
    });
    const response = await fetch(`${WIKIPEDIA_PARSE_API_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch article content for "${title}": ${response.statusText}`);
    }
    const data: WikipediaArticleParseResult = await response.json();
    if (data.parse && data.parse.text) {
      return {
        title: data.parse.title, 
        displayTitle: data.parse.title, 
        htmlContent: data.parse.text,
      };
    } else if (data.parse && (data.parse as any).error) { 
        throw new Error(`API error for "${title}": ${(data.parse as any).error.info}`);
    }
     else {
      const summaryResponse = await fetch(`${WIKIPEDIA_API_BASE_URL}/page/summary/${encodeURIComponent(title)}`);
      if (summaryResponse.ok) {
        const summaryData: WikipediaArticleSummary = await summaryResponse.json();
        return {
          title: summaryData.titles.normalized,
          displayTitle: summaryData.titles.display,
          htmlContent: `<p>Article content could not be loaded. This might be a redirect or a special page. <a href="${summaryData.content_urls.desktop.page}" target="_blank" rel="noopener noreferrer">View on Wikipedia</a></p>`,
          summary: summaryData.description || summaryData.extract,
        };
      }
      throw new Error(`Article content not found for "${title}" and summary also failed.`);
    }
  } catch (error) {
    console.error(`Error fetching article content for "${title}":`, error);
    return {
      title: title,
      displayTitle: title,
      htmlContent: `<p>Error loading article: ${error instanceof Error ? error.message : String(error)}. Please try refreshing or selecting a different article.</p>`,
      isError: true,
    };
  }
}

// Fetches summary for a specific article, useful for validating custom input
export async function fetchArticleSummary(title: string): Promise<WikipediaArticleSummary | null> {
  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE_URL}/page/summary/${encodeURIComponent(title)}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Summary for "${title}" not found (404). It may not exist or is a redirect issue.`);
        return null;
      }
      console.error(`Failed to fetch article summary for "${title}": ${response.statusText}`);
      return null;
    }
    const data: WikipediaArticleSummary = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching article summary for "${title}":`, error);
    return null;
  }
}

// Searches for articles based on a search term
export async function searchArticles(searchTerm: string): Promise<string[]> {
  if (!searchTerm.trim()) {
    return [];
  }
  try {
    const params = new URLSearchParams({
      action: 'opensearch',
      search: searchTerm,
      limit: '5', // Limit to 5 suggestions
      namespace: '0', // Search only in the main namespace (articles)
      format: 'json',
      origin: '*',
    });
    const response = await fetch(`${WIKIPEDIA_PARSE_API_URL}?${params.toString()}`);
    if (!response.ok) {
      console.error('Failed to search articles:', response.statusText);
      return [];
    }
    const data = await response.json();
    // The opensearch API returns an array: [searchTerm, [titles], [descriptions], [urls]]
    // We are interested in the titles array (index 1)
    return data[1] || [];
  } catch (error) {
    console.error('Error searching articles:', error);
    return [];
  }
}
