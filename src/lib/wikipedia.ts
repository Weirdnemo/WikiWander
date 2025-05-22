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
        return data; // Return original if retry fails or is not standard
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
    // Use the parse API for HTML content
    // formatversion=2 provides a simpler JSON structure for 'text'
    const params = new URLSearchParams({
      action: 'parse',
      page: title,
      prop: 'text',
      format: 'json',
      formatversion: '2', // Ensures text is directly under parse.text
      origin: '*', // Required for CORS
    });
    const response = await fetch(`${WIKIPEDIA_PARSE_API_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch article content for "${title}": ${response.statusText}`);
    }
    const data: WikipediaArticleParseResult = await response.json();
    if (data.parse && data.parse.text) {
      return {
        title: data.parse.title, // Normalized title from API
        displayTitle: data.parse.title, // Use API title for display
        htmlContent: data.parse.text,
      };
    } else if (data.parse && (data.parse as any).error) { // Check for API-level errors
        throw new Error(`API error for "${title}": ${(data.parse as any).error.info}`);
    }
     else {
      // Handle cases where the page might be a redirect or missing
      // For simplicity, we'll treat it as content not found
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
      // If 404, it could be a page that doesn't exist or a redirect the summary API doesn't handle well.
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
