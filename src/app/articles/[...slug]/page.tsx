import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getPost, getPosts, renderPost } from "@/lib/posts";
import { getQuestLine, getTopic } from "@/lib/quests";

type ArticleParams = { params: Promise<{ slug: string[] }> };

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug.split("/") }));
}

export async function generateMetadata({ params }: ArticleParams): Promise<Metadata> {
  const post = getPost((await params).slug);
  return post ? { title: post.title, description: post.description } : {};
}

export default async function ArticlePage({ params }: ArticleParams) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { html, headings } = renderPost(post.content);
  const line = getQuestLine(post.lineSlug);
  const topic = getTopic(post.lineSlug, post.topicSlug);

  return (
    <div className="article-shell" data-pagefind-body>
      <article>
        <Link className="back-link" href={`/articles/#${post.lineSlug}`}>← 返回{line?.title ?? "任务日志"}</Link>
        <header className="article-header">
          <span className="eyebrow">{line?.title ?? "QUEST"} · {topic.title}</span>
          <h1 data-pagefind-meta="title">{post.title}</h1>
          <p>{post.description}</p>
          <div className="article-meta">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <ul className="tag-list">{post.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
          </div>
        </header>
        <div className="article-content" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      {headings.length > 0 && (
        <aside className="toc" aria-label="文章目录" data-pagefind-ignore>
          <span>本页目录</span>
          <ol>{headings.map((heading) => <li className={`toc-level-${heading.level}`} key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol>
        </aside>
      )}
    </div>
  );
}
