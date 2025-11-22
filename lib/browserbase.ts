import { Browserbase } from "@browserbasehq/sdk";
import puppeteer, { type Browser, type Page, type HTTPRequest, type HTTPResponse } from "puppeteer-core";

interface NetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: number;
  resourceType?: string;
  frameId?: string;
  requestId?: string;
  isNavigationRequest?: boolean;
}

interface NetworkResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: number;
  body?: string;
  fromCache?: boolean;
  fromServiceWorker?: boolean;
  mimeType?: string;
  requestId?: string;
}

interface NetworkFailed {
  url: string;
  failureText?: string;
  timestamp: number;
  requestId?: string;
}

interface SessionInfo {
  sessionId: string;
  requestCount: number;
  createdAt: Date;
  browser: Browser | null;
  page: Page | null;
}

export class SimpleBrowserbaseService {
  private bb: Browserbase;
  private currentSession: SessionInfo | null = null;
  private maxRequestsPerSession = 50;

  constructor() {
    if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
      throw new Error("BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are required");
    }

    this.bb = new Browserbase({ 
      apiKey: process.env.BROWSERBASE_API_KEY 
    });
  }

  private async createSession(): Promise<SessionInfo> {
    try {
      const session = await this.bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        proxies: [{
          type: "browserbase",
          geolocation: {
            country: "CO",
            city: "BOGOTA",
          },
        }],
        browserSettings: {
          viewport: { width: 1920, height: 1080 },
        },
      });

      const browser = await puppeteer.connect({
        browserWSEndpoint: session.connectUrl,
      });

      const page = await browser.newPage();

      const sessionInfo: SessionInfo = {
        sessionId: session.id,
        requestCount: 0,
        createdAt: new Date(),
        browser,
        page,
      };

      console.log(`Created Browserbase session: ${session.id}`);
      return sessionInfo;
    } catch (error) {
      console.error("Failed to create session:", error);
      throw new Error("Failed to create Browserbase session");
    }
  }

  private async getOrCreateSession(): Promise<SessionInfo> {
    if (
      !this.currentSession ||
      this.currentSession.requestCount >= this.maxRequestsPerSession
    ) {
      if (this.currentSession) {
        await this.closeSession();
      }
      this.currentSession = await this.createSession();
    }
    return this.currentSession;
  }

  async makeRequest(
    url: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      headers?: Record<string, string>;
      body?: string;
      waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
    } = {}
  ): Promise<{
    status: number;
    data: any;
    headers: Record<string, string>;
    dom: string;
    networkRequests: NetworkRequest[];
    networkResponses: NetworkResponse[];
    networkFailed: NetworkFailed[];
  }> {
    const session = await this.getOrCreateSession();
    session.requestCount++;

    if (!session.page) {
      throw new Error("Browser page not initialized");
    }

    const networkRequests: NetworkRequest[] = [];
    const networkResponses: NetworkResponse[] = [];
    const networkFailed: NetworkFailed[] = [];

    const requestHandler = (request: HTTPRequest) => {
      const requestHeaders = request.headers();
      const headers: Record<string, string> = {};
      Object.entries(requestHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });

      const frame = request.frame();
      const resourceType = request.resourceType();

      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers,
        postData: request.postData(),
        timestamp: Date.now(),
        resourceType: resourceType,
        frameId: frame?.url(),
        requestId: (request as any)._requestId || undefined,
        isNavigationRequest: request.isNavigationRequest(),
      });
    };

    const responseHandler = async (response: HTTPResponse) => {
      const responseHeaders = response.headers();
      const headers: Record<string, string> = {};
      Object.entries(responseHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });

      const request = response.request();
      const contentType = headers["content-type"] || "";

      let body: string | undefined;
      try {
        if (
          contentType.includes("application/json") ||
          contentType.includes("text/") ||
          contentType.includes("application/xml") ||
          contentType.includes("application/javascript") ||
          contentType.includes("application/x-javascript")
        ) {
          body = await response.text();
        } else if (contentType.includes("application/octet-stream") === false) {
          try {
            body = await response.text();
            if (body.length > 1000000) {
              body = `[Body too large: ${body.length} bytes, truncated]`;
            }
          } catch (e) {
            body = `[Could not read body: ${e instanceof Error ? e.message : "Unknown error"}]`;
          }
        }
      } catch (error) {
        body = `[Error reading body: ${error instanceof Error ? error.message : "Unknown error"}]`;
      }

      networkResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers,
        timestamp: Date.now(),
        body,
        fromCache: response.fromCache(),
        fromServiceWorker: response.fromServiceWorker(),
        mimeType: response.headers()["content-type"] || undefined,
        requestId: (request as any)._requestId || undefined,
      });
    };

    const requestFailedHandler = (request: HTTPRequest) => {
      networkFailed.push({
        url: request.url(),
        failureText: request.failure()?.errorText || "Unknown failure",
        timestamp: Date.now(),
        requestId: (request as any)._requestId || undefined,
      });
    };

    session.page.on("request", requestHandler);
    session.page.on("response", responseHandler);
    session.page.on("requestfailed", requestFailedHandler);

    const defaultHeaders = {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Origin: new URL(url).origin,
      Referer: new URL(url).origin + "/",
      DNT: "1",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    };

    const headers = { ...defaultHeaders, ...options.headers };

    const delay = Math.random() * 700 + 800;
    await new Promise((resolve) => setTimeout(resolve, delay));

    console.log(`Making request (${session.requestCount}/${this.maxRequestsPerSession})`);

    try {
      await session.page.setExtraHTTPHeaders(headers);

      const response = await session.page.goto(url, {
        waitUntil: options.waitUntil || "networkidle2",
        timeout: 60000,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (!response) {
        throw new Error("No response from page");
      }

      const status = response.status();
      const responseHeaders = response.headers();
      const contentType = responseHeaders["content-type"] || "";

      const dom = await session.page.content();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      session.page.off("request", requestHandler);
      session.page.off("response", responseHandler);
      session.page.off("requestfailed", requestFailedHandler);

      let data: any;
      if (contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = await response.text();
        }
      } else {
        data = await response.text();
      }

      console.log(`Captured ${networkRequests.length} requests, ${networkResponses.length} responses, ${networkFailed.length} failed`);

      if (session.requestCount >= this.maxRequestsPerSession) {
        console.log("Session limit reached, will rotate on next request");
        await this.closeSession();
      }

      return {
        status,
        data,
        headers: responseHeaders,
        dom,
        networkRequests,
        networkResponses,
        networkFailed,
      };
    } catch (error) {
      session.page.off("request", requestHandler);
      session.page.off("response", responseHandler);
      session.page.off("requestfailed", requestFailedHandler);
      console.error("Request failed:", error);
      throw error;
    }
  }

  async closeSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    const sessionId = this.currentSession.sessionId;

    try {
      if (this.currentSession.browser) {
        await this.currentSession.browser.close();
      }

      await this.bb.sessions.update(sessionId, {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        status: "REQUEST_RELEASE",
      });

      console.log(`Closed session: ${sessionId}`);
      this.currentSession = null;
    } catch (error) {
      console.error("Failed to close session:", error);
      this.currentSession = null;
    }
  }

  getSessionStatus() {
    if (!this.currentSession) {
      return {
        hasSession: false,
        requestCount: 0,
        maxRequests: this.maxRequestsPerSession,
        remainingRequests: this.maxRequestsPerSession,
      };
    }

    return {
      hasSession: true,
      sessionId: this.currentSession.sessionId,
      requestCount: this.currentSession.requestCount,
      maxRequests: this.maxRequestsPerSession,
      remainingRequests: Math.max(
        0,
        this.maxRequestsPerSession - this.currentSession.requestCount
      ),
    };
  }
}

export const browserbaseService = new SimpleBrowserbaseService();

