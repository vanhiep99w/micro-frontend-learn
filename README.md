# Micro-frontend Learning

Site tài liệu tiếng Việt dùng Next.js App Router, Fumadocs MDX/UI và Tailwind CSS v4.

Có **81 trang MDX** tiếng Việt trong 12 nhóm, từ nền tảng đến production và troubleshooting.
Đây là repository tài liệu, không phải workspace chạy ứng dụng shop trong các bài lab.
Sơ đồ D2, 5 learning components và Source Explorer dùng đúng `@vanhiep99w/docs-kit@0.9.0` từ npm registry.

## Chạy trên máy có mạng

Dùng Node.js 22 trở lên (`.nvmrc` chọn Node 22):

```bash
npm install
npm run dev
```

Mở http://localhost:3000/docs. Đường dẫn `/` chuyển đến `/docs`.

`npm install` chạy `postinstall` để sinh `.source/`; không viết tay hoặc commit thư mục đó.
`npm run dev` và `npm run build` tự sinh assets Source Explorer trước khi chạy Next.js.
Khi dev chạy, watcher theo dõi MDX và registry, tự sinh lại assets sau khi lưu.
Drawer đang mở cũng tự cập nhật theo revision, không cần reload trang. Bản production
không polling. Nếu bản nháp có reference sai, watcher báo lỗi và giữ assets hợp lệ gần nhất;
sửa lỗi rồi lưu để tiếp tục. Có thể chạy riêng `npm run watch:source` nếu không dùng lệnh dev.

Kiểm tra sau khi cài:

```bash
npm run check:docs
npm run check:source
npm run check:visuals
npm test
npm run typecheck
npm run build
npm run check:export
```

Build xuất các assets vào `out/`. Để preview bản build trên máy có mạng,
chạy `npm run preview` và mở http://127.0.0.1:3210/docs. Server preview xử lý cả
HTML extensionless và RSC assets của Next export. Không dùng `next start` với static export.

Commit `package-lock.json` sau khi cài và kiểm tra thành công để cố định dependency graph.

## Deploy lên Cloudflare Pages

Trong **Workers & Pages → project → Settings → Build**, đặt:

| Cấu hình | Giá trị |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build && npm run check:export` |
| Build output directory | `out` |
| Root directory | Gốc repo (để trống nếu dashboard đã mặc định) |
| Production branch | `main` |
| Node.js | 22+ |

Lưu settings rồi deploy commit mới. `dist/` chỉ chứa ZIP đóng gói mã nguồn,
không phải assets để publish. `.next/` cũng không phải output cho static Pages.

`next.config.mjs` bật `output: 'export'`. `/api/search.json` được sinh tại build time;
search dialog tải index đó và tìm kiếm trên trình duyệt, không cần Pages Functions.
`dynamicParams = false` khiến slug không có trong tài liệu trả về 404.

Các cảnh báo CSS `::highlight(fd-search)` trong log không làm build thất bại.
Không đổi thành `:highlight`: `::highlight()` là pseudo-element của CSS Custom Highlight API.
Lỗi deploy ban đầu là **output directory `dist` không tồn tại**.

Nếu thêm tính năng cần SSR, cookies, Server Actions hoặc API runtime về sau,
phải đổi mô hình hosting; không chỉ đổi output directory sang `.next`.

Tham khảo [Cloudflare Pages: Next.js static export](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

## Lộ trình

| Thư mục | Nhóm | Bài chi tiết |
| --- | --- | ---: |
| `nen-tang` | Nền tảng | 5 |
| `bat-dau` | Bắt đầu | 5 |
| `kien-truc` | Kiến trúc và ranh giới | 6 |
| `module-federation` | Module Federation | 6 |
| `cac-cach-tich-hop` | Các cách tích hợp khác | 5 |
| `giao-tiep-va-trang-thai` | Giao tiếp và trạng thái | 6 |
| `ui-va-framework` | UI và framework | 7 |
| `kiem-thu-va-tooling` | Kiểm thử và tooling | 6 |
| `trien-khai` | Triển khai | 6 |
| `production` | Production | 5 |
| `thuc-hanh` | Thực hành | 5 |
| `troubleshooting` | Xử lý sự cố | 6 |

Đọc [trang lộ trình](content/docs/index.mdx) để xem liên kết giữa các nhóm.

## Viết chi tiết từng bài

Bắt đầu ở `content/docs/nen-tang/micro-frontend-la-gi.mdx`.

Bạn có thể yêu cầu: **“Dùng fumadocs-technical-writer viết chi tiết bài Micro-frontend là gì?”**

- Giữ frontmatter `title` và `description`; không thêm H1 trùng tiêu đề.
- Giữ mục lục thủ công ngay trước phần nội dung, cập nhật anchors khi đổi headings.
- Giữ phạm vi và prerequisite của từng bài; các snippet lab không phải code chạy trong site docs.
- Mỗi nhóm dùng `index.mdx` làm landing page và `meta.json` để xếp sidebar.
- Khi thêm hoặc đổi slug, cập nhật `meta.json` cùng các liên kết.
- `Callout` và các thành phần MDX mặc định được đăng ký trong `mdx-components.tsx`.
- Viết sơ đồ kiến trúc/flow/lifecycle bằng fenced `d2`; giữ cây thư mục, log, URL và công thức ở dạng text khi phù hợp. Mermaid không được cấu hình.

## D2, learning components và Source Explorer

### Sơ đồ D2

`source.config.ts` đăng ký `remarkD2`; `mdx-components.tsx` đăng ký `D2Diagram`.
CSS light/dark được import trong `app/global.css`. D2 compile thành SVG lúc build,
không tải renderer/WASM xuống browser, không cần D2 CLI hay dịch vụ render.
Cache nằm ở `.next/cache/docs-kit/d2`, dùng chung cache build Next.js trên CI.

````mdx
```d2 title="Catalog gửi command qua public boundary"
direction: right
catalog: Catalog UI
cart: Cart controller
catalog -> cart: addItem
```
````

Dùng nhãn ngắn; tách flow dài thành giai đoạn. Diagram cuộn ngang trên màn hình nhỏ.
Chỉ compile source D2 đáng tin cậy trong repository vì SVG được nhúng trực tiếp.

### Learning components

`source.config.ts`, `mdx-components.tsx` và `app/global.css` đăng ký đồng bộ plugin,
component và CSS cho cả 5 loại fence. Descriptor YAML được validate khi build,
không thực thi lệnh, code hoặc HTTP request:

| Fence | Dùng khi cần giải thích | Ví dụ trong curriculum |
| --- | --- | --- |
| `code-walkthrough` | Từng bước đọc source và highlight dòng | Shared dependencies: async bootstrap |
| `code-diff` | Thay đổi chính xác trước/sau | Remote không tải: sửa `publicPath` |
| `terminal-session` | Command, môi trường chạy và kết quả kỳ vọng | Chạy local: kiểm tra container entry |
| `protocol-exchange` | HTTP request/response và các biến thể | Caching: lấy config rồi revalidation `304` |
| `span-waterfall` | Start/duration, overlap và provenance | Performance: chuỗi nối tiếp giả định `730 ms` |

Không ép code, log, payload hay cây thư mục vào diagram/viewer. Giữ thông tin thiết yếu
trong prose bao quanh; số giả định không phải benchmark. `D2InteractiveDiagram` cũng
được đăng ký cho fence opt-in khi thật sự cần khám phá sơ đồ lớn; các sơ đồ hiện tại
ưu tiên SVG tĩnh.

Icons React/Vue lấy từ catalog https://icons.d2lang.com/, lưu bản đã rà soát và checksum
trong `content/d2-icons/README.md`. D2 nhúng data URL lúc build qua `assetsRoot`, không
gọi catalog ở browser. Không dùng icon AngularJS cho Angular hiện đại.

### Kiểm kê diagram

`docs-kit-inventory.json` ghi số fence theo từng tài liệu và 5 text artifacts được giữ
lại có lý do rõ ràng (incident template, Network/Console evidence và 2 cây thư mục).
Bài Routing đã chuyển 5 bản đồ/luồng Unicode còn sót sang D2, gồm trạng thái shell
router chưa cập nhật và Back hai lần. Tổng curriculum: **143 D2, 0 Mermaid, không còn
ASCII/Unicode diagram đã nhận diện chưa chuyển**, 5 ví dụ learning components.

```bash
npm run check:visuals
# Sau khi review thay đổi nội dung, cập nhật snapshot kiểm kê:
node scripts/docs-kit-audit.mjs --write
```

Audit dùng Markdown/MDX AST, không nhầm code/HTML comments hoặc log có mũi tên với
sơ đồ. Nó chặn Mermaid và text/box-diagram candidates mới chưa được review; đây là
regression guard dựa trên dấu hiệu, không thay thế semantic review mọi code fence.
`npm test` chạy audit và parsers của docs-kit; `check:export` kiểm tra đủ mọi figure,
5 learning components, icons đã nhúng và Source Explorer trong HTML export.

### Source Explorer

`app/source-provider.tsx` bọc layout bằng provider client, dùng pathname để reset khi
chuyển bài. Drawer lazy-load code và JSON khi mở; hỗ trợ tree, highlight region,
copy và deep link. Không chạy source trong viewer.

Nguồn chuẩn vẫn là **code fence trong MDX**, không có bản sao code phải sửa riêng:

1. Thêm project vào `source-examples/registry.json`: `id`, `title`, `doc` tương đối
   với `content/docs/`, `defaultFile`.
2. Đánh dấu các fence thuộc ví dụ bằng `sourceFile` và `sourceRegion`.
3. Thêm `SourceRef` trong bài để mở đúng file/region.
4. Chạy `npm run build:source` và `npm run check:source`.

````mdx
```ts title="src/main.ts" sourceFile="src/main.ts" sourceRegion="entry"
console.log('Ví dụ');
```

<SourceRef project="demo" file="src/main.ts" region="entry">
  Đối chiếu entry
</SourceRef>
````

`demo` ở trên phải có entry trong registry trước khi dùng. Không cần import
`SourceRef` từng bài. Dùng `variant="button"` cho nút mở cả ví dụ; bỏ `file` để chọn
`defaultFile`. Có thể dùng `lines="1-4"` thay cho `region`, không dùng cả hai.

Các fence cùng `sourceFile` được nối theo thứ tự trong bài, ngăn bởi một dòng trống;
mỗi `sourceRegion` phải duy nhất trong file. Dùng tên file khác cho biến thể độc lập,
không nối những bản config thay thế nhau. Các trích đoạn cấu hình được đặt trong
`fragments/`; đây là **source tham chiếu**, không phải cam kết project chạy độc lập.
Các bài dùng schema ngắn (`defaultFile` ở project) giữ snapshot `document` với nhãn
“Code trong bài”; các deep link cũ vẫn hoạt động.

### Nhiều snapshot cho các phương án khác nhau

Dùng `defaultSnapshot` và `snapshots` trong registry khi bài có nhiều phương án.
Mỗi snapshot khai báo `defaultFile` riêng; không đồng thời đặt `defaultFile` ở project:

```json
{
  "id": "demo",
  "title": "Demo",
  "doc": "demo.mdx",
  "defaultSnapshot": "basic",
  "snapshots": [
    { "id": "basic", "title": "Cơ bản", "defaultFile": "src/main.ts" },
    { "id": "advanced", "title": "Nâng cao", "defaultFile": "src/main.ts" }
  ]
}
```

Thêm `sourceSnapshot="advanced"` vào metadata fence và `snapshot="advanced"` vào
`SourceRef` tương ứng. Fence không có `sourceSnapshot` chỉ thuộc snapshot mặc định,
**không tự xuất hiện ở mọi snapshot**. Các fence cùng đường dẫn chỉ được nối trong
cùng snapshot; region có thể trùng tên giữa các snapshot khác nhau.

Hiện các bài Web Components, Types/contracts và Local development đã tách phương án
thành snapshot riêng. Dropdown **Phiên bản** của drawer chọn đúng tập file, không
trộn ambient types với generated types hoặc MSW với proxy backend.

Assets snapshot có tên chứa content hash. Pipeline ghi assets trước rồi mới cập nhật
manifest/revision bằng atomic rename; watcher không xóa assets cũ trong phiên dev.
Build thông thường dọn các snapshot cũ. Cache của viewer được làm mới theo revision
manifest khi dev, tránh drawer giữ JSON cũ dù MDX đã hot-reload.

Pipeline dùng parser Markdown/MDX, validate project/file/region/line trước khi build,
rồi highlight Shiki light/dark với `.line[data-line]`. Assets sinh vào
`public/source-examples/` (gitignored) và được static export sang `out/source-examples/`.
`npm run check:export` kiểm tra cả SVG đã render lẫn snapshot JSON/highlight.
Chỉ đưa code công khai, không có secrets vào fence: assets được publish nguyên văn.
Không nhận manifest hoặc HTML highlight từ nguồn không tin cậy.

## Browser tests và CI

Sau khi build, chạy:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright tự mở server static export, kiểm tra Chromium ở viewport desktop/mobile:
D2 light/dark, lazy assets, 7 bài mới, chọn file/snapshot, region highlight, deep link,
reload, Back/Forward, Escape, clipboard (desktop), navigation reset và reference lỗi.
Bộ smoke bổ sung kiểm tra cả 81 route, learning controls/copy, HTTP variants, timing
table, icons nhúng, light/dark và mobile. Các ví dụ vẫn đọc được khi tắt JavaScript;
Source Explorer drawer/copy/step controls cần JavaScript. Clipboard chỉ kiểm tra trên
desktop Chromium, không giả lập quyền clipboard trên mobile.

Lỗi lưu screenshot/trace trong `test-results/`; xem report bằng `npx playwright show-report`.
Nếu cần browser cài sẵn, truyền `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

`npm test` kiểm tra extraction, snapshot isolation, validation và watcher thật trên
fixture tạm: atomic save, thay registry, phục hồi sau lỗi, giữ assets hợp lệ và dọn cache.
`.github/workflows/docs.yml` chạy các kiểm tra, build/export và browser tests trên push
vào `main` hoặc pull request; upload report khi lỗi. CI không tự deploy website.

## Các file chính

- `content/docs/`: nội dung và thứ tự navigation.
- `source.config.ts`: collection Fumadocs MDX.
- `lib/source.ts`: content loader; dùng entry `@/.source/server`.
- `app/docs/[[...slug]]/page.tsx`: render MDX, TOC, metadata và static params.
- `app/api/search.json/route.ts`: xuất JSON search index tĩnh cho dialog.
- `scripts/check-export.mjs`: kiểm tra assets, trang HTML và JSON search sau build.
- `scripts/check-docs.mjs`: kiểm tra JSON, metadata, frontmatter và liên kết nội bộ bằng Node, không cần dependencies.

## Phiên bản và template

Khi scaffold, phiên bản stable được đối chiếu qua npm registry: Fumadocs Core/UI
16.17.1, Fumadocs MDX 15.4.7, Next.js 16.4.0. Core/UI được pin cùng phiên bản
vì UI khai báo peer dependency chính xác; các package còn lại dùng ranges trong
`package.json`.

Các điểm đã cập nhật so với reference template cũ:

- `next.config.mjs` thay cho `next.config.ts`, theo khuyến nghị ESM của Fumadocs MDX.
- Entry sinh tự động nằm ở `.source/server.ts`, không còn `.source/index.ts`.
- `source.getPageTree()` cung cấp page tree.
- `DocsPage.className` điều chỉnh article; không dùng prop `article` chưa được xác nhận.
- Search dùng `options.type: 'static'`, API được hỗ trợ ở UI 16.17.1; khi nâng major,
  kiểm tra lại hoặc thay bằng custom dialog dùng `useStaticSearch()` theo docs.

Nguồn API:
[Fumadocs MDX + Next.js](https://www.fumadocs.dev/docs/mdx/next),
[Docs Layout](https://www.fumadocs.dev/docs/ui/layouts/docs),
[Docs Page](https://www.fumadocs.dev/docs/ui/layouts/page),
[Search](https://www.fumadocs.dev/docs/headless/search/orama).

## Layout rộng, padding gọn

`app/global.css` đặt `--fd-layout-width: 100%` và padding ngoài nhỏ.
`app/docs/layout.tsx` dùng `containerProps={{ className: 'px-0' }}`.
`DocsPage` bỏ cap article width và giảm padding bằng
`max-w-none px-4 md:px-5 xl:px-6`, vẫn giữ TOC bên phải khi đủ rộng.

Nếu percentage-based sizing bị lệch ở trình duyệt hoặc phiên bản khác,
đổi sang fallback `--fd-layout-width: 140rem` đã ghi chú trong CSS.
Khi nâng major, kiểm tra typings của `DocsPage`; nếu API thay đổi, dùng
[container slot](https://www.fumadocs.dev/docs/ui/layouts/page#container).
Chưa kiểm tra trực quan layout trong bước scaffold.

## Bản đóng gói

`dist/micro-frontend-learn.zip` chứa project, không chứa `.git/`,
`.agents/`, dependencies hay build artifacts. Giải nén, vào thư mục
`micro-frontend-learn/`, rồi chạy các lệnh cài đặt ở trên.

## Example dialog từ example-learn

Trang `/docs/giao-tiep-va-trang-thai` dùng **Example Explorer** của docs-kit 0.11.0. Bỏ khung LiveDemo inline: các link `ExampleRef` và nút nổi **Example** mở app trong modal, không thu hẹp layout/TOC của bài như Source Explorer.

- Registry host: `lib/examples.ts`. Có shop React/Vue và EventTarget JavaScript thuần.
- Provider: `app/example-provider.tsx`, truyền usePathname làm navigationKey, được đặt trong root layout.
- MDX map: `ExampleRef` trong `mdx-components.tsx`; CSS: `styles/example-explorer.css` trong `app/global.css`. Không cần remark plugin.
- Shop có hai biến thể thật: mặc định đọc snapshot + subscribe; `?mode=events-only` cố ý chỉ nghe event để thấy lỗi mount muộn. Đây là hai hành vi của cùng lab v1, không phải hai release độc lập.

Một trang có thể thêm nhiều ExampleRef trỏ tới các ID/version của registry. Dialog chọn ví dụ/phiên bản, tải lại, mở app/source ở tab mới và đóng; chỉ một iframe chạy khi mở. Query example/exampleVersion giữ deep link và Back/Forward, không ghi đè source/snapshot của Source Explorer. Đổi route sẽ bỏ các reference của bài cũ.

Source runnable chuẩn nằm trong [example-learn](https://github.com/vanhiep99w/example-learn), không copy vào docs-kit hoặc repo docs. Cấu hình src phải khớp domain Pages thực; nếu domain đổi, sửa registry và build/deploy lại docs, không phải phát hành docs-kit. Các snippet/Source Explorer tĩnh vẫn có nguồn biên soạn riêng.

No-JavaScript hoặc Ctrl/Cmd-click đi thẳng tới app qua href thật. Browser tests của docs dùng iframe fixture để kiểm tra wiring, không chứng nhận production bên ngoài đã deploy đúng commit. Demo thật được test riêng trong example-learn, gồm event-only, CSP và missing asset 404. Host CSP cần frame-src; server demo cần frame-ancestors cho phép domain docs. Phím Escape trong app khác origin không bubble về parent; nút đóng của dialog luôn ở ngoài iframe.
