"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("https://luma.com/slqfykte");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [extractionPrompt, setExtractionPrompt] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [executingCode, setExecutingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const matchesSearch = (item: any, query: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    const itemStr = JSON.stringify(item).toLowerCase();
    return itemStr.includes(q) ||
      item.url?.toLowerCase().includes(q) ||
      item.method?.toLowerCase().includes(q) ||
      item.status?.toString().includes(q) ||
      item.statusText?.toLowerCase().includes(q) ||
      item.resourceType?.toLowerCase().includes(q) ||
      item.failureText?.toLowerCase().includes(q);
  };

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSearchQuery("");
    setGeneratedCode(null);
    setExtractionResult(null);
    setExtractionError(null);

    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!extractionPrompt || !result) return;

    setGeneratingCode(true);
    setExtractionError(null);
    setGeneratedCode(null);
    setExtractionResult(null);

    try {
      const mainResponse = result.data || result.networkResponses?.find(
        (r: any) => r.status === 200
      ) || result;

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: extractionPrompt,
          responseData: mainResponse,
          url: url,
          dom: result.dom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Code generation failed");
      }

      setGeneratedCode(data.code);
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleExecuteCode = async () => {
    if (!generatedCode || !url) return;

    setExecutingCode(true);
    setExtractionError(null);
    setExtractionResult(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: generatedCode,
          url: url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Code execution failed");
      }

      setExtractionResult(data);
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExecutingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans">
      <main className="max-w-6xl mx-auto p-8">
        <div className="mb-12">
          <h1 className="text-2xl font-normal mb-1 text-black dark:text-zinc-50">
            Browserbase
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Network capture with geolocated proxy
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <div>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border-b border-zinc-300 dark:border-zinc-700 bg-transparent text-black dark:text-zinc-50 focus:outline-none focus:border-black dark:focus:border-zinc-50"
              placeholder="https://luma.com/slqfykte"
            />
          </div>

          <button
            onClick={handleRequest}
            disabled={loading || !url}
            className="w-full px-3 py-2 bg-black dark:bg-white text-white dark:text-black font-normal hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Request"}
          </button>
        </div>

        {result && (
          <div className="space-y-8">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border-b border-zinc-300 dark:border-zinc-700 bg-transparent text-black dark:text-zinc-50 focus:outline-none focus:border-black dark:focus:border-zinc-50 text-xs font-mono"
                placeholder="Search network logs..."
              />
            </div>

            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                Session
              </h2>
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto font-mono">
                {JSON.stringify(result.sessionStatus, null, 2)}
              </pre>
            </div>

            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                Response ({result.status})
              </h2>
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto font-mono">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>

            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                DOM ({result.dom?.length || 0} chars)
              </h2>
              <details>
                <summary className="cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white mb-2">
                  View HTML
                </summary>
                <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto max-h-64 overflow-y-auto font-mono mt-2">
                  {result.dom || "No DOM content"}
                </pre>
              </details>
            </div>

            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                Requests ({searchQuery ? result.networkRequests?.filter((req: any) => matchesSearch(req, searchQuery)).length || 0 : result.networkRequests?.length || 0})
              </h2>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {result.networkRequests?.filter((req: any) => matchesSearch(req, searchQuery)).map((req: any, idx: number) => (
                  <details key={idx} className="border-l border-zinc-200 dark:border-zinc-800 pl-3 py-1">
                    <summary className="cursor-pointer text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white">
                      <span className="font-normal">{req.method}</span>{" "}
                      <span className="text-zinc-400">[{req.resourceType || "unknown"}]</span>{" "}
                      <span className="text-zinc-500">{req.url.substring(0, 80)}{req.url.length > 80 ? "..." : ""}</span>
                    </summary>
                    <pre className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 overflow-x-auto font-mono">
                      {JSON.stringify(req, null, 2)}
                    </pre>
                  </details>
                ))}
                {(!result.networkRequests || result.networkRequests.length === 0) && (
                  <p className="text-xs text-zinc-400">No requests</p>
                )}
                {searchQuery && result.networkRequests?.filter((req: any) => matchesSearch(req, searchQuery)).length === 0 && result.networkRequests && result.networkRequests.length > 0 && (
                  <p className="text-xs text-zinc-400">No matching requests</p>
                )}
              </div>
            </div>

            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                Responses ({searchQuery ? result.networkResponses?.filter((res: any) => matchesSearch(res, searchQuery)).length || 0 : result.networkResponses?.length || 0})
              </h2>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {result.networkResponses?.filter((res: any) => matchesSearch(res, searchQuery)).map((res: any, idx: number) => (
                  <details key={idx} className="border-l border-zinc-200 dark:border-zinc-800 pl-3 py-1">
                    <summary className="cursor-pointer text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white">
                      <span className={`font-normal ${res.status >= 400 ? "text-red-600" : res.status >= 300 ? "text-yellow-600" : ""}`}>
                        {res.status} {res.statusText}
                      </span>{" "}
                      <span className="text-zinc-500">{res.url.substring(0, 80)}{res.url.length > 80 ? "..." : ""}</span>
                    </summary>
                    <pre className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 overflow-x-auto font-mono">
                      {JSON.stringify(res, null, 2)}
                    </pre>
                  </details>
                ))}
                {(!result.networkResponses || result.networkResponses.length === 0) && (
                  <p className="text-xs text-zinc-400">No responses</p>
                )}
                {searchQuery && result.networkResponses?.filter((res: any) => matchesSearch(res, searchQuery)).length === 0 && result.networkResponses && result.networkResponses.length > 0 && (
                  <p className="text-xs text-zinc-400">No matching responses</p>
                )}
              </div>
            </div>

            {result.networkFailed && result.networkFailed.length > 0 && (
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                  Failed ({searchQuery ? result.networkFailed.filter((failed: any) => matchesSearch(failed, searchQuery)).length : result.networkFailed.length})
                </h2>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {result.networkFailed.filter((failed: any) => matchesSearch(failed, searchQuery)).map((failed: any, idx: number) => (
                    <details key={idx} className="border-l border-red-300 dark:border-red-800 pl-3 py-1">
                      <summary className="cursor-pointer text-xs font-mono text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                        {failed.failureText || "Unknown"} - {failed.url.substring(0, 80)}{failed.url.length > 80 ? "..." : ""}
                      </summary>
                      <pre className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 overflow-x-auto font-mono">
                        {JSON.stringify(failed, null, 2)}
                      </pre>
                    </details>
                  ))}
                  {searchQuery && result.networkFailed.filter((failed: any) => matchesSearch(failed, searchQuery)).length === 0 && (
                    <p className="text-xs text-zinc-400">No matching failed requests</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                Data Extraction
              </h2>
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={extractionPrompt}
                    onChange={(e) => setExtractionPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerateCode();
                      }
                    }}
                    className="w-full px-3 py-2 border-b border-zinc-300 dark:border-zinc-700 bg-transparent text-black dark:text-zinc-50 focus:outline-none focus:border-black dark:focus:border-zinc-50 text-xs"
                    placeholder="e.g., get the hosts"
                  />
                </div>
                <button
                  onClick={handleGenerateCode}
                  disabled={generatingCode || !extractionPrompt || !result}
                  className="w-full px-3 py-2 bg-black dark:bg-white text-white dark:text-black font-normal hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  {generatingCode ? "Generating..." : "Generate Code"}
                </button>
              </div>
            </div>

            {generatedCode && (
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                  Generated Code
                </h2>
                <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-96 overflow-y-auto font-mono bg-zinc-50 dark:bg-zinc-900 p-4">
                  {generatedCode}
                </pre>
                <button
                  onClick={handleExecuteCode}
                  disabled={executingCode || !generatedCode}
                  className="mt-3 w-full px-3 py-2 bg-black dark:bg-white text-white dark:text-black font-normal hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                >
                  {executingCode ? "Executing..." : "Execute"}
                </button>
              </div>
            )}

            {extractionResult && (
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-xs uppercase tracking-wide mb-3 text-zinc-500 dark:text-zinc-500">
                  Extracted Data
                </h2>
                <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-96 overflow-y-auto font-mono">
                  {JSON.stringify(extractionResult, null, 2)}
                </pre>
              </div>
            )}

            {extractionError && (
              <div className="border-b border-red-300 dark:border-red-800 pb-4">
                <h2 className="text-xs uppercase tracking-wide mb-2 text-red-600 dark:text-red-400">
                  Extraction Error
                </h2>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono">{extractionError}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-8 border-b border-red-300 dark:border-red-800 pb-4">
            <h2 className="text-xs uppercase tracking-wide mb-2 text-red-600 dark:text-red-400">
              Error
            </h2>
            <p className="text-xs text-red-600 dark:text-red-400 font-mono">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
