# HOOPS PRODUCTION – Web Tiến độ In – Ép

Web theo dõi đơn của xưởng HOOPS & AKU: **CS nhập đơn → BP In → BP Ép → CS xác nhận số lượng → Kế hoạch may**.

> **Trạng thái: bản xem trước giao diện.** Chưa nối với Google Sheet. Mở web là chạy với dữ liệu mẫu.
> Đăng nhập bằng `quanly@vidu.vn`, mật khẩu `123456` để thấy mọi màn hình.

## Cấu trúc

| Đường dẫn | Là gì |
| --- | --- |
| `index.html` | Trang web (chạy trên GitHub Pages) |
| `assets/style.css` | Giao diện |
| `assets/app.js` | Các màn hình: Quy trình, Nhập đơn, BP In, BP Ép, CS xác nhận SL, Kế hoạch may, Tiến độ, Sản lượng In, Sản lượng TK |
| `assets/api.js` | Kết nối Apps Script (khi có link API) hoặc chạy thử |
| `assets/mock.js` | Dữ liệu mẫu cho bản chạy thử |
| `assets/config.js` | Nơi dán link `/exec` của Apps Script. Để trống = chạy thử |
| `apps-script/` | Mã Apps Script bản 1.4.2 (đã sửa lỗi treo màn hình), giữ để tham chiếu |

## Xem thử trên máy

Mở thẳng file `index.html` bằng trình duyệt.

## Việc tiếp theo

1. Minh duyệt giao diện và cách vận hành.
2. Thêm phần API (`doPost`) vào Code.gs để web GitHub đọc/ghi Google Sheet.
3. Bật GitHub Pages (Settings → Pages → nhánh `main`, thư mục `/`).
