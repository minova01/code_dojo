---
title: "Kubernetes 基础知识"
description: "Kubernetes 架构、应用编排、网络存储与生产排障常见问题。"
tags: ["Kubernetes", "Cloud Native", "DevOps"]
draft: false
---

# Kubernetes

## 目录

- [一、认识 Kubernetes](#一-认识-kubernetes)
- [二、应用如何运行](#二-应用如何运行)
- [三、应用如何被访问并保存数据](#三-应用如何被访问并保存数据)
- [四、生产稳定性与故障排查](#四-生产稳定性与故障排查)

# 一、认识 Kubernetes

## 1. 基础概念

### Kubernetes 解决什么问题？

Kubernetes 是容器编排系统，用来管理容器化应用的部署、扩缩容、服务发现和故障恢复。单独使用容器运行时只能启动容器；当服务跨越多台机器并拥有多个实例后，还需要处理实例放在哪里、失败后如何补齐、流量如何找到实例以及版本如何平滑更新，这些工作由 Kubernetes 统一完成。

它的核心目标不是让单个容器运行得更快，而是让一组应用长期保持在声明的状态。

### 容器和 Kubernetes 是什么关系？

容器通过 Namespace 隔离进程、网络等资源视图，通过 cgroups 控制 CPU 和内存使用，再借助镜像交付程序及其依赖。Kubernetes 建立在容器能力之上，负责跨节点编排，不会取代容器运行时。

简单来说，容器解决“应用如何被封装和运行”，Kubernetes 解决“许多容器如何在集群中持续、稳定地运行”。

### 为什么 Kubernetes 调度 Pod，而不是直接调度容器？

Pod 是 Kubernetes 的最小调度单位，可以包含一个或多个紧密协作的容器。同一个 Pod 内的容器共享网络命名空间和挂载卷，使用同一个 Pod IP，也必须被调度到同一节点。

多数业务 Pod 只运行一个主容器。只有日志代理、服务网格代理等必须与主程序共享生命周期和本地资源的辅助进程，才适合以 Sidecar 形式放进同一个 Pod。Pod 可以随时被替换，因此不应把它当成稳定主机，也不应依赖它自身的 IP 和容器文件系统保存长期状态。

## 2. 集群架构

### Kubernetes 集群由哪些部分组成？

Kubernetes 集群由控制面和工作节点组成。控制面保存集群状态并作出调度、编排决策；工作节点负责运行 Pod，并执行控制面下发的结果。

```text
kubectl / 集群内组件
          │
          ▼
      API Server ─────► etcd
       ▲   ▲   ▲
       │   │   └──── Scheduler
       │   └──────── Controller Manager
       │
       └──────────── kubelet（Node）
                         │
                         └── 容器运行时 ── Pod

Node 上的 kube-proxy 根据 Service 信息维护流量转发规则
```

所有组件都通过 API Server 读取或更新集群状态，只有 API Server 直接访问 etcd。这样的入口便于统一做认证、授权、校验和审计。

### 控制面的核心组件分别做什么？

| 组件 | 主要职责 |
| --- | --- |
| API Server | 提供 Kubernetes API，是集群操作和组件通信的统一入口 |
| etcd | 持久化集群状态，使用 Raft 保证一致性 |
| Scheduler | 为尚未绑定节点的 Pod 选择合适的 Node |
| Controller Manager | 运行各类控制器，使实际状态不断接近期望状态 |

API Server 负责接收和校验请求，不负责直接创建容器；Scheduler 只决定 Pod 放在哪个节点，不负责启动 Pod；Controller Manager 负责发现状态差异并发起调整。这些边界是理解 Kubernetes 工作流程的基础。

### 工作节点上的核心组件分别做什么？

`kubelet` 监听分配到本节点的 Pod，调用容器运行时创建容器、挂载存储、执行探针，并把运行状态报告给 API Server。容器运行时负责拉取镜像和管理容器生命周期，常见实现包括 containerd 和 CRI-O。

`kube-proxy` 根据 Service 和后端端点信息维护节点上的转发规则，常见实现基于 iptables 或 IPVS。它解决的是 Service 流量转发，不负责 Pod 网络的建立；Pod 网络通常由 CNI 插件负责。

## 3. 声明式 API 与核心对象

### 什么是声明式管理？

声明式管理只描述目标状态，例如镜像版本、副本数和资源限制，控制器负责把当前状态逐步调整到目标状态。命令式操作则直接描述执行步骤，例如手动启动三个容器。

声明式配置可以进入版本控制，也能重复应用。Kubernetes 会持续检查实际状态，即使 Pod 意外退出，也会按照声明重新补齐。`kubectl apply` 是常见的声明式操作入口，但声明式能力真正依赖的是 API 对象和控制循环。

### 执行 kubectl apply 后发生了什么？

请求首先到达 API Server，经过认证、授权、准入控制和字段校验后，对象状态被写入 etcd。相关控制器观察到新对象后创建或更新下级资源；Scheduler 为未绑定的 Pod 选择节点；目标节点上的 kubelet 最终调用容器运行时启动容器。

```text
提交 YAML
   ↓
API Server 校验并保存对象
   ↓
控制器创建或调整 Pod
   ↓
Scheduler 选择 Node
   ↓
kubelet 启动容器并回报状态
```

这一过程是异步的。API Server 接受对象并不等于应用已经可用，还要继续查看 Pod 状态、探针结果和相关事件。

### Pod、Deployment、Service 和 Namespace 分别是什么？

| 对象 | 作用 |
| --- | --- |
| Pod | 最小调度单位，承载一个或多个容器 |
| Deployment | 管理无状态应用的副本、滚动更新和回滚 |
| Service | 为一组 Pod 提供稳定的访问入口 |
| Namespace | 对集群资源做逻辑分组，并作为权限和配额的作用范围 |

Namespace 不是强安全隔离。生产环境还需要结合 RBAC、NetworkPolicy、资源配额和安全策略限制不同团队或应用之间的访问。

# 二、应用如何运行

## 1. 控制器与副本管理

### 控制循环是如何工作的？

控制器不断读取期望状态和实际状态，发现差异后执行调整，然后再次观察结果。这个过程称为 Reconcile Loop，也是 Kubernetes 自愈能力的基础。

```text
读取期望状态 → 观察实际状态 → 比较差异 → 执行调整
      ▲                                      │
      └──────────────── 再次协调 ────────────┘
```

例如 Deployment 要求三个副本，而当前只有两个可用 Pod，ReplicaSet 控制器会创建一个新 Pod。控制循环通常保证最终一致，不保证每次观察后立即达到目标状态。

### Deployment、ReplicaSet 和 Pod 是什么关系？

Deployment 负责版本和发布策略，ReplicaSet 负责维持指定数量的 Pod，Pod 才是实际运行容器的对象。Deployment 更新 Pod 模板时会创建新的 ReplicaSet，并逐步缩减旧 ReplicaSet。

```text
Deployment
├── ReplicaSet（旧版本）── Pod
└── ReplicaSet（新版本）── Pod、Pod、Pod
```

生产中的无状态服务通常直接使用 Deployment，而不是手动维护 Pod 或 ReplicaSet。直接创建的 Pod 退出后不会由 Deployment 补齐；直接操作 ReplicaSet 也缺少 Deployment 提供的发布和回滚管理。

## 2. 调度与资源

### Scheduler 如何为 Pod 选择节点？

调度通常分为过滤和打分。过滤阶段排除资源不足、污点不被容忍或不满足硬性亲和规则的节点；打分阶段根据资源分布、亲和偏好等条件为候选节点排序，最后把 Pod 与得分合适的节点绑定。

Scheduler 只负责选择节点。绑定完成后，由目标节点上的 kubelet 创建并管理容器。

### requests 和 limits 有什么区别？

`requests` 表示 Pod 申请的资源，是调度器判断节点容量的主要依据；`limits` 表示容器运行时允许使用的上限。两者过高会降低集群利用率，过低则可能引起资源争抢、CPU 限速或内存溢出。

CPU 超过 limit 时通常会被节流，表现为延迟上升；内存超过 limit 时容器可能被内核终止，Pod 状态中会出现 `OOMKilled`。因此资源值应根据监控和压测调整，不能只按节点总容量平均分配。

### 污点、容忍和亲和性如何配合？

污点（Taint）设置在节点上，用来排斥不符合条件的 Pod；容忍（Toleration）设置在 Pod 上，表示它可以接受某种污点。容忍只代表“允许调度”，不会主动把 Pod 吸引到该节点。

节点亲和性用于选择具有特定标签的节点，Pod 亲和与反亲和用于控制 Pod 之间靠近或分散。硬性规则不满足时无法调度，软性规则只影响候选节点的优先级。专用节点通常使用污点与节点亲和性一起约束。

## 3. 发布、回滚与扩缩容

### Deployment 如何完成滚动更新？

Deployment 会创建新 ReplicaSet，逐步增加新版本 Pod，同时减少旧版本 Pod。只有新 Pod 通过就绪检查后，才应接收 Service 流量。更新节奏由 `maxSurge` 和 `maxUnavailable` 控制。

- `maxSurge`：更新期间允许临时超出目标副本数的最大数量或比例。
- `maxUnavailable`：更新期间允许不可用的最大数量或比例。

把 `maxUnavailable` 设为 0 可以避免主动减少可用副本，但并不自动保证零停机。还需要足够的集群容量、正确的 readinessProbe、合理的终止宽限时间，并保证新旧版本能够兼容。

### 发布失败后如何回滚？

先用 `kubectl rollout status deployment/<name>` 查看发布进度，再通过 `kubectl rollout history deployment/<name>` 查看历史版本，最后执行以下命令回滚：

```bash
kubectl rollout undo deployment/<name>
```

回滚恢复的是 Deployment 保存的 Pod 模板版本，不会自动回滚数据库结构、外部配置或已经写入的数据。涉及数据变更时，应提前设计向前兼容和单独的数据回退方案。

### HPA 如何实现自动扩缩容？

HPA 按周期读取资源或自定义指标，计算目标副本数，再更新 Deployment 等工作负载的副本字段。CPU、内存指标通常来自 Metrics Server，自定义业务指标则需要相应的指标适配器。

以 CPU 利用率作为目标时，计算基准与 Pod 的 CPU `requests` 有关。没有设置合理的 requests，HPA 可能无法得到期望结果。HPA 只能增加 Pod 数量，若节点容量不足，还需要 Cluster Autoscaler 等机制增加节点。

# 三、应用如何被访问并保存数据

## 1. Service 与服务发现

### Pod 已经有 IP，为什么还需要 Service？

Pod 的生命周期短，重建后 IP 可能变化，扩缩容也会不断改变实例集合。Service 用标签选择器关联一组 Pod，并提供稳定的虚拟 IP 和 DNS 名称，让调用方不必感知后端实例变化。

控制面会根据 Service 选择器维护 EndpointSlice，kube-proxy 再根据 Service 和 EndpointSlice 信息生成转发规则。只有通过就绪检查的端点通常才会接收正常流量。

```text
客户端
  ↓
Service（稳定 IP / DNS）
  ↓
EndpointSlice（可用 Pod 地址）
  ├── Pod A
  ├── Pod B
  └── Pod C
```

### ClusterIP、NodePort 和 LoadBalancer 有什么区别？

| 类型 | 访问范围 | 常见用途 |
| --- | --- | --- |
| ClusterIP | 集群内部 | 服务之间调用，也是默认类型 |
| NodePort | 节点 IP 与固定端口 | 临时暴露或作为外部负载均衡的后端 |
| LoadBalancer | 外部负载均衡入口 | 云环境中的生产对外服务 |

`LoadBalancer` 的具体实现依赖云厂商或集群中的负载均衡组件。它通常仍会关联 ClusterIP，是否经过 NodePort 则取决于实现和配置。

### kube-proxy 如何转发 Service 流量？

kube-proxy 监听 Service 和 EndpointSlice 的变化，并在每个节点上维护转发规则。iptables 模式通过规则链选择后端，IPVS 模式使用内核的虚拟服务能力维护后端列表。

Service 的 ClusterIP 通常不是绑定在某张网卡上的真实地址，而是由这些规则实现的虚拟入口。如果 Service 可以解析但访问失败，应继续检查端点、端口映射、就绪状态以及节点上的转发规则。

### 集群内的 DNS 如何完成服务发现？

CoreDNS 监听集群中的 Service 等资源，为它们提供 DNS 记录。同一 Namespace 内通常可以直接使用 Service 名，跨 Namespace 可以使用 `<service>.<namespace>`，完整域名为 `<service>.<namespace>.svc.cluster.local`。

DNS 负责把服务名解析到 Service 地址，不负责判断后端业务是否正常。解析成功但请求失败时，应继续检查 Service 端点和应用监听端口。

## 2. 外部入口与 Pod 网络

### Ingress 和 Service 有什么区别？

Service 为一组 Pod 提供稳定的四层访问入口；Ingress 描述 HTTP/HTTPS 的域名和路径路由规则，可以把同一个外部入口转发到多个 Service。Ingress 资源本身只是规则，集群中还必须运行 Ingress Controller 才会真正处理流量。

对于非 HTTP/HTTPS 协议，通常直接使用 `LoadBalancer`、`NodePort` 或支持对应协议的网关实现。新项目也可以评估 Gateway API，但无需为了简单入口替换已经稳定运行的 Ingress 方案。

### CNI 插件负责什么？

CNI 插件负责为 Pod 分配 IP、配置网络接口和路由，使 Pod 能够按照集群网络模型通信。Kubernetes 只定义网络要求和调用接口，不内置具体网络实现。

Flannel 侧重基础连通，Calico、Cilium 等方案还提供 NetworkPolicy 或更丰富的网络能力。选择插件时要考虑现有基础设施、性能、策略能力和运维复杂度，不能只根据封装方式判断优劣。

### NetworkPolicy 能解决什么问题？

NetworkPolicy 用标签和命名空间选择器限制 Pod 的入站或出站流量，用于减少应用之间不必要的网络访问。策略是否生效取决于 CNI 插件是否支持 NetworkPolicy。

一旦某个方向有策略选中 Pod，该方向通常会进入默认拒绝，再由规则明确放行。上线前要确认 DNS、监控和必要的下游访问已被允许，否则应用可能启动正常却无法调用依赖。

## 3. 持久化存储与配置

### 为什么不能把数据只保存在容器文件系统中？

容器文件系统跟随容器生命周期。Pod 重建、容器替换或被调度到其他节点后，写在容器可写层中的数据可能丢失。临时缓存可以使用容器文件系统或 `emptyDir`，需要跨重建保留的数据则应写入持久卷或外部存储服务。

Kubernetes 负责挂载存储，不会自动保证应用层的数据一致性。数据库仍需处理复制、备份、恢复和故障切换。

### PV、PVC 和 StorageClass 是什么关系？

PV 表示集群可用的持久化存储，PVC 表示工作负载对容量和访问模式的申请，StorageClass 描述动态创建存储的方式。PVC 创建后，控制器会绑定符合条件的已有 PV，或者通过 StorageClass 调用存储插件动态创建 PV。

```text
Pod 引用 PVC
      ↓
PVC 声明容量与访问模式
      ↓
匹配现有 PV ── 或 ── StorageClass 动态创建 PV
      ↓
挂载实际存储
```

删除 PVC 后数据是否保留，取决于 PV 的回收策略和存储系统配置。生产环境必须确认 `Retain`、`Delete` 等行为，避免把删除工作负载误认为不会影响数据。

### ConfigMap 和 Secret 有什么区别？

ConfigMap 保存普通配置，Secret 保存密码、令牌和证书等敏感数据。两者都可以作为环境变量或文件挂载到容器中，从而让同一镜像适配不同环境。

Secret 默认只是经过 Base64 编码，并不等于加密。生产环境应启用 etcd 静态加密、限制 RBAC 权限，并避免把 Secret 明文提交到代码仓库或输出到日志。配置更新后，应用是否自动读取新值取决于挂载方式和应用实现；环境变量不会在运行中的容器内自动刷新。

# 四、生产稳定性与故障排查

## 1. 健康检查与资源保护

### liveness、readiness 和 startup 探针有什么区别？

| 探针 | 判断内容 | 失败后的主要行为 |
| --- | --- | --- |
| livenessProbe | 容器是否仍能正常工作 | 重启容器 |
| readinessProbe | 容器是否可以接收流量 | 从 Service 可用端点中移除 |
| startupProbe | 应用是否已经完成启动 | 启动成功前暂停其他两类探针；持续失败则重启 |

存活探针适合检测无法自行恢复的卡死状态，不应把临时的下游故障作为重启条件。就绪探针用于保护流量，启动探针用于给慢启动应用足够时间。探针路径、超时和失败阈值都要结合应用实际响应时间设置。

### 为什么只配置 livenessProbe 仍可能在发布时出现 502？

livenessProbe 只能判断容器是否需要重启，不能阻止尚未准备好的实例接收流量。新 Pod 启动后，如果没有 readinessProbe，它可能在依赖尚未连接、缓存尚未加载时就进入 Service 端点，导致请求失败。

滚动发布至少要同时考虑 readinessProbe、`maxUnavailable`、`maxSurge` 和优雅终止。旧 Pod 退出前应先停止接收新流量，并给正在处理的请求留出完成时间。

### CPU 超限和内存超限的表现有什么不同？

CPU 是可压缩资源，超过 limit 后通常被节流，容器不会因此直接退出，但吞吐下降、请求延迟增加。内存是不可压缩资源，超过容器限制时进程可能被 OOM Killer 终止，状态中会看到 `OOMKilled`，随后按重启策略再次启动。

排查时不能只看平均使用率。CPU 需要观察节流时间和高分位延迟，内存需要观察工作集、峰值和增长趋势。

### Go 服务在容器中如何设置内存参数？

Go 服务应让运行时的内存目标低于容器 memory limit，为线程栈、非 Go 堆内存、内核缓冲以及短时峰值留出空间。可以根据实际工作负载设置 `GOMEMLIMIT`，但它是垃圾回收的软目标，不是进程总内存的硬上限。

设置后仍要通过压测和监控验证。如果 limit 过低，频繁 GC 会消耗 CPU；如果 `GOMEMLIMIT` 过于接近 limit，进程的其他内存开销仍可能触发 OOM。

## 2. 常见故障与排查顺序

### Pod 异常时应该按什么顺序排查？

先用 `kubectl get pod -o wide` 确认状态、重启次数和所在节点；再用 `kubectl describe pod <name>` 查看调度、拉镜像、挂卷和探针相关事件；最后用 `kubectl logs <name>` 查看应用日志，容器重启后加 `--previous` 查看上一次实例的日志。

```text
get：确定异常对象和状态
  ↓
describe：查看 Events、退出原因和探针结果
  ↓
logs：检查当前或上一次容器日志
  ↓
按线索继续检查节点、镜像、存储、网络或应用配置
```

这套顺序用于快速缩小范围，不代表所有问题三条命令就能解决。节点级故障还需要检查 kubelet、容器运行时、系统资源和 CNI 状态。

### 常见 Pod 状态分别说明什么？

| 状态 | 常见原因 | 优先检查 |
| --- | --- | --- |
| Pending | 资源不足、PVC 未绑定、污点或亲和规则不满足 | `describe` 中的调度事件 |
| ImagePullBackOff | 镜像地址错误、仓库鉴权失败或网络异常 | 镜像名、imagePullSecrets 和事件 |
| CrashLoopBackOff | 进程反复退出、启动命令错误或探针持续失败 | `logs --previous`、退出码和探针事件 |
| OOMKilled | 容器内存超过限制 | 内存限制、峰值、泄漏和运行时参数 |
| ContainerCreating | 镜像、网络或存储仍在准备，也可能已经卡住 | 持续时间以及挂卷、CNI 相关事件 |

`CrashLoopBackOff` 不是根因，而是容器连续失败后的退避状态。必须继续看退出码、上一次日志和事件，区分应用崩溃、配置错误、OOM 与探针误杀。

### Service 可以解析但访问失败，应该检查什么？

先确认 Service 的 selector 是否能匹配目标 Pod，再查看 EndpointSlice 中是否有可用地址。随后核对 `targetPort` 与应用实际监听端口、Pod 的 readiness 状态，以及应用是否只监听了 `127.0.0.1`。

如果端点和端口正确，再检查 NetworkPolicy、kube-proxy 规则、CNI 网络和节点防火墙。应从 Service 对象逐层走到 Pod，避免一开始就重启所有组件。

## 3. 集群高可用

### Node 故障后 Kubernetes 会如何处理？

控制面发现节点长时间不可用后，会把节点标记为异常，并根据工作负载和驱逐策略在其他可用节点上重建受管理的 Pod。新 Pod 是重新创建，不是把原容器原地迁移过去。

恢复速度受节点监测、污点驱逐时间、剩余容量和存储可挂载性影响。单副本应用即使能被重建，也会经历中断；需要持续可用的服务应部署多个副本，并分散到不同节点或故障域。

### 控制面短暂不可用时，业务会发生什么？

已经运行的 Pod 和现有的数据面转发通常还能继续工作，但新的 API 请求无法处理，调度、扩缩容和控制器自愈也会暂停。依赖 API Server 动态获取配置或执行选主的应用可能受到额外影响。

因此，“存量业务继续运行”只是一般情况，不能等同于控制面故障对业务完全无影响。恢复后，各控制器会重新观察状态并继续协调。

### 控制面如何实现高可用？

生产集群通常部署多个 API Server，并在前面使用负载均衡；Controller Manager 和 Scheduler 运行多个副本，通过 Leader Election 保证同一时刻由一个主实例执行关键控制逻辑；etcd 则组成独立的奇数节点集群。

高可用还包括跨故障域部署、证书管理、监控告警和定期备份。组件多副本只能降低单点故障，无法替代可恢复性验证。

### 为什么 etcd 通常部署 3 个或 5 个节点？

etcd 使用 Raft，多数成员在线才能确认写入。3 节点集群可以容忍 1 个节点故障，5 节点可以容忍 2 个；增加到偶数节点通常不会提高可容忍的故障数，却会增加通信和运维成本。

etcd 保存 Kubernetes 的核心状态，应定期生成快照并验证恢复流程。只有备份文件而没有做过恢复演练，仍然不能确认集群状态能够被可靠找回。
