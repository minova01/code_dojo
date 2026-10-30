import Link from "next/link";
import type { Post } from "@/lib/posts";

export function QuestCard({ post, number }: { post: Post; number: number }) {
  return (
    <article className="quest-card">
      <div className="quest-index" aria-hidden="true">Q-{String(number).padStart(2, "0")}</div>
      <div className="quest-copy">
        <div className="quest-meta">
          <span>已记录</span>
        </div>
        <h4><Link href={`/articles/${post.slug}/`}>{post.title}</Link></h4>
        <p>{post.description}</p>
        {post.outline.length > 0 && (
          <ul className="quest-outline" aria-label="主要知识点">
            {post.outline.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        <ul className="tag-list" aria-label="文章标签">
          {post.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <Link className="quest-arrow" href={`/articles/${post.slug}/`} aria-label={`阅读 ${post.title}`}>→</Link>
    </article>
  );
}
