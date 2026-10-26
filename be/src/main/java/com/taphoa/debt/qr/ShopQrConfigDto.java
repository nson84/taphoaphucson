package com.taphoa.debt.qr;

public record ShopQrConfigDto(
        boolean enabled,
        String bankBin,
        String accountNo,
        String accountName
) {
}
