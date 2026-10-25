package com.taphoa.debt.cards;

import java.time.LocalDateTime;

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
@Table(name = "card_codes")
public class CardCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private CardOrder order;

    @Column(name = "serial_enc", nullable = false, columnDefinition = "TEXT")
    private String serialEnc;

    @Column(name = "code_enc", nullable = false, columnDefinition = "TEXT")
    private String codeEnc;

    @Column(name = "delivered_at", nullable = false)
    private LocalDateTime deliveredAt;

    public Long getId() {
        return id;
    }

    public CardOrder getOrder() {
        return order;
    }

    public void setOrder(CardOrder order) {
        this.order = order;
    }

    public String getSerialEnc() {
        return serialEnc;
    }

    public void setSerialEnc(String serialEnc) {
        this.serialEnc = serialEnc;
    }

    public String getCodeEnc() {
        return codeEnc;
    }

    public void setCodeEnc(String codeEnc) {
        this.codeEnc = codeEnc;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }
}
