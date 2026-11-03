import Link from "next/link";
import { Search } from "@/components/Search";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand-block">
          <Link className="brand" href="/" aria-label="Code Dojo 首页">
            <span className="brand-mark" aria-hidden="true">◆</span>
            CODE DOJO
          </Link>
          <Link className="start-training" href="/">一键开始修炼</Link>
        </div>
        <Search />
        <nav aria-label="主导航">
          <Link href="/articles/#initiation">修炼记录</Link>
        </nav>
      </div>
      <a className="github-corner" href="https://github.com/minova01" target="_blank" rel="noreferrer" aria-label="访问 GitHub 主页">
        <svg viewBox="0 0 250 250" aria-hidden="true">
          <path d="M0 0 115 115h15l12 27 108 108V0Z" />
          <path className="octo-arm" fill="currentColor" d="M128.3 109c-14.5-9.3-9.3-19.4-9.3-19.4 3-6.9 1.5-11 1.5-11-1.3-6.6 2.9-2.3 2.9-2.3 3.9 4.6 2.1 11 2.1 11-2.6 10.3 5.1 14.6 8.9 15.9" />
          <path className="octo-body" fill="currentColor" d="M115 115c-.1.1 3.7 1.5 4.8.4l13.9-13.8c3.2-2.4 6.2-3.2 8.5-3-8.4-10.6-14.7-24.2 1.6-40.6 4.7-4.6 10.2-6.8 15.9-7 .6-1.6 3.5-7.4 11.7-10.9 0 0 4.7 2.4 7.4 16.1 4.3 2.4 8.4 5.6 12.1 9.2 3.6 3.6 6.8 7.8 9.2 12.2 13.7 2.6 16.2 7.3 16.2 7.3-3.6 8.2-9.4 11.1-10.9 11.7-.3 5.8-2.4 11.2-7.1 15.9-16.4 16.4-30 10-40.6 1.6.2 2.8-1 6.8-5 10.8L141 136.5c-1.2 1.2.6 5.4.8 5.3Z" />
        </svg>
      </a>
    </header>
  );
}
