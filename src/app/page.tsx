import Link from "next/link";
import { DojoScene } from "@/components/DojoScene";
import { getPosts } from "@/lib/posts";
import { getTopic, questLines } from "@/lib/quests";

export default function Home() {
  const posts = getPosts();

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">PERSONAL TECH LOG · LV.01</span>
          <h1><span>CODE</span> DOJO</h1>
          <p>记录技术学习、实践过程与问题解决方法的修炼日志。</p>
          <a className="primary-action" href="#paths-title">进入任务日志</a>
        </div>
        <DojoScene />
      </section>

      <section className="home-paths" aria-labelledby="paths-title">
        <header>
          <span className="eyebrow">CHOOSE YOUR PATH</span>
          <h2 id="paths-title">每一次记录，都是一次升级。</h2>
        </header>
        <div className="path-list">
          {questLines.map((line, index) => {
            const linePosts = posts.filter((post) => post.lineSlug === line.slug);
            const topics = [...new Set(linePosts.map((post) => post.topicSlug))]
              .map((topicSlug) => getTopic(line.slug, topicSlug).title);
            const content = (
              <>
                <span className="path-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="path-copy">
                  <span>{line.rank}</span>
                  <h3>{line.title}</h3>
                  <p>{line.description}</p>
                  {topics.length > 0 && <small>{topics.join(" · ")}</small>}
                </div>
                <span className="path-state">
                  {linePosts.length} 条记录 ↗
                </span>
              </>
            );

            return (
              <Link key={line.slug} href={`/articles/#${line.slug}`} className="path-item">
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
