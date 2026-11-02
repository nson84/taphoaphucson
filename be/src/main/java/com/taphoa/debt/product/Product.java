package com.taphoa.debt.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64, unique = true)
    private String barcode;

    /** Mã hàng nội bộ (KiotViet Mã hàng); có thể khác mã vạch quét. */
    @Column(length = 64, unique = true)
    private String sku;

    @Column(nullable = false, length = 200)
    private String name;

    /** Nhóm hàng optional: Thực phẩm, Tẩy rửa… */
    @Column(length = 80)
    private String category;

    @Column(name = "cost_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "sell_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal sellPrice;

    @Column(name = "stock_qty", nullable = false)
    private int stockQty;

    /** Tên đơn vị cơ bản (đồng bộ từ unit is_base). */
    @Column(length = 40)
    private String unit;

    @Column(nullable = false)
    private boolean active = true;

    /** Có ít nhất 1 mã GTIN hợp lệ (không phải mã nội bộ SP…/QM…). */
    @Column(name = "real_barcode")
    private Boolean realBarcode;

    /** Tên file ảnh dưới TAPHOA_DATA_DIR/product-images (null = chưa có ảnh). */
    @Column(name = "image_filename", length = 128)
    private String imageFilename;

    /**
     * true = hàng có mã vạch vật lý do shop nhập;
     * false = hàng không mã vạch (hệ thống tự cấp mã nội bộ đầu 29).
     */
    @Column(name = "has_physical_barcode", nullable = false)
    private boolean hasPhysicalBarcode = true;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<ProductUnit> units = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductBarcode> barcodes = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void replaceUnits(List<ProductUnit> next) {
        units.clear();
        if (next != null) {
            for (ProductUnit u : next) {
                u.setProduct(this);
                units.add(u);
            }
        }
    }

    public void replaceBarcodes(List<ProductBarcode> next) {
        barcodes.clear();
        if (next != null) {
            for (ProductBarcode b : next) {
                b.setProduct(this);
                barcodes.add(b);
            }
        }
        refreshRealBarcode();
    }

    public void refreshRealBarcode() {
        boolean real = BarcodeUtil.isValidGtin(barcode)
                || barcodes.stream().anyMatch(b -> BarcodeUtil.isValidGtin(b.getCode()));
        realBarcode = real;
    }

    public Boolean getRealBarcode() {
        return realBarcode;
    }

    public String getImageFilename() {
        return imageFilename;
    }

    public void setImageFilename(String imageFilename) {
        this.imageFilename = imageFilename;
    }

    public boolean isHasPhysicalBarcode() {
        return hasPhysicalBarcode;
    }

    public void setHasPhysicalBarcode(boolean hasPhysicalBarcode) {
        this.hasPhysicalBarcode = hasPhysicalBarcode;
    }

    public Long getId() {
        return id;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getCostPrice() {
        return costPrice;
    }

    public void setCostPrice(BigDecimal costPrice) {
        this.costPrice = costPrice;
    }

    public BigDecimal getSellPrice() {
        return sellPrice;
    }

    public void setSellPrice(BigDecimal sellPrice) {
        this.sellPrice = sellPrice;
    }

    public int getStockQty() {
        return stockQty;
    }

    public void setStockQty(int stockQty) {
        this.stockQty = Math.max(0, stockQty);
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public List<ProductUnit> getUnits() {
        return units;
    }

    public List<ProductVariant> getVariants() {
        return variants;
    }

    public List<ProductBarcode> getBarcodes() {
        return barcodes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
