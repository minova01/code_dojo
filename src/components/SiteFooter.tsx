export function SiteFooter() {
  const updatedAt = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  return (
    <footer className="site-footer">
      <p>持续练习，记录每一次升级。</p>
      <span>CODE DOJO · 最近更新：{updatedAt}</span>
    </footer>
  );
}
