package com.taphoa.debt.qr;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "shop_qr_config")
public class ShopQrConfig {

    @Id
    private Long id = 1L;

    @Column(nullable = false)
    private boolean enabled = false;

    /** Mã BIN ngân hàng VietQR, vd Vietcombank = 970436 */
    @Column(name = "bank_bin", nullable = false, length = 20)
    private String bankBin = "970436";

    @Column(name = "account_no", nullable = false, length = 40)
    private String accountNo = "";

    @Column(name = "account_name", nullable = false, length = 80)
    private String accountName = "";

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getBankBin() {
        return bankBin;
    }

    public void setBankBin(String bankBin) {
        this.bankBin = bankBin;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
