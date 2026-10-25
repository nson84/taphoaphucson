---
name: optimize-perf
description: >-
  Tối ưu hiệu năng sổ nợ: re-render React, N+1 JPA, phân trang, bundle Vite.
  Dùng khi app chậm hoặc user yêu cầu optimize.
---

# Optimize Performance

Chỉ tối ưu khi có triệu chứng/bằng chứng rõ — không premature.

## Điểm soi

### FE
- List lớn: đã phân trang `size=20` — tránh fetch all.
- Debounce search (pattern `SummaryPage` 300ms).
- Không thêm `useMemo`/`useCallback` mặc định trừ khi đo được hoặc dependency object gây loop.

### BE / DB
- N+1: không query trong vòng lặp; dùng join/fetch hoặc aggregate ở summary.
- Index đã có trên `customer_id`, `occurred_at`, `paid`, `name` — thêm index chỉ khi query mới cần.
- Batch pay: 1 request thay vì N lần pay.

### Bundle
- `npm run build` trong `fe/`; tránh import nặng không cần thiết.

## Quy trình

1. Xác định chỗ chậm (trang/API).
2. Đề xuất fix + trade-off.
3. Không refactor ngoài phạm vi perf đang xử lý.
