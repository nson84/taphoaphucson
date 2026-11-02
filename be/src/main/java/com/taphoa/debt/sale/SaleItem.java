package com.taphoa.debt.sale;

import java.math.BigDecimal;

import com.taphoa.debt.product.Product;

import org.hibernate.annotations.ColumnDefault;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "sale_items")
public class SaleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    /** Nullable: hàng mã ảo đã xóa khỏi DB vẫn giữ tên/mã trên dòng hóa đơn. */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, length = 64)
    private String barcode;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    /** Snapshot tên kiểu dáng / màu sắc (nếu có). */
    @Column(name = "variant_name", length = 80)
    private String variantName;

    @Column(nullable = false)
    private int qty;

    @Column(name = "unit_name", length = 40)
    private String unitName;

    @ColumnDefault("1")
    @Column(name = "unit_factor", nullable = false)
    private int unitFactor = 1;

    @Column(name = "product_unit_id")
    private Long productUnitId;

    /** Tồn (đơn vị cơ bản) đã trừ thực tế; null = hóa đơn cũ, hoàn qty * unitFactor. */
    @Column(name = "stock_deducted")
    private Integer stockDeducted;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "cost_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "line_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineTotal;

    public Long getId() {
        return id;
    }

    public Sale getSale() {
        return sale;
    }

    public void setSale(Sale sale) {
        this.sale = sale;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getVariantName() {
        return variantName;
    }

    public void setVariantName(String variantName) {
        this.variantName = variantName;
    }

    public int getQty() {
        return qty;
    }

    public void setQty(int qty) {
        this.qty = qty;
    }

    public String getUnitName() {
        return unitName;
    }

    public void setUnitName(String unitName) {
        this.unitName = unitName;
    }

    public int getUnitFactor() {
        return unitFactor;
    }

    public void setUnitFactor(int unitFactor) {
        this.unitFactor = unitFactor;
    }

    public Long getProductUnitId() {
        return productUnitId;
    }

    public void setProductUnitId(Long productUnitId) {
        this.productUnitId = productUnitId;
    }

    public Integer getStockDeducted() {
        return stockDeducted;
    }

    public void setStockDeducted(Integer stockDeducted) {
        this.stockDeducted = stockDeducted;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getCostPrice() {
        return costPrice;
    }

    public void setCostPrice(BigDecimal costPrice) {
        this.costPrice = costPrice;
    }

    public BigDecimal getLineTotal() {
        return lineTotal;
    }

    public void setLineTotal(BigDecimal lineTotal) {
        this.lineTotal = lineTotal;
    }
}
