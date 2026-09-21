Quản lý Kho – TTD Computer
Web app quản lý kho vật tư & IT Asset, chạy thuần trình duyệt, đưa lên GitHub Pages là dùng được.
Có 2 chế độ: cục bộ (lưu trong trình duyệt) và Firebase (nhiều người dùng chung dữ liệu, realtime).
Cấu trúc thư mục
```
index.html                 Trang chính: chỉ nạp thư viện, cấu hình và các file js/ theo thứ tự
css/style.css              Toàn bộ giao diện
config/firebase-config.js  ⚙ Cấu hình Firebase – FILE DUY NHẤT cần sửa khi đổi project
assets/logo.js             Logo TTD Computer (base64) – hiện ở menu, đăng nhập, phiếu, báo cáo
firestore.rules            Rules bảo mật dán vào Firebase Console
js/
  01-core-utils.js         Tiện ích chung, đọc số tiền thành chữ
  02-data-model.js         Mô hình dữ liệu, 2 kho cố định, tải/lưu, migrate dữ liệu cũ
  03-stock-logic.js        Tính tồn kho, cảnh báo, giao dịch, tài sản theo Serial
  04-slip-html.js          Mẫu phiếu nhập/xuất (xem, in, PDF)
  10-ui-core.js            Toast, modal, form, bảng, biểu đồ, in/PDF/Excel
  11-router-auth.js        Menu, điều hướng, đăng nhập
  20-dashboard.js          Dashboard
  21-items-stock.js        Hàng hóa, Tồn kho (chuyển sang Kho hóa đơn), Kiểm kê
  22-slip-lists.js         Danh sách phiếu, lịch sử nhập/xuất
  23-slip-form.js          Lập phiếu, xem/in/PDF/xoá phiếu, Export PDF
  30-it-assets.js          IT Asset, Asset History
  31-reports.js            Các báo cáo
  32-category-assign.js    Gán hàng hóa vào danh mục
  33-settings.js           Thông tin (NCC, khách, dự án, kho, danh mục), User, Sao lưu
  34-sample-data.js        Dữ liệu mẫu
  40-combobox.js           Ô chọn/gõ tên có gợi ý
  41-import-excel.js       Upload Excel: NCC, khách hàng, tồn kho
  50-firebase-sync.js      Firebase: đăng nhập, đồng bộ, quản lý người dùng
  99-main.js               Khởi động
```
Các file `js/` được nạp theo thứ tự số (file sau dùng hàm của file trước). Muốn sửa một chức năng chỉ cần mở đúng file của nó.
Đưa lên GitHub Pages
Giải nén file zip, mở thư mục `quanlykho-ttd`, chọn toàn bộ nội dung bên trong (Ctrl+A).
Vào repository → Add file → Upload files → kéo tất cả vào (kéo cả các thư mục `css`, `js`, `assets`, `config`) → Commit changes.
Bản cũ chỉ có mỗi `index.html`: file mới sẽ ghi đè lên nó.
Settings → Pages → Deploy from a branch → `main` / `(root)` (chỉ làm một lần).
Sau ~1 phút mở trang và bấm Ctrl+Shift+R.
Khi cập nhật sau này, chỉ cần upload lại file thay đổi (kèm `index.html` vì số phiên bản `?v=` trong đó giúp trình duyệt tải bản mới).
Khi có lỗi
Thanh đỏ dưới màn hình cho biết tên file và số dòng gây lỗi.
Màn hình "Thiếu file chương trình" nghĩa là quên upload một file trong `js/`.
F12 → Console để xem chi tiết.
Bật Firebase (dùng chung dữ liệu)
https://console.firebase.google.com → Create a project.
Trang chủ project → biểu tượng `</>` (Web) → Register app (không tick Hosting) → copy `firebaseConfig`.
Security → Authentication → Get started → Sign-in method → Email/Password → Enable.
Authentication → Settings → Authorized domains → thêm `<tên>.github.io`.
Databases & Storage → Firestore → Create database → Standard edition → vị trí `asia-southeast1` → Production mode.
Tab Rules → dán nội dung `firestore.rules` → Publish.
Dán `firebaseConfig` vào `config/firebase-config.js` (đổi tên biến thành `FIREBASE_CONFIG`), commit.
Mở app → Thiết lập lần đầu → tạo quản trị viên → Settings → User / Permission để tạo tài khoản cho người khác.
Muốn chạy chế độ cục bộ: đặt `const FIREBASE_CONFIG = null;` trong `config/firebase-config.js` (đăng nhập `admin` / `admin123`).
Mô hình 2 kho
Kho nội bộ = tồn hàng thực tế (cảnh báo hết hàng, giá trị tồn, kiểm kê, thiết bị IT theo Serial).
Kho hóa đơn = số lượng theo hóa đơn nhập đầu vào / xuất đầu ra.
Mỗi phiếu chọn Ghi nhận vào kho: cả hai kho / chỉ Kho nội bộ / chỉ Kho hóa đơn.
Tồn kho có nút → HĐ (từng mặt hàng) và Chuyển tất cả sang Kho hóa đơn.
Số lượng luôn là số nguyên; tiền tệ là VND.
Đổi logo
Thay chuỗi trong `assets/logo.js` bằng ảnh mới đã mã hóa base64 (định dạng `data:image/jpeg;base64,...`).
Lưu ý
Dữ liệu chế độ cục bộ nằm trong trình duyệt từng máy; hãy xuất sao lưu JSON định kỳ (Settings → Sao lưu & Hệ thống).
Với Firebase: hai người sửa cùng một phiếu/thiết bị cùng lúc thì người lưu sau thắng; kiểm tra tồn âm chạy ở trình duyệt nên hai người xuất cùng mặt hàng gần như đồng thời vẫn có thể làm tồn âm nhẹ – kiểm kê định kỳ để chỉnh lại.
