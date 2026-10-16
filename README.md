# Micro-frontend Learning

Site tài liệu tiếng Việt dùng Next.js App Router, Fumadocs MDX/UI và Tailwind CSS v4.

Có **81 trang MDX** tiếng Việt trong 12 nhóm, từ nền tảng đến production và troubleshooting.
Đây là repository tài liệu, không phải workspace chạy ứng dụng shop trong các bài lab.
Sơ đồ D2 và Source Explorer dùng `@vanhiep99w/docs-kit@0.5.0`.

## Chạy trên máy có mạng

Dùng Node.js 22 trở lên (`.nvmrc` chọn Node 22):

```bash
npm install
npm run dev
```

Mở http://localhost:3000/docs. Đường dẫn `/` chuyển đến `/docs`.

`npm install` chạy `postinstall` để sinh `.source/`; không viết tay hoặc commit thư mục đó.
`npm run dev` và `npm run build` tự sinh assets Source Explorer trước khi chạy Next.js.
Sau khi sửa code trong MDX lúc dev đang chạy, chạy lại `npm run build:source` để cập nhật drawer.

Kiểm tra sau khi cài:

```bash
npm run check:docs
npm run check:source
npm test
npm run typecheck
npm run build
npm run check:export
```

Build xuất các assets vào `out/`. Để preview bản build trên máy có mạng,
chạy `npx serve out` và mở địa chỉ mà lệnh in ra. Không dùng `next start` với static export.

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

## D2 và Source Explorer

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
Mỗi bài hiện có snapshot `document` với nhãn “Code trong bài”.

Pipeline dùng parser Markdown/MDX, validate project/file/region/line trước khi build,
rồi highlight Shiki light/dark với `.line[data-line]`. Assets sinh vào
`public/source-examples/` (gitignored) và được static export sang `out/source-examples/`.
`npm run check:export` kiểm tra cả SVG đã render lẫn snapshot JSON/highlight.
Chỉ đưa code công khai, không có secrets vào fence: assets được publish nguyên văn.
Không nhận manifest hoặc HTML highlight từ nguồn không tin cậy.

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
