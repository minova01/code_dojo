import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const postsDirectory = path.join(process.cwd(), "content/posts");

export type Post = {
  slug: string;
  lineSlug: string;
  topicSlug: string;
  title: string;
  description: string;
  publishedAt: string;
  tags: string[];
  content: string;
  outline: string[];
};

export type Heading = {
  id: string;
  text: string;
  level: number;
};

function findMarkdownFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? findMarkdownFiles(entryPath) : entryPath.endsWith(".md") ? [entryPath] : [];
  });
}

function extractOutline(content: string) {
  return [...content.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].replace(/[`*_]/g, "").trim())
    .filter((heading) => heading !== "目录")
    .slice(0, 4);
}

function readPost(filePath: string): Post | null {
  const relativePath = path.relative(postsDirectory, filePath);
  const slug = relativePath.replace(/\.md$/, "").split(path.sep).join("/");
  const [lineSlug, topicSlug] = slug.split("/");
  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);

  if (!data.title || !data.description || !data.publishedAt) {
    throw new Error(`文章 ${relativePath} 缺少 title、description 或 publishedAt`);
  }

  if (!lineSlug || !topicSlug || data.draft === true) return null;

  return {
    slug,
    lineSlug,
    topicSlug,
    title: String(data.title),
    description: String(data.description),
    publishedAt: String(data.publishedAt),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    content,
    outline: extractOutline(content),
  };
}

export function getPosts(): Post[] {
  return findMarkdownFiles(postsDirectory)
    .map(readPost)
    .filter((post): post is Post => post !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPost(slug: string | string[]): Post | undefined {
  const normalizedSlug = Array.isArray(slug) ? slug.join("/") : slug;
  return getPosts().find((post) => post.slug === normalizedSlug);
}

function headingId(text: string, index: number) {
  const id = text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return id || `section-${index + 1}`;
}

export function renderPost(markdown: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  let headingIndex = 0;
  let hasDocumentTitle = false;
  const renderer = new marked.Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const plainText = text.replace(/<[^>]*>/g, "");
    const id = headingId(text, headingIndex++);
    const isDocumentTitle = depth === 1 && !hasDocumentTitle;
    if (depth === 1) hasDocumentTitle = true;
    if (!isDocumentTitle && plainText !== "目录" && depth <= 3) {
      headings.push({ id, text: plainText, level: depth });
    }
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  return {
    html: marked.parse(markdown, { async: false, gfm: true, renderer }),
    headings,
  };
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
