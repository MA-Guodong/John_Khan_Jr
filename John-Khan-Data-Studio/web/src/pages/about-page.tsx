import { ArrowUpRight, Database, GitBranch, Layers, Wrench } from 'lucide-react';
import { useOverview } from '@/api/hooks';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { formatDotDate, formatNumber, spanLabel } from '@/lib/format';
import { usePageTitle } from '@/lib/hooks';

const techStack = [
  { group: '前端', items: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'ECharts', 'TanStack Query'] },
  { group: '后端', items: ['Node.js 20', 'Express', 'SQLite (WASM)', 'Zod', 'Pino'] },
  { group: '工程', items: ['npm workspaces', 'TypeScript 严格模式', 'Node Test Runner', 'REST 契约'] },
];

const notes = [
  {
    icon: Database,
    title: '数据从哪来',
    body: '视频、签名与头像均由 Python 脚本从 Bilibili 抓取，最初存放在 MySQL 中。重构版把旧 dump 解析成 JSON 种子，再写入本地 SQLite，因此不再需要单独安装数据库。',
  },
  {
    icon: Wrench,
    title: '乱码修复',
    body: '旧库表结构使用 latin1，写入的却是 UTF-8 字节，中文在页面上成了「涓夊浗」。导入脚本会按 GBK → UTF-8 还原每个字段，并在标题、签名中逐一校验。',
  },
  {
    icon: Layers,
    title: '统计口径',
    body: '签名包含留空的记录，页面会单独标注；视频时长统一换算为秒后统计；「距上次更新」按服务器当前时间与最后一支视频的发布时间计算。',
  },
  {
    icon: GitBranch,
    title: '工程结构',
    body: 'server 负责校验、聚合与输出 JSON，web 只负责呈现。两者通过明确的 REST 契约解耦，接口可被其他前端或脚本复用。',
  },
];

const structure = `john-khan-data-studio/
├─ data/seed/          # 由旧 dump 生成的 JSON 种子
├─ scripts/            # dump 解析、乱码修复、截图脚本
├─ server/
│  └─ src/
│     ├─ modules/      # videos / signs / avatars / stats
│     ├─ middleware/   # 错误处理、缓存
│     └─ db/           # 建表与种子写入
└─ web/
   └─ src/
      ├─ pages/        # 总览、视频、签名、头像、关于
      ├─ components/   # 图表、卡片、布局
      └─ api/          # 类型化请求与查询 hooks`;

const links = [
  { label: 'Bilibili · 小约翰可汗', href: 'https://space.bilibili.com/23947287', hint: '原始内容' },
  { label: '旧版数据采集脚本', href: 'https://github.com/MA-Guodong/John_Khan_Jr_Python_Projects_MySQL', hint: 'Python · MySQL' },
  { label: '数据来源致谢 · 怕刺', href: 'https://pa.ci/137.html', hint: '早期整理' },
  { label: '作者主页', href: 'https://www.dgweb.top', hint: 'Dong Mu' },
];

export function AboutPage() {
  usePageTitle('关于本站');
  const { data: overview } = useOverview();

  const facts = [
    { label: '视频', value: overview ? formatNumber(overview.totals.videos) : '—', unit: '支' },
    { label: '签名', value: overview ? formatNumber(overview.totals.signs) : '—', unit: '条' },
    { label: '头像', value: overview ? formatNumber(overview.totals.avatars) : '—', unit: '张' },
    {
      label: '首次记录',
      value: overview ? formatDotDate(overview.range.firstActivityAt) : '—',
      unit: overview ? spanLabel(overview.range.spanDays) : '',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="About · 关于"
        title="关于这座档案馆"
        description="一次从「能用」到「愿意多看一眼」的重构。"
      />

      <Card className="relative overflow-hidden p-6 sm:p-8 lg:p-9">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 120% at 100% 0%, rgb(var(--accent) / 0.09), transparent 58%), radial-gradient(80% 100% at 0% 100%, rgb(var(--gold) / 0.07), transparent 55%)',
          }}
        />
        <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)] lg:items-center">
          <div className="prose-khan space-y-4">
            <p className="eyebrow">Why this archive</p>
            <p className="font-serif text-[1.45rem] leading-[1.55] text-ink sm:text-[1.65rem]">
              签名会被覆盖，头像会被替换，视频列表也会一直往下滚。
              如果没有人记录，它们就只是一闪而过。
            </p>
            <p>
              这是一个展示 Bilibili UP 主<strong>小约翰可汗</strong>头像、个性签名与视频列表的小站。
              最初只是为了练习 Node.js 与 MySQL，界面用的是 Bootstrap 表格，代码也写得比较仓促。
            </p>
            <p>
              重构版保留了全部数据与原始信息，同时把工程重写为 <strong>React + TypeScript</strong> 的前端与
              <strong>Express + SQLite</strong> 的后端：指标在服务端聚合，图表在客户端渲染，样式统一为一套
              「纸质档案」的视觉语言，并补上了搜索、筛选、分页与深色模式。
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-6 border-t border-line/80 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">{fact.label}</dt>
                <dd className="mt-1.5 font-serif text-2xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                  {fact.value}
                </dd>
                <p className="mt-1 text-[10.5px] text-muted">{fact.unit}</p>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {notes.map((note) => (
          <Card key={note.title} className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <note.icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <h3 className="text-[13.5px] font-semibold tracking-tight text-ink">{note.title}</h3>
            </div>
            <p className="mt-3 text-[12px] leading-[1.85] text-muted">{note.body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-9">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Stack</p>
            <h2 className="text-lg font-semibold tracking-tight text-ink">技术栈</h2>
          </div>
          <p className="hidden text-[11px] text-muted sm:block">选型原则：零配置启动、类型安全、图表可控</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {techStack.map((stack) => (
            <Card key={stack.group} className="p-5">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted">{stack.group}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {stack.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-line bg-card-muted/70 px-2.5 py-1 text-[11px] text-ink-soft"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-9 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <p className="eyebrow mb-1.5">Structure</p>
            <h3 className="text-[13.5px] font-semibold text-ink">目录结构</h3>
          </div>
          <pre className="overflow-x-auto px-5 py-4 font-mono text-[11px] leading-[1.9] text-ink-soft">
            {structure}
          </pre>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="eyebrow mb-3">Links</p>
            <ul className="divide-y divide-line/70">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-4 py-2.5 text-[12.5px] text-ink-soft transition hover:text-accent"
                  >
                    <span className="min-w-0 truncate">{link.label}</span>
                    <span className="flex shrink-0 items-center gap-2 text-[10px] text-muted">
                      {link.hint}
                      <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <p className="eyebrow mb-3">Run Locally</p>
            <div className="space-y-2 font-mono text-[11px] text-ink-soft">
              <p className="rounded-lg bg-card-muted/70 px-3 py-2">npm install</p>
              <p className="rounded-lg bg-card-muted/70 px-3 py-2">npm run dev</p>
              <p className="rounded-lg bg-card-muted/70 px-3 py-2">
                npm run build && npm start
              </p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              开发时前端运行在 5173 端口并代理 <code className="font-mono">/api</code>；
              构建后由后端同一个端口托管页面与接口。
            </p>
          </Card>
        </div>
      </section>

      <section className="mt-9">
        <Card className="p-6 sm:p-8">
          <p className="eyebrow mb-3">Credits</p>
          <p className="text-[12.5px] leading-[1.9] text-muted">
            数据与部分采集思路来自
            <a
              className="mx-1 text-accent underline decoration-accent/30 underline-offset-4"
              href="https://pa.ci/137.html"
              target="_blank"
              rel="noreferrer"
            >
              怕刺
            </a>
            的整理；人物、视频与头像版权归
            <a
              className="mx-1 text-accent underline decoration-accent/30 underline-offset-4"
              href="https://space.bilibili.com/23947287"
              target="_blank"
              rel="noreferrer"
            >
              小约翰可汗
            </a>
            及 Bilibili 所有。本站仅用于学习与研究，不提供任何商业服务，如涉及版权问题请联系删除。
          </p>
        </Card>
      </section>
    </>
  );
}
