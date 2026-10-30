import Link from "next/link";
import { HeaderTools } from "@/components/HeaderTools";
import { Search } from "@/components/Search";

export function SiteHeader() {
  return (
    <header className="site-header">
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
        <HeaderTools />
      </nav>
    </header>
  );
}
