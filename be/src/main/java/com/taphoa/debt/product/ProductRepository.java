package com.taphoa.debt.product;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByBarcode(String barcode);

    Optional<Product> findByBarcodeAndActiveTrue(String barcode);

    Optional<Product> findBySku(String sku);

    boolean existsByBarcode(String barcode);

    /** Mã nội bộ lớn nhất (EAN-13 đầu số 29) — để cấp số thứ tự kế tiếp. */
    @Query("SELECT MAX(p.barcode) FROM Product p WHERE p.barcode LIKE '29%' AND LENGTH(p.barcode) = 13")
    String findMaxInternalBarcode();

    boolean existsByBarcodeAndIdNot(String barcode, Long id);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    /**
     * Tìm theo tên / mã chính / SKU / nhóm / mọi mã trong product_barcodes.
     * Ưu tiên: khớp mã đúng → mã bắt đầu → mã chứa → tên bắt đầu → còn lại.
     */
    @Query("""
            SELECT p FROM Product p
            WHERE (:activeOnly = false OR p.active = true)
              AND (:codeType = 'all'
                   OR (:codeType = 'fake' AND p.realBarcode = false)
                   OR (:codeType = 'real' AND p.realBarcode = true)
                   OR (:codeType = 'nobarcode' AND p.hasPhysicalBarcode = false)
                   OR (:codeType = 'barname' AND LENGTH(TRIM(p.name)) IN (8, 12, 13, 14)
                       AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                           TRIM(p.name), '0', ''), '1', ''), '2', ''), '3', ''), '4', ''), '5', ''), '6', ''), '7', ''), '8', ''), '9', '') = ''))
              AND (:q IS NULL OR :q = ''
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.sku, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.category, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR EXISTS (
                        SELECT 1 FROM ProductBarcode b
                        WHERE b.product = p
                          AND LOWER(b.code) LIKE LOWER(CONCAT('%', :q, '%'))
                   ))
            ORDER BY
              CASE
                WHEN :q IS NULL OR :q = '' THEN 9
                WHEN LOWER(p.barcode) = LOWER(:q) THEN 0
                WHEN LOWER(COALESCE(p.sku, '')) = LOWER(:q) THEN 0
                WHEN LOWER(p.barcode) LIKE LOWER(CONCAT(:q, '%')) THEN 1
                WHEN LOWER(COALESCE(p.sku, '')) LIKE LOWER(CONCAT(:q, '%')) THEN 1
                WHEN EXISTS (
                    SELECT 1 FROM ProductBarcode b2
                    WHERE b2.product = p AND LOWER(b2.code) LIKE LOWER(CONCAT(:q, '%'))
                ) THEN 2
                WHEN LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%')) THEN 3
                WHEN LOWER(p.name) LIKE LOWER(CONCAT(:q, '%')) THEN 4
                ELSE 5
              END ASC,
              p.name ASC
            """)
    Page<Product> search(
            @Param("q") String q,
            @Param("activeOnly") boolean activeOnly,
            @Param("codeType") String codeType,
            Pageable pageable
    );

    /** Hàng chưa nhập giá vốn (giá vốn = 0 — hiển thị "0 đ" trên bảng). */
    @Query("""
            SELECT p FROM Product p
            WHERE (:activeOnly = false OR p.active = true)
              AND (p.costPrice IS NULL OR p.costPrice = :zeroCost)
              AND (:q IS NULL OR :q = ''
                   OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.sku, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(p.category, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR EXISTS (
                        SELECT 1 FROM ProductBarcode b
                        WHERE b.product = p
                          AND LOWER(b.code) LIKE LOWER(CONCAT('%', :q, '%'))
                   ))
            ORDER BY
              CASE
                WHEN :q IS NULL OR :q = '' THEN 9
                WHEN LOWER(p.barcode) = LOWER(:q) THEN 0
                WHEN LOWER(COALESCE(p.sku, '')) = LOWER(:q) THEN 0
                WHEN LOWER(p.barcode) LIKE LOWER(CONCAT(:q, '%')) THEN 1
                WHEN LOWER(COALESCE(p.sku, '')) LIKE LOWER(CONCAT(:q, '%')) THEN 1
                WHEN EXISTS (
                    SELECT 1 FROM ProductBarcode b2
                    WHERE b2.product = p AND LOWER(b2.code) LIKE LOWER(CONCAT(:q, '%'))
                ) THEN 2
                WHEN LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%')) THEN 3
                WHEN LOWER(p.name) LIKE LOWER(CONCAT(:q, '%')) THEN 4
                ELSE 5
              END ASC,
              p.name ASC
            """)
    Page<Product> searchWithoutCostPrice(
            @Param("q") String q,
            @Param("activeOnly") boolean activeOnly,
            @Param("zeroCost") BigDecimal zeroCost,
            Pageable pageable
    );

    long countByRealBarcode(Boolean realBarcode);

    long countByHasPhysicalBarcode(boolean hasPhysicalBarcode);

    @Query("""
            SELECT COUNT(p) FROM Product p
            WHERE p.hasPhysicalBarcode = false
              AND LOWER(TRIM(p.name)) = LOWER(TRIM(:name))
              AND (:excludeId IS NULL OR p.id <> :excludeId)
            """)
    long countNoBarcodeByName(@Param("name") String name, @Param("excludeId") Long excludeId);

    List<Product> findByRealBarcode(Boolean realBarcode);

    /** Hàng mã thật còn giữ Mã hàng nội bộ khác mã vạch (SP…, QM… từ KiotViet). */
    @Query("SELECT COUNT(p) FROM Product p WHERE p.realBarcode = true AND p.sku <> p.barcode")
    long countRealWithInternalSku();

    @Query("SELECT p FROM Product p WHERE p.realBarcode = true AND p.sku <> p.barcode")
    List<Product> findRealWithInternalSku();

    @Query("""
            SELECT p FROM Product p
            WHERE p.sku IS NULL OR p.sku = '' OR p.realBarcode IS NULL OR p.barcodes IS EMPTY
            """)
    List<Product> findNeedingBackfill();

    /** Sắp hết: còn hàng nhưng dưới ngưỡng (bỏ qua tồn 0 vì nhiều cửa hàng chưa nhập tồn). */
    @Query("""
            SELECT COUNT(p) FROM Product p
            WHERE p.active = true AND p.stockQty > 0 AND p.stockQty < :threshold
            """)
    long countLowStock(@Param("threshold") int threshold);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.costPrice IS NULL OR p.costPrice = :zeroCost")
    long countWithoutCostPrice(@Param("zeroCost") BigDecimal zeroCost);

    /** Tên hàng chỉ là dãy số dài 8 / 12 / 13 / 14 — dạng mã vạch, chưa có tên chữ. */
    @Query("""
            SELECT COUNT(p) FROM Product p
            WHERE LENGTH(TRIM(p.name)) IN (8, 12, 13, 14)
              AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                  TRIM(p.name), '0', ''), '1', ''), '2', ''), '3', ''), '4', ''), '5', ''), '6', ''), '7', ''), '8', ''), '9', '') = ''
            """)
    long countNameIsBarcode();
}
