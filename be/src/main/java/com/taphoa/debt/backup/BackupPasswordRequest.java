package com.taphoa.debt.backup;

import jakarta.validation.constraints.NotBlank;

public record BackupPasswordRequest(
        @NotBlank String password
) {
}
