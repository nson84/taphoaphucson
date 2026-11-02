package com.taphoa.debt.product;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.taphoa.debt.common.ApiException;

@Service
public class ProductImportService {

    private final ProductImportWriter writer;
    private final DataFormatter formatter = new DataFormatter(Locale.ROOT);

    public ProductImportService(ProductImportWriter writer) {
        this.writer = writer;
    }

    public ProductImportResult importExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Chưa chọn file Excel", HttpStatus.BAD_REQUEST);
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!name.endsWith(".xlsx")) {
            throw new ApiException("Chỉ hỗ trợ file .xlsx (xuất từ KiotViet)", HttpStatus.BAD_REQUEST);
        }

        int created = 0;
        int updated = 0;
        int skipped = 0;
        int barcodeCount = 0;
        int noValidCode = 0;
        List<String> errors = new ArrayList<>();

        try (InputStream in = file.getInputStream(); Workbook wb = new XSSFWorkbook(in)) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                throw new ApiException("File Excel không có sheet dữ liệu", HttpStatus.BAD_REQUEST);
            }
            Row header = sheet.getRow(sheet.getFirstRowNum());
            if (header == null) {
                throw new ApiException("Thiếu dòng tiêu đề Excel", HttpStatus.BAD_REQUEST);
            }
            Map<String, Integer> cols = mapHeaders(header);
            require(cols, "mã hàng");
            require(cols, "tên hàng");

            Set<String> seenCodes = new LinkedHashSet<>();
            Set<String> seenSkus = new LinkedHashSet<>();
            int last = sheet.getLastRowNum();
            for (int r = sheet.getFirstRowNum() + 1; r <= last; r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                try {
                    String sku = text(row, cols.get("mã hàng"));
                    String barcodeRaw = text(row, cols.get("mã vạch"));
                    String productName = text(row, cols.get("tên hàng"));
                    if (sku.isEmpty() && barcodeRaw.isEmpty() && productName.isEmpty()) {
                        continue;
                    }
                    // Chỉ giữ mã vạch GTIN hợp lệ; Mã hàng nội bộ KiotViet (SP…, QM…) bị bỏ
                    Set<String> codes = new LinkedHashSet<>();
                    for (String c : splitCodes(barcodeRaw)) {
                        if (BarcodeUtil.isValidGtin(c)) {
                            codes.add(c);
                        }
                    }
                    if (BarcodeUtil.isValidGtin(sku)) {
                        codes.add(sku);
                    }
                    if (codes.isEmpty()) {
                        skipped++;
                        noValidCode++;
                        continue;
                    }
                    final String barcode = codes.iterator().next();
                    sku = barcode;
                    if (productName.isEmpty()) {
                        skipped++;
                        errors.add("Dòng " + (r + 1) + ": thiếu Tên hàng (" + sku + ")");
                        continue;
                    }

                    // Trùng trong cùng file: giữ dòng đầu, bỏ dòng sau
                    if (seenSkus.contains(sku)) {
                        skipped++;
                        continue;
                    }
                    final String skuKey = sku;
                    codes.removeIf(c -> seenCodes.contains(c) && !c.equals(skuKey));
                    boolean codeClash = false;
                    for (String c : codes) {
                        if (seenCodes.contains(c)) {
                            codeClash = true;
                            break;
                        }
                    }
                    if (codeClash || codes.isEmpty()) {
                        skipped++;
                        if (errors.size() < 30) {
                            errors.add("Dòng " + (r + 1) + ": trùng mã trong file (" + skuKey + ")");
                        }
                        continue;
                    }
                    // barcode hiển thị phải nằm trong codes còn lại (tránh UNIQUE products.barcode)
                    String primaryBarcode = barcode;
                    if (!codes.contains(primaryBarcode)) {
                        primaryBarcode = codes.contains(skuKey) ? skuKey : codes.iterator().next();
                    }

                    String category = text(row, cols.get("nhóm hàng(3 cấp)"));
                    if (category.isEmpty()) {
                        category = text(row, cols.get("nhóm hàng"));
                    }
                    BigDecimal sell = money(row, cols.get("giá bán"));
                    BigDecimal cost = money(row, cols.get("giá vốn"));
                    int stock = intVal(row, cols.get("tồn kho"));
                    String unit = text(row, cols.get("đvt"));
                    if (unit.isEmpty()) {
                        unit = "Cái";
                    }
                    boolean active = activeVal(row, cols.get("đang kinh doanh"));

                    String shortName = ProductNormalizer.shortenName(productName);
                    String cleanCategory = ProductNormalizer.classify(shortName, category);
                    ProductImportWriter.UpsertResult saved = writer.upsert(
                            sku, primaryBarcode, codes, shortName, cleanCategory, sell, cost, stock, unit, active);
                    barcodeCount += saved.barcodeCount();
                    seenSkus.add(sku);
                    seenCodes.addAll(codes);
                    if (saved.created()) {
                        created++;
                    } else {
                        updated++;
                    }
                } catch (Exception ex) {
                    skipped++;
                    String msg = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
                    if (errors.size() < 30) {
                        errors.add("Dòng " + (r + 1) + ": " + msg);
                    } else if (errors.size() == 30) {
                        errors.add("… còn lỗi khác, không liệt kê hết");
                    }
                }
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Không đọc được file Excel: " + ex.getMessage(), HttpStatus.BAD_REQUEST);
        }

        if (noValidCode > 0) {
            errors.add(0, noValidCode + " dòng chỉ có mã nội bộ (SP…, QM…) hoặc mã vạch sai — đã bỏ qua");
        }
        return new ProductImportResult(created, updated, skipped, barcodeCount, errors);
    }

    private static Set<String> splitCodes(String raw) {
        Set<String> set = new LinkedHashSet<>();
        if (raw == null || raw.isBlank()) {
            return set;
        }
        for (String part : raw.split("[,;\\s]+")) {
            String t = part.trim();
            if (!t.isEmpty()) {
                set.add(t);
            }
        }
        return set;
    }

    private Map<String, Integer> mapHeaders(Row header) {
        Map<String, Integer> map = new HashMap<>();
        short last = header.getLastCellNum();
        for (int i = 0; i < last; i++) {
            String h = normalizeHeader(text(header, i));
            if (!h.isEmpty()) {
                map.putIfAbsent(h, i);
            }
        }
        return map;
    }

    private static void require(Map<String, Integer> cols, String key) {
        if (!cols.containsKey(key)) {
            throw new ApiException("Thiếu cột Excel: " + key, HttpStatus.BAD_REQUEST);
        }
    }

    private static String normalizeHeader(String h) {
        return h == null ? "" : h.trim().toLowerCase(Locale.ROOT);
    }

    private String text(Row row, Integer idx) {
        if (idx == null || row == null) {
            return "";
        }
        Cell cell = row.getCell(idx);
        if (cell == null) {
            return "";
        }
        String v = formatter.formatCellValue(cell).trim();
        if (v.endsWith(".0") && v.matches("\\d+\\.0")) {
            v = v.substring(0, v.length() - 2);
        }
        return v;
    }

    private BigDecimal money(Row row, Integer idx) {
        if (idx == null || row == null) {
            return BigDecimal.ZERO;
        }
        Cell cell = row.getCell(idx);
        if (cell == null) {
            return BigDecimal.ZERO;
        }
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue()).setScale(2, RoundingMode.HALF_UP);
            }
            String t = formatter.formatCellValue(cell).replace(",", "").trim();
            if (t.isEmpty()) {
                return BigDecimal.ZERO;
            }
            return new BigDecimal(t).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private int intVal(Row row, Integer idx) {
        if (idx == null || row == null) {
            return 0;
        }
        Cell cell = row.getCell(idx);
        if (cell == null) {
            return 0;
        }
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (int) Math.round(cell.getNumericCellValue());
            }
            String t = formatter.formatCellValue(cell).replace(",", "").trim();
            if (t.isEmpty()) {
                return 0;
            }
            return (int) Math.round(Double.parseDouble(t));
        } catch (Exception ex) {
            return 0;
        }
    }

    private boolean activeVal(Row row, Integer idx) {
        String t = text(row, idx);
        if (t.isEmpty()) {
            return true;
        }
        return !(t.equals("0") || t.equalsIgnoreCase("false") || t.equalsIgnoreCase("không"));
    }
}
