package com.taphoa.debt.qr;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShopQrConfigRequest(
        boolean enabled,
        @NotBlank(message = "Mã BIN ngân hàng không được trống")
        @Size(max = 20)
        String bankBin,
        @NotBlank(message = "Số tài khoản không được trống")
        @Size(max = 40)
        String accountNo,
        @NotBlank(message = "Tên chủ tài khoản không được trống")
        @Size(max = 80)
        String accountName
) {
}
