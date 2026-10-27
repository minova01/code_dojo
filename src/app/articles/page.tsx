import type { Metadata } from "next";
import { QuestCard } from "@/components/QuestCard";
import { getPosts } from "@/lib/posts";
import { getTopic, questLines } from "@/lib/quests";

export const metadata: Metadata = { title: "修炼记录" };

export default function ArticlesPage() {
  const posts = getPosts();
  const lines = questLines
    .map((line) => ({ ...line, posts: posts.filter((post) => post.lineSlug === line.slug) }));

  return (
    <div className="page-shell">
      <div className="quest-board" aria-label="任务目录">
        {lines.map((line) => {
          const topicSlugs = [...new Set(line.posts.map((post) => post.topicSlug))];
          return (
            <section className="quest-line" id={line.slug} key={line.slug}>
              <header className="quest-line-header">
                <div><span className="quest-rank">{line.rank}</span><h2>{line.title}</h2><p>{line.description}</p></div>
                <span>{line.posts.length} QUESTS</span>
              </header>
              {topicSlugs.map((topicSlug) => {
                const topic = getTopic(line.slug, topicSlug);
                const topicPosts = line.posts.filter((post) => post.topicSlug === topicSlug);
                return (
                  <div className="quest-topic" key={topicSlug}>
                    <header><span aria-hidden="true">◆</span><div><h3>{topic.title}</h3><p>{topic.description}</p></div></header>
                    <div className="quest-list">
                      {topicPosts.map((post, index) => <QuestCard key={post.slug} post={post} number={index + 1} />)}
                    </div>
                  </div>
                );
              })}
              {line.posts.length === 0 && <p className="quest-empty">这里暂时还没有记录。</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
