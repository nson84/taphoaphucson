package com.taphoa.debt.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerRequest(
        @NotBlank(message = "Tên khách không được trống")
        @Size(max = 80, message = "Tên khách tối đa 80 ký tự")
        String name,
        @Size(max = 80, message = "Tham chiếu (bố mẹ/ông bà/xưởng) tối đa 80 ký tự")
        String parentName,
        @Size(max = 200, message = "Ghi chú tối đa 200 ký tự")
        String note
) {
}
