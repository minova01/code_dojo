---
title: "Go 基础知识"
description: "Go 语言基础、并发模型、内存管理与垃圾回收常见知识点。"
tags: ["Go", "Backend", "Concurrency"]
draft: false
---

# Go 八股文

## 目录

- [一、Go 语言基础](#一-go-语言基础)
  - [1. 语言与运行时基础](#1-语言与运行时基础)
  - [2. 数组、Slice 与 Map](#2-数组-slice-与-map)
  - [3. 函数、闭包与 defer](#3-函数-闭包与-defer)
  - [4. 接口、泛型与 Context](#4-接口-泛型与-context)
- [二、协程与并发](#二-协程与并发)
  - [1. 基础概念](#1-基础概念)
  - [2. GMP 调度模型](#2-gmp-调度模型)
  - [3. Channel 与 CSP](#3-channel-与-csp)
  - [4. 同步原语](#4-同步原语)
  - [5. 错误处理与问题排查](#5-错误处理与问题排查)
- [三、垃圾回收与内存](#三-垃圾回收与内存)
- [四、项目与手撕](#四-项目与手撕)

# 一、Go 语言基础

## 1. 语言与运行时基础

### Go 有哪些主要特点？

Go 的语法和工程工具相对统一，编译速度快，也容易生成单一可执行文件。它通过 Goroutine、Channel 和运行时调度器提供轻量并发，因此常用于网络服务、微服务和云原生基础设施。

Go 也提供自动垃圾回收。开发者通常不需要手动管理内存，但仍应理解逃逸、对象生命周期和 GC 成本。

### 值类型和引用类型有什么区别？

Go 中的赋值默认按值复制。不同类型被复制后，表现会有所区别：

- 数字、布尔值、结构体和数组会复制完整的值。
- Slice 会复制切片描述符，其中包含底层数组指针、长度和容量。
- Map 和 Channel 的变量保存运行时数据结构的引用。
- 指针复制后，多个指针仍可能指向同一个对象。

因此，将 Slice、Map 称为“引用类型”有助于理解共享行为，但更准确的说法是：变量本身仍然按值传递，只是复制后的值可能引用同一份底层数据。

### Struct Tag 有什么用？

Struct Tag 用于给字段附加元数据。常见用途包括 JSON 字段名、数据库列名和参数校验规则。

```go
type User struct {
    ID   int64  `json:"id" db:"id"`
    Name string `json:"name" db:"name"`
}
```

Tag 本身不会改变字段行为，具体含义由 `encoding/json`、ORM 或校验库等读取方解释。

### `make` 和 `new` 有什么区别？

`new(T)` 为类型 `T` 分配空间，将其置为零值，并返回 `*T`。

```go
p := new(int)
fmt.Println(*p) // 0
```

`make` 只用于 Slice、Map 和 Channel。它会创建并初始化这些类型所需的运行时数据结构，返回的仍是该类型本身，而不是指针。

```go
numbers := make([]int, 3, 5)
users := make(map[string]User)
jobs := make(chan Job, 10)
```

### 多返回值如何理解？

Go 函数可以返回多个值，常用于同时返回结果和错误：

```go
func findUser(id int64) (User, error) {
    // ...
}
```

具体调用约定由编译器和目标平台决定。理解业务代码时，只需把它看作函数返回值的一部分，不要依赖“必定在栈帧预留空间”等实现细节。

### `init` 在什么时候执行？

包初始化发生在 `main.main` 之前，大致顺序如下：

1. 初始化被导入的依赖包。
2. 按依赖关系初始化当前包的包级变量。
3. 执行当前包中的 `init` 函数。
4. 所有包初始化完成后执行 `main.main`。

一个包可以声明多个 `init`，但不宜在其中放置难以观察或可能失败的复杂业务逻辑。

## 2. 数组、Slice 与 Map

### 数组和 Slice 有什么区别？

数组长度属于类型的一部分。`[3]int` 和 `[4]int` 是不同类型，数组赋值会复制全部元素。

Slice 是对底层数组一段连续区域的描述，包含指向底层数组的指针、当前长度 `len` 和当前容量 `cap`。

```go
a := make([]int, 2)    // len=2, cap=2，元素均为 0
b := make([]int, 3, 5) // len=3, cap=5，可直接访问前三个元素
```

`append` 从当前长度之后追加元素。上面的 `b` 还能在原底层数组中追加两个元素，之后再次追加通常需要分配新的底层数组。

> 切片扩容策略属于运行时实现细节，并不是固定的“1024 以下翻倍、以上增长 1.25 倍”。业务代码不应依赖具体扩容倍数。

### 截取或复制 Slice 后，修改会影响原 Slice 吗？

从一个 Slice 截取出的新 Slice 通常与原 Slice 共享底层数组：

```go
source := []int{1, 2, 3, 4}
part := source[1:3]
part[0] = 20

fmt.Println(source) // [1 20 3 4]
```

如果 `append` 触发扩容，新 Slice 会指向新数组，之后修改新数组便不会影响原数组。是否扩容取决于追加后的长度和当前容量，不能仅凭“调用了 append”判断。

如果希望明确断开共享关系，可以复制数据：

```go
copied := append([]int(nil), part...)
```

一个很小的 Slice 也可能长期引用一个很大的底层数组，导致整块数组无法被 GC 回收。需要长期保存少量数据时，可以主动复制。

### 并发读写 Slice 有什么问题？

多个 Goroutine 在没有同步的情况下读写同一底层数组会产生数据竞争。并发 `append` 更危险，因为扩容可能让不同 Goroutine 分别操作新旧数组。

常见处理方式有：

- 用互斥锁保护 Slice。
- 每个 Goroutine 只处理独立的数据分片。
- 通过 Channel 汇总结果，让单个 Goroutine 负责写入。

可以使用竞态检测器检查这类问题：

```bash
go test -race ./...
```

### Map 的底层结构是什么？

Go Map 基于哈希表实现。运行时根据 Key 的哈希值定位桶，再在桶内查找具体条目；冲突过多时会使用额外的溢出桶。

Map 扩容采用渐进迁移，避免一次搬迁全部数据造成长时间停顿。具体桶结构和迁移算法属于运行时实现，不应被业务代码依赖。

普通 Map 不支持无同步的并发读写。发生并发读写时，除了数据竞争，还可能触发运行时错误：

```text
fatal error: concurrent map read and map write
```

常见处理方式是使用 `sync.RWMutex` 保护普通 Map，或者在适合的场景下使用 `sync.Map`。

### Map 如何保证并发安全？

`sync.Map` 适合一个 Key 写入一次、读取多次的缓存，或者多个 Goroutine 操作彼此独立 Key 的场景。

它通过只读快照和需要加锁的脏数据区域降低部分读取路径的锁竞争。它并不是普通 Map 的通用替代品；当 Key、Value 类型固定且需要维护复合约束时，`map + mutex` 通常更清晰。

```go
var users sync.Map

users.Store("alice", 18)

value, ok := users.Load("alice")
if ok {
    fmt.Println(value)
}

users.Delete("alice")
```

## 3. 函数、闭包与 `defer`

### 什么是闭包？

闭包是一个函数以及它引用的外部变量。即使定义该变量的函数已经返回，只要闭包仍然引用它，变量就会继续存活。

```go
func counter() func() int {
    count := 0

    return func() int {
        count++
        return count
    }
}
```

闭包很适合保存少量状态，但也可能延长对象生命周期。并发调用同一个闭包时，如果它会修改共享变量，仍然需要同步。

### `defer` 的执行规则是什么？

`defer` 注册的函数会在当前函数返回前执行。多个 `defer` 按后进先出的顺序执行。

```go
func readFile(name string) error {
    file, err := os.Open(name)
    if err != nil {
        return err
    }
    defer file.Close()

    // 使用 file
    return nil
}
```

执行 `defer` 时，传给延迟函数的参数会立即求值。命名返回值可以在 `defer` 中被修改，但这种写法容易降低可读性，应谨慎使用。

在长循环中直接使用 `defer`，资源通常要等外层函数返回才释放。可以把单次循环逻辑提取成小函数，让每次迭代及时执行 `defer`。

## 4. 接口、泛型与 Context

### Go 接口如何实现？

Go 采用隐式接口实现。一个类型只要实现接口要求的全部方法，就满足该接口，不需要额外声明。

```go
type Speaker interface {
    Speak()
}

type Dog struct{}

func (Dog) Speak() {}

func saySomething(s Speaker) {
    s.Speak()
}
```

接口最好由使用行为的一方定义，并保持小而明确。这样可以降低调用方与具体实现之间的耦合。

### 接口为什么可能不等于 `nil`？

接口值包含动态类型和动态值。只有两者都为空时，接口才等于 `nil`。

```go
var user *User = nil
var value any = user

fmt.Println(user == nil)  // true
fmt.Println(value == nil) // false
```

这里 `value` 的动态类型是 `*User`，动态值是 `nil`，所以接口本身不等于 `nil`。返回接口类型时，需要特别留意“带类型的 nil”。

### `any` 和泛型应该如何选择？

`any` 是 `interface{}` 的别名，可以接收任意类型，但使用具体值时通常需要类型断言或类型分支。

```go
func printValue(value any) {
    fmt.Println(value)
}
```

泛型通过类型参数为一组类型提供编译期检查。只需要临时接收未知数据时可以使用 `any`；如果算法要求输入类型之间保持一致，泛型通常更合适。

```go
func First[T any](values []T) (T, bool) {
    if len(values) == 0 {
        var zero T
        return zero, false
    }
    return values[0], true
}
```

### Context 常用来做什么？

Context 用于在调用链中传递取消信号、截止时间和与单次请求相关的少量元数据，例如 Trace ID。

```go
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

select {
case result := <-resultCh:
    fmt.Println(result)
case <-ctx.Done():
    return ctx.Err()
}
```

取消父 Context 会级联取消它派生出的子 Context。取消只是通知，任务必须主动监听 `ctx.Done()`，并尽快停止工作。

Context 通常作为函数的第一个参数传入，不应存入结构体，也不适合传递可选业务参数。

### 父 Context 取消后，子 Context 会怎样？

父 Context 取消后，取消信号会沿派生关系向下传播，所有子 Context 的 `Done()` 都会关闭。监听这些 Channel 的 Goroutine 会被唤醒，再由任务自己结束执行。

### `Done()` 为什么返回 Channel？

关闭 Channel 可以同时通知所有接收方，并且能直接放进 `select`。部分 Context 永远不会取消，因此 `Done()` 允许返回 `nil`；可取消 Context 的 Done Channel 也会按需创建，避免没有监听者时产生多余分配。

# 二、协程与并发

## 1. 基础概念

### 进程、线程和 Goroutine 有什么区别？

- 进程拥有独立的地址空间和系统资源，隔离性较强。
- 线程是操作系统调度 CPU 的基本执行单元，同一进程内的线程共享内存。
- Goroutine 是由 Go Runtime 管理的轻量执行单元，多个 Goroutine 会复用较少数量的系统线程。

Goroutine 的创建和切换通常比系统线程便宜，栈也会按需增长。但它并不是“没有成本”：数量过多仍会消耗内存、增加调度压力，并放大泄漏风险。

```go
go handleRequest(request)
```

## 2. GMP 调度模型

### G、M、P 分别代表什么？

Go 调度器常用 G、M、P 描述运行关系：

- G（Goroutine）保存执行状态、栈和调度信息。
- M（Machine）对应操作系统线程，真正执行指令。
- P（Processor）持有执行 Go 代码需要的调度资源和本地运行队列。

M 必须获得 P 才能执行 Go 代码。P 的数量由 `GOMAXPROCS` 控制，也决定了同一时刻最多有多少个 Goroutine 并行执行 Go 代码。

每个 P 都有本地运行队列。当本地队列为空时，调度器还会检查全局队列、网络轮询器和定时器，并尝试从其他 P 的队列中窃取一部分任务。

当 G 进入阻塞系统调用时，M 可能随之阻塞。Runtime 可以把 P 与该 M 解绑，再交给其他 M 执行剩余的 G。系统调用返回后，原 M 会尝试重新获得 P；如果没有可用 P，G 会回到可运行队列。

运行时间过长的 G 可以被抢占，使其他 G 获得执行机会。抢占机制属于 Runtime 细节，业务代码仍应避免无限循环和无法取消的长任务。

### P 的数量由什么决定？

P 的数量由 `GOMAXPROCS` 决定。它控制同一时刻最多有多少个 Goroutine 并行执行 Go 代码，可以在运行时修改。现代 Go 会根据可用 CPU 和运行环境选择默认值。

### M 进入阻塞系统调用后，G 和 P 会怎样？

G 和当前 M 会一起进入系统调用。Runtime 会尽量把 P 解绑并交给其他 M，继续执行队列中的 G。系统调用结束后，原 M 会尝试重新获得 P；如果没有可用 P，就把 G 放回可运行队列。

### P 的本地队列为空时怎么办？

调度器会继续检查全局运行队列、网络轮询器、定时器和 GC Worker，也会尝试从其他 P 的队列中窃取任务。如果仍然没有工作，M 会进入自旋或休眠状态，等待新任务出现。

## 3. Channel 与 CSP

### Channel 的作用是什么？

Channel 用于 Goroutine 之间传递数据和同步执行。Go 常用一句话概括这种并发风格：不要通过共享内存通信，而应通过通信共享内存。

无缓冲 Channel 要求发送方与接收方同时准备好：

```go
ch := make(chan int)
```

有缓冲 Channel 内部可以暂存有限数量的元素：

```go
ch := make(chan int, 10)
```

- 缓冲区未满时，发送通常不会阻塞。
- 缓冲区为空时，接收会阻塞。
- 缓冲区已满时，发送会阻塞。

只发送或只接收的 Channel 类型可以限制函数的使用方向：

```go
func produce(out chan<- int) { out <- 1 }
func consume(in <-chan int)  { fmt.Println(<-in) }
```

关闭 Channel 表示发送方不会再发送新值。接收方仍可以读完缓冲区中的数据，并通过第二个返回值判断 Channel 是否已经关闭：

```go
value, ok := <-ch
if !ok {
    // Channel 已关闭且缓冲区已读空
}
```

不要向已关闭的 Channel 发送数据，也不要重复关闭。通常应由发送方负责关闭 Channel。

### 已关闭的 Channel 还能读取吗？

可以。关闭后仍能读出缓冲区中尚未消费的数据；缓冲区读空后，接收操作会立即返回元素类型的零值，并将 `ok` 设为 `false`。向已关闭的 Channel 发送数据会触发 Panic。

### Channel 如何控制并发数量？

可以把固定容量的 Channel 当作信号量。任务开始前向 Channel 发送一个空结构体，占用一个名额；任务结束后接收一个值，释放名额。缓冲区满时，新的任务会阻塞，从而限制同时运行的 Goroutine 数量。

### `select` 用在什么场景？

`select` 等待多个 Channel 操作，并从已经就绪的 Case 中选择一个执行。多个 Case 同时就绪时，选择不是按源码顺序固定进行的。

```go
select {
case message := <-messages:
    fmt.Println(message)
case <-ctx.Done():
    return ctx.Err()
}
```

单独的 `select` 只处理一次事件。需要持续监听时，可以使用 `for + select`：

```go
for {
    select {
    case job := <-jobs:
        handle(job)
    case <-ctx.Done():
        return
    }
}
```

一次性超时可以使用 `time.NewTimer` 或 `context.WithTimeout`。在频繁循环中反复调用 `time.After` 会不断创建计时器，应根据场景复用 Timer。

### 为什么持续监听要使用 `for + select`？

一次 `select` 只处理一个就绪事件，执行完对应 Case 后就会结束。外层加上 `for`，才能回到等待状态，持续处理任务、取消和超时等事件。普通 `if` 不能阻塞等待多个 Channel，还容易产生忙轮询和竞态。

## 4. 同步原语

### `sync.WaitGroup` 如何使用？

WaitGroup 用于等待一组 Goroutine 完成。`Add` 应在启动 Goroutine 之前调用，任务结束时调用 `Done`，最后由等待方调用 `Wait`。

```go
var wg sync.WaitGroup

for i := 0; i < 3; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        fmt.Println("task:", id)
    }(i)
}

wg.Wait()
```

WaitGroup 不传播错误，也不负责取消任务。如果并发任务属于同一调用链并且可能失败，可以结合 Context，或使用 `errgroup.WithContext`。

### `sync.Once` 如何保证只执行一次？

`sync.Once` 保证一个函数最多执行一次，常用于延迟初始化：

```go
var once sync.Once

func config() *Config {
    once.Do(func() {
        globalConfig = loadConfig()
    })
    return globalConfig
}
```

`sync.Once` 内部结合原子状态和互斥机制保证并发安全。如果传入的函数发生 Panic，这次调用仍被视为已经执行。

### `sync.Pool` 适合什么场景？

`sync.Pool` 用于复用临时对象，减少高频分配带来的 GC 压力。例如编码缓冲区或短生命周期的临时结构。

Pool 中的对象可能在任意一次 GC 时被移除，因此不能用于保存连接、配置或其他必须长期存在的业务状态。使用前也应确认对象复用确实带来收益，而不是预先优化。

### 原子操作和锁如何选择？

原子操作适合单个数值或指针的简单状态变化。互斥锁适合保护一段临界区，以及必须保持一致的多个字段。

如果一项操作需要“检查后修改”多个状态，单独把每个字段改为原子变量并不一定能保持整体一致性。

## 5. 错误处理与问题排查

### 子 Goroutine 发生 Panic，主 Goroutine 能捕获吗？

`recover` 只能捕获当前 Goroutine 调用栈中的 Panic，不能跨 Goroutine 捕获。因此需要在启动的 Goroutine 内部处理：

```go
go func() {
    defer func() {
        if value := recover(); value != nil {
            log.Printf("worker panic: %v", value)
        }
    }()

    doTask()
}()
```

是否恢复 Panic 取决于程序边界。对于普通可预期错误，应返回 `error`；不要把 Panic 当作常规控制流程。

多个并发任务存在依赖时，常见做法是：任意任务返回错误后取消共享 Context，其他任务监听取消信号并退出，主流程统一接收错误。

### 哪些情况会造成 Goroutine 泄漏？

以下情况容易让 Goroutine 长期无法退出：

- 向没有接收方的 Channel 发送数据。
- 等待一个永远不会产生数据或关闭的 Channel。
- 后台循环没有退出条件。
- 创建了可取消的 Context，却忘记调用 `cancel`。
- 下游阻塞后，上游仍在持续生产数据。

排查时可以先观察 Goroutine 数量是否持续上升，再抓取 Goroutine Profile：

```text
/debug/pprof/goroutine?debug=1
```

如果大量 Goroutine 停留在相同调用栈和同一行代码，应重点检查该阻塞点的退出条件。

# 三、垃圾回收与内存

## 逃逸分析

编译器通过逃逸分析判断变量可以留在栈上，还是必须分配到堆上。变量离开函数后仍可能被引用、被接口装箱，或者体积和使用方式不适合放在栈上时，都可能逃逸。

可以用编译器参数查看分析结果：

```bash
go build -gcflags="-m -m" ./...
```

不要为了避免逃逸而牺牲代码结构。应先通过 Benchmark 和 Profile 找到真实的分配热点，再做针对性优化。

## Go GC 的基本流程

Go GC 采用并发标记清扫。一次回收大致包括：

1. 从全局变量、Goroutine 栈等根对象出发查找可达对象。
2. 使用三色标记模型并发标记存活对象。
3. 通过写屏障记录标记期间发生的指针变化。
4. 清扫未被标记的对象并回收其内存。

Go 的常规 GC 不会像标记整理算法那样移动所有存活对象。因此，不能把 Go GC 描述为“标记后把对象整理到连续空间”。

## 三色标记法

三色是对标记状态的抽象：

- 白色：尚未确认可达。
- 灰色：对象本身已经确认可达，但它引用的对象还没有全部扫描。
- 黑色：对象及其引用已经扫描完成。

标记结束后仍为白色的对象会被视为不可达，并在清扫阶段回收。

## 写屏障解决什么问题？

GC 与用户代码并发运行时，用户代码可能修改对象之间的引用。写屏障会在指针写入时执行额外逻辑，帮助 GC 维护标记正确性，避免仍然存活的对象被漏标。

现代 Go 使用混合写屏障降低并发标记结束阶段重新扫描全部 Goroutine 栈的需求。具体屏障算法属于 Runtime 实现细节，理解它解决的核心问题即可：标记过程中引用关系仍在变化。

## STW 在什么时候发生？

STW（Stop The World）表示 Runtime 暂停用户 Goroutine。Go 的并发 GC 仍需要短暂的全局暂停，主要出现在标记开始和标记终止等需要一致状态的阶段。

降低 GC 影响的重点通常是减少无意义分配、控制存活对象规模和避免内存持续增长，而不是在业务代码中频繁手动触发 GC。

## GC 在什么时候触发？

GC 可能因以下原因启动：

- 堆内存增长达到 Runtime 根据 `GOGC` 计算出的目标。
- `GOMEMLIMIT` 等内存限制促使 Runtime 更积极地回收。
- Runtime 为避免长时间不回收而周期性触发。
- 程序显式调用 `runtime.GC()`。

业务代码通常不应频繁调用 `runtime.GC()`。如果服务内存异常，应先用 Heap Profile 和分配指标定位原因。

# 四、项目与手撕

## 手撕题

### 如何让两个 Goroutine 按自然数顺序交替打印奇偶数？

使用两个无缓冲 Channel 传递执行权。奇数 Goroutine 打印完成后通知偶数 Goroutine，偶数打印完成后再把执行权交还给奇数 Goroutine。

```go
func main() {
    const max = 10

    oddCh := make(chan struct{})
    evenCh := make(chan struct{})
    done := make(chan struct{})

    go func() {
        for i := 1; i <= max; i += 2 {
            <-oddCh
            fmt.Println(i)
            if i+1 <= max {
                evenCh <- struct{}{}
            } else {
                close(done)
            }
        }
    }()

    go func() {
        for i := 2; i <= max; i += 2 {
            <-evenCh
            fmt.Println(i)
            if i+1 <= max {
                oddCh <- struct{}{}
            } else {
                close(done)
            }
        }
    }()

    oddCh <- struct{}{}
    <-done
}
```

这里的两个 Channel 只负责传递执行顺序，`done` 用于通知主 Goroutine 所有数字已经打印完成。

### 如何限制并发数量？

容量固定的 Channel 可以作为信号量。下面的代码允许最多十个任务同时执行，并等待全部任务结束：

```go
limit := make(chan struct{}, 10)
var wg sync.WaitGroup

for i := 0; i < 100; i++ {
    wg.Add(1)
    limit <- struct{}{}

    go func(id int) {
        defer wg.Done()
        defer func() { <-limit }()

        handle(id)
    }(i)
}

wg.Wait()
```

生产代码还应处理 Context 取消，避免主流程在向 `limit` 发送时永久阻塞。

### 1000 个任务只用 5 个 Goroutine，怎么实现？

如果任务很多但希望固定 Worker 数量，可以让多个 Worker 共享一个任务 Channel：

```go
jobs := make(chan int)
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        for job := range jobs {
            handle(job)
        }
    }()
}

for i := 0; i < 1000; i++ {
    jobs <- i
}
close(jobs)
wg.Wait()
```

这里由生产者在不再发送任务后关闭 `jobs`。Worker 使用 `range` 读取，直到缓冲数据耗尽且 Channel 关闭。

### 如何等待一组任务，并在超时后退出？

WaitGroup 本身没有超时和取消能力。可以用单独的完成 Channel 与 Context 组合等待：

```go
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()

var wg sync.WaitGroup
for i := 0; i < 20; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()

        select {
        case <-time.After(2 * time.Second):
            fmt.Println("done:", id)
        case <-ctx.Done():
            return
        }
    }(i)
}

done := make(chan struct{})
go func() {
    wg.Wait()
    close(done)
}()

select {
case <-done:
    fmt.Println("全部任务完成")
case <-ctx.Done():
    fmt.Println("任务超时:", ctx.Err())
}
```

关键点是任务本身也要监听 `ctx.Done()`。如果主流程只是停止等待，而 Worker 仍继续执行，就没有真正完成取消。
