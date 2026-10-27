import Link from "next/link";

export default function NotFound() {
  return <div className="empty-state"><span>404 · PATH LOST</span><h1>这条修炼路径尚未开放。</h1><Link className="primary-action" href="/">返回道场</Link></div>;
}
