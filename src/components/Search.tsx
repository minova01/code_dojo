"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  url: string;
  meta: { title: string };
  excerpt: string;
};

type PagefindResult = { data: () => Promise<SearchResult> };
type Pagefind = { search: (query: string) => Promise<{ results: PagefindResult[] }> };

export function Search() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [status, setStatus] = useState("");
  const expandedInputRef = useRef<HTMLInputElement>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    if (!isOpen) return;
    expandedInputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults(null);
      setStatus("");
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus("正在检索修炼记录…");
      try {
        const modulePath = `${basePath}/pagefind/pagefind.js`;
        const pagefind = await import(/* webpackIgnore: true */ modulePath) as Pagefind;
        const response = await pagefind.search(normalizedQuery);
        const data = await Promise.all(response.results.slice(0, 10).map((result) => result.data()));
        if (!cancelled) {
          setResults(data);
          setStatus(data.length ? `找到 ${data.length} 条记录` : "没有找到相关记录");
        }
      } catch {
        if (!cancelled) {
          setStatus("搜索暂时不可用，请稍后重试。");
          setResults([]);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [basePath, query]);

  return (
    <div className="header-search">
      <label className="sr-only" htmlFor="header-search-input">搜索文章</label>
      <input
        id="header-search-input"
        className="search-launch"
        type="search"
        value={query}
        placeholder="搜索技术关键字"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="search-overlay" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section className="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2 id="search-dialog-title">检索修炼记录</h2>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="关闭搜索">×</button>
            </header>
            <label className="sr-only" htmlFor="expanded-search-input">搜索文章标题、正文或技术关键词</label>
            <input
              ref={expandedInputRef}
              id="expanded-search-input"
              className="search-expanded-input"
              type="search"
              value={query}
              placeholder="搜索技术关键字"
              onChange={(event) => setQuery(event.target.value)}
            />
            <p className="search-status" aria-live="polite">{status}</p>
            {results && results.length > 0 && (
              <div className="search-results">
                {results.map((result) => (
                  <a href={result.url} key={result.url}>
                    <strong>{result.meta.title}</strong>
                    <span dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
