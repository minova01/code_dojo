export type QuestLine = {
  slug: string;
  rank: string;
  title: string;
  description: string;
};

export const questLines: QuestLine[] = [
  { slug: "initiation", rank: "第一卷", title: "入门心法", description: "编程语言、并发模型、运行时原理与性能基础" },
  { slug: "crafts", rank: "第二卷", title: "百工器谱", description: "框架、数据库、中间件与工程工具" },
  { slug: "expeditions", rank: "第三卷", title: "山门守望", description: "云原生、基础设施与系统运维" },
  { slug: "dungeons", rank: "第四卷", title: "实战历练", description: "项目实践、分布式系统设计、架构决策与故障复盘" },
  { slug: "codex", rank: "别卷", title: "藏经秘录", description: "开发技巧、速查表与零散笔记" },
];

const topics: Record<string, { title: string; description: string }> = {
  "initiation/go": { title: "Go 修炼", description: "语言基础、并发模型与运行时机制" },
  "crafts/mysql": { title: "MySQL 工坊", description: "查询、索引、事务、优化与高可用" },
  "crafts/redis": { title: "Redis 修习", description: "数据结构、缓存设计、并发控制与高可用" },
  "expeditions/kubernetes": { title: "Kubernetes 修习", description: "容器编排、服务治理与集群运维" },
  "dungeons/distributed": { title: "分布式修习", description: "分布式理论、事务一致性、微服务治理与数据分片" },
  "codex/site": { title: "道场日志", description: "关于本站的构建与迭代记录" },
};

export function getQuestLine(slug: string) {
  return questLines.find((line) => line.slug === slug);
}

export function getTopic(lineSlug: string, topicSlug: string) {
  return topics[`${lineSlug}/${topicSlug}`] ?? {
    title: topicSlug.replace(/-/g, " "),
    description: "持续更新中的技术记录",
  };
}
