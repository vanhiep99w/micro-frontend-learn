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

Sandbox của bước khởi tạo không có mạng cho bash. Dependencies chưa được cài;
dev server, TypeScript và production build **chưa được chạy**.
`npm install` chạy `postinstall` để sinh `.source/`; không viết tay hoặc commit thư mục đó.

Kiểm tra sau khi cài:

```bash
npm run check:docs
npm run typecheck
npm run build
npm start
```

Commit `package-lock.json` sau khi cài và kiểm tra thành công để cố định dependency graph.

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
- `app/api/search/route.ts`: tìm kiếm tài liệu cho dialog mặc định.
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
