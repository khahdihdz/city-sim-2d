# 🏙️ Thành Phố Của Tôi — City Sim 2D

Webgame **city-builder 2D** xây dựng và phát triển thành phố, chạy hoàn toàn trên trình duyệt bằng **Phaser 3**.

> ⚠️ **TUYÊN BỐ HƯ CẤU:** Toàn bộ nhân vật, tổ chức, luật pháp và tình huống trong game đều là **HƯ CẤU**, chỉ nhằm mục đích giải trí – mô phỏng. Không phản ánh hay hướng dẫn bất kỳ hành vi vi phạm pháp luật thực tế nào.

## Tổng kết prompt (ý tưởng game)

- **Engine:** Phaser 3 (WebGL/Canvas) — game 2D trực quan, không phải game thuần text.
- **Góc nhìn:** Top-down 2D, bản đồ dạng lưới ô vuông (tile-based grid 20×14).
- **Bản đồ & render:** cỏ, đường phố (người chơi tự vẽ), nhà cửa là sprite 2D, dân cư di chuyển trên đường, hiệu ứng đèn/smoke.
- **Cốt lõi:** người chơi là thị trưởng, phát triển 3 trụ cột: Kinh tế – Dân số & hạnh phúc – Pháp luật & trật tự.

### Hệ thống cám dỗ (trọng tâm)

Mỗi quyết định lớn có 2 con đường:

| | Hợp pháp | Phi pháp (hư cấu) |
|---|---|---|
| Lợi ích | Tăng trưởng chậm, bền vững | Tiền về nhanh, nhiều |
| Rủi ro | An toàn | Tăng chỉ số "Nghi ngờ" |

### Pháp luật (mô phỏng hư cấu)

- Chỉ số **"Nghi ngờ"** tích lũy khi làm việc phi pháp; cảnh sát giúp giảm nghi ngờ.
- Vượt ngưỡng → bị điều tra, phạt, mất chức, hoặc Game Over.

## Cách chơi

1. Chọn công trình ở thanh công cụ, click vào bản đồ để đặt.
2. Xây **nhà dân** để tăng dân, **điện/nước** để cung cấp tiện ích.
3. **Xưởng ngầm (phi pháp)** cho thu nhập cao nhưng tăng Nghi ngờ — rủi ro bị bắt.
4. Sự kiện ngẫu nhiên xuất hiện định kỳ, mỗi sự kiện có lựa chọn hợp pháp/phi pháp.
5. Thắng khi đạt **250 dân**; thua khi **Nghi ngờ = 100** hoặc **phá sản**.

## Chạy local

```bash
python3 -m http.server 8080
# mở http://localhost:8080
```

## Công nghệ

- Phaser 3 (CDN) + HTML/CSS/JS thuần
- Lưu state trong bộ nhớ (chưa dùng localStorage)
- Công trình & sự kiện định nghĩa data-driven trong `game.js`
