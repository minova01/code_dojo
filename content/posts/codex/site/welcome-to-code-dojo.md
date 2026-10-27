---
title: "欢迎来到 Code Dojo"
description: "从一个普通的 Markdown 文件开始，记录搭建个人技术道场的第一步。"
publishedAt: "2026-10-25"
tags: ["Next.js", "Markdown", "Web Development"]
draft: false
---

# 欢迎来到 Code Dojo

Code Dojo 是一份持续更新的技术修炼手册。这里记录真正解决过的问题、正在学习的概念，以及值得反复练习的工程方法。

> 道场笔记：保持内容清楚，比制造复杂的形式更重要。

## 本次任务

- [x] 建立静态博客结构
- [x] 使用 Markdown 管理文章
- [ ] 写下下一篇真实的技术复盘

## Markdown 如何变成文章

构建过程中，网站会读取文章顶部的元数据，将正文转换成 HTML，并统一套用文章排版。写作时不需要接触 React 组件。

```ts
const practice = {
  topic: "Static Site Generation",
  status: "in-progress",
};
```

| 内容 | 负责什么 |
| --- | --- |
| Markdown | 标题、正文、代码与图片 |
| CSS | 字体、颜色与阅读体验 |
| Next.js | 页面结构与静态构建 |

## 下一次修炼

下一篇文章可以从一个真实问题开始：问题如何出现、尝试过什么、最终为什么选择当前方案。这样的记录通常比单纯罗列 API 更有价值。

### 写作约定

保持标题准确、示例可运行，并明确记录方案的限制。
