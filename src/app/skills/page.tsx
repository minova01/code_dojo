import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/posts";
import { questLines } from "@/lib/quests";

export const metadata: Metadata = { title: "技能路径" };

export default function SkillsPage() {
  const posts = getPosts();

  return (
    <div className="page-shell skills-page">
      <header className="page-intro">
        <span className="eyebrow">SKILL MAP</span>
        <h1>技能路径</h1>
        <p>按照任务类型查看技术方向。已收录文章的路线可以进入，其他路线会随记录逐步解锁。</p>
      </header>
      <div className="skill-quests">
        {questLines.map((line, index) => {
          const count = posts.filter((post) => post.lineSlug === line.slug).length;
          const content = (
            <>
              <span className="skill-order">{String(index + 1).padStart(2, "0")}</span>
              <div className="skill-quest-copy"><span>{line.rank}</span><h2>{line.title}</h2><p>{line.description}</p></div>
              <div className="skill-state"><strong>{count ? `${count} 项任务` : "待解锁"}</strong><span aria-hidden="true">{count ? "→" : "◇"}</span></div>
            </>
          );
          return count ? <Link className="skill-quest is-unlocked" href={`/articles/#${line.slug}`} key={line.slug}>{content}</Link> : <div className="skill-quest" key={line.slug}>{content}</div>;
        })}
      </div>
    </div>
  );
}
