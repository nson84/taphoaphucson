package com.taphoa.debt.product;

import java.util.List;

public record ProductImportResult(
        int created,
        int updated,
        int skipped,
        int barcodes,
        List<String> errors
) {
}
