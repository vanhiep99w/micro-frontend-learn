# Micro-frontend Learning

Site tài liệu tiếng Việt dùng Next.js App Router, Fumadocs MDX/UI và Tailwind CSS v4.

**Đây là bộ khung học, chưa phải tài liệu chi tiết hoặc ứng dụng micro-frontend chạy được.**
Có 12 nhóm, 68 bài placeholder, 12 trang tổng quan và 1 trang lộ trình: **81 trang MDX**.

## Chạy trên máy có mạng

Dùng Node.js 22 trở lên (`.nvmrc` chọn Node 22):

```bash
npm install
npm run dev
```

Mở http://localhost:3000/docs. Đường dẫn `/` chuyển đến `/docs`.

Sandbox của bước khởi tạo không có mạng cho bash nên không chạy cài dependencies
hoặc build tại đây. Log Cloudflare bạn cung cấp xác nhận phiên bản scaffold ban đầu
đã compile, kiểm tra TypeScript và prerender thành công; cấu hình static export
mới cần được kiểm tra lại bằng các lệnh bên dưới hoặc lần deploy tiếp theo.
`npm install` chạy `postinstall` để sinh `.source/`; không viết tay hoặc commit thư mục đó.

Kiểm tra sau khi cài:

```bash
npm run check:docs
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
- Leaf pages hiện chỉ có callout trạng thái và phạm vi dự kiến.
- Mỗi nhóm dùng `index.mdx` làm landing page và `meta.json` để xếp sidebar.
- Khi thêm hoặc đổi slug, cập nhật `meta.json` cùng các liên kết.
- `Callout` và các thành phần MDX mặc định được đăng ký trong `mdx-components.tsx`.
- Mermaid chưa được cấu hình. Đừng coi fenced Mermaid là sơ đồ đã được render.

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
