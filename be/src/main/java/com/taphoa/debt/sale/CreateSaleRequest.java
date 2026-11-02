package com.taphoa.debt.sale;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.taphoa.debt.debt.DebtType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateSaleRequest(
        @NotEmpty(message = "Giỏ hàng không được trống")
        @Valid
        List<CreateSaleItemRequest> items,
        @NotNull(message = "Phương thức thanh toán không được trống")
        PaymentMethod paymentMethod,
        @NotNull(message = "Số tiền đã trả không được trống")
        @DecimalMin(value = "0", inclusive = true, message = "Số tiền đã trả không được âm")
        BigDecimal paidAmount,
        @DecimalMin(value = "0", inclusive = true, message = "Giảm giá không được âm")
        BigDecimal discountAmount,
        DebtType debtType,
        @Size(max = 80, message = "Tên khách tối đa 80 ký tự")
        String customerName,
        @Size(max = 80, message = "Tham chiếu tối đa 80 ký tự")
        String parentName,
        @Size(max = 80, message = "Tên người lấy tối đa 80 ký tự")
        String pickerName,
        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        String note,
        /** Ghi chú sản phẩm khi ghi nợ (mỗi dòng một mặt hàng). */
        @Size(max = 2000, message = "Ghi chú sản phẩm tối đa 2000 ký tự")
        String productNote,
        LocalDateTime occurredAt,
        /** Khóa chống trùng do client sinh; gửi lại cùng khóa sẽ trả hóa đơn đã tạo. */
        @Size(max = 64, message = "Mã yêu cầu tối đa 64 ký tự")
        String clientRequestId
) {
}
