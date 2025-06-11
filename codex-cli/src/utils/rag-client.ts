import { log } from "./logger/log.js";

export interface RAGDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export interface RAGSearchResponse {
  documents: RAGDocument[];
  query: string;
  total_results: number;
}

export interface RAGSearchRequest {
  query: string;
  top_k?: number;
  threshold?: number;
}

export interface RAGClientConfig {
  baseUrl: string;
  enabled: boolean;
  topK: number;
  threshold: number;
  retryCount: number;
  retryDelay: number;
  timeout: number;
}

export class RAGClient {
  private config: RAGClientConfig;

  constructor(config: Partial<RAGClientConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.RAG_BASE_URL || "http://localhost:8000",
      enabled: config.enabled ?? true,
      topK: config.topK || 5,
      threshold: config.threshold || 0.8, // 80% relevance minimum
      retryCount: config.retryCount || 2,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 10000
    };
  }

  /**
   * Search for relevant documents using the RAG API
   */
  async search(query: string, options: Partial<RAGSearchRequest> = {}): Promise<RAGSearchResponse | null> {
    if (!this.config.enabled) {
      log("RAG client disabled, skipping search");
      return null;
    }

    const searchRequest: RAGSearchRequest = {
      query,
      top_k: options.top_k || this.config.topK,
      threshold: options.threshold || this.config.threshold
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(searchRequest),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`RAG API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate response structure
        if (!this.isValidRAGResponse(data)) {
          throw new Error("Invalid RAG API response format");
        }

        // Filter documents by threshold
        const filteredDocuments = data.documents.filter(
          (doc: RAGDocument) => doc.score >= this.config.threshold
        );

        log(`RAG search successful: ${filteredDocuments.length}/${data.documents.length} documents above threshold`);

        return {
          ...data,
          documents: filteredDocuments
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryCount) {
          log(`RAG search attempt ${attempt + 1} failed: ${lastError.message}, retrying in ${this.config.retryDelay}ms`);
          await this.delay(this.config.retryDelay);
        } else {
          log(`RAG search failed after ${this.config.retryCount + 1} attempts: ${lastError.message}`);
        }
      }
    }

    return null;
  }

  /**
   * Check if RAG API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      log(`RAG health check failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Format documents for inclusion in LLM context
   */
  formatDocumentsForContext(documents: RAGDocument[]): string {
    if (documents.length === 0) {
      return "";
    }

    let context = "# Retrieved Context Documents\n\n";
    context += `The following ${documents.length} document(s) were retrieved from the knowledge base:\n\n`;
    
    documents.forEach((doc, index) => {
      context += `## Document ${index + 1} (Relevance: ${(doc.score * 100).toFixed(1)}%)\n`;
      
      // Add metadata if available
      if (doc.metadata && Object.keys(doc.metadata).length > 0) {
        const metadataStr = Object.entries(doc.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        context += `**Metadata:** ${metadataStr}\n`;
      }
      
      context += `**Content:**\n${doc.content}\n\n`;
      
      if (index < documents.length - 1) {
        context += "---\n\n";
      }
    });
    
    return context;
  }

  /**
   * Enhanced user message with RAG context
   */
  async enhanceMessage(userMessage: string): Promise<string> {
    const searchResults = await this.search(userMessage);
    
    if (!searchResults || searchResults.documents.length === 0) {
      return userMessage;
    }

    const contextSection = this.formatDocumentsForContext(searchResults.documents);
    
    return `${contextSection}\n---\n\n# User Query\n${userMessage}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): RAGClientConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RAGClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private isValidRAGResponse(data: any): data is RAGSearchResponse {
    return (
      data &&
      typeof data === "object" &&
      Array.isArray(data.documents) &&
      typeof data.query === "string" &&
      typeof data.total_results === "number"
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const ragClient = new RAGClient();