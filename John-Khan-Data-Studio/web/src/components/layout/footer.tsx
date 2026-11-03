export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line/80 px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-4 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          数据来源于 Bilibili，收录自 2020 年。仅供学习与研究，人物与作品版权归原作者所有。
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono tracking-wide">© {year} 小约翰可汗数据档案馆</span>
          <a
            href="https://www.dgweb.top"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-ink"
          >
            Designed by Dong Mu
          </a>
          <a
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-ink"
          >
            陇ICP备2024006332号-1
          </a>
        </div>
      </div>
    </footer>
  );
}
