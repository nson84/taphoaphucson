package com.taphoa.debt.debt;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DebtRepository extends JpaRepository<Debt, Long> {

    @Query(
            value = """
                    SELECT d FROM Debt d
                    JOIN d.customer c
                    WHERE d.paid = false
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(d.pickerName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(d.productNote, '')) LIKE LOWER(CONCAT('%', :q, '%')))
                      AND (:debtType IS NULL OR d.debtType = :debtType)
                    """,
            countQuery = """
                    SELECT COUNT(d) FROM Debt d
                    JOIN d.customer c
                    WHERE d.paid = false
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(d.pickerName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(d.productNote, '')) LIKE LOWER(CONCAT('%', :q, '%')))
                      AND (:debtType IS NULL OR d.debtType = :debtType)
                    """
    )
    Page<Debt> searchAll(@Param("q") String q, @Param("debtType") DebtType debtType, Pageable pageable);

    @Query(
            value = """
                    SELECT d FROM Debt d
                    WHERE d.customer.id = :customerId
                      AND (:from IS NULL OR d.occurredAt >= :from)
                      AND (:to IS NULL OR d.occurredAt < :to)
                      AND (:paid IS NULL OR d.paid = :paid)
                      AND (:paidSince IS NULL OR (d.paidAt IS NOT NULL AND d.paidAt >= :paidSince))
                    """,
            countQuery = """
                    SELECT COUNT(d) FROM Debt d
                    WHERE d.customer.id = :customerId
                      AND (:from IS NULL OR d.occurredAt >= :from)
                      AND (:to IS NULL OR d.occurredAt < :to)
                      AND (:paid IS NULL OR d.paid = :paid)
                      AND (:paidSince IS NULL OR (d.paidAt IS NOT NULL AND d.paidAt >= :paidSince))
                    """
    )
    Page<Debt> findByCustomerAndRange(
            @Param("customerId") Long customerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("paid") Boolean paid,
            @Param("paidSince") LocalDateTime paidSince,
            Pageable pageable
    );

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
            WHERE d.customer.id = :customerId AND d.paid = false
            """)
    BigDecimal sumUnpaidByCustomer(@Param("customerId") Long customerId);

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
            WHERE d.paid = false
            """)
    BigDecimal sumAllUnpaid();

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
            WHERE d.customer.id = :customerId AND d.paid = true
            """)
    BigDecimal sumPaidByCustomer(@Param("customerId") Long customerId);

    /** Tổng đã trả còn trong hạn thùng rác (theo lúc trả, không cần khách hết nợ hoàn toàn). */
    @Query("""
            SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
            WHERE d.customer.id = :customerId
              AND d.paid = true
              AND d.paidAt IS NOT NULL
              AND d.paidAt >= :cutoff
            """)
    BigDecimal sumPaidByCustomerSince(
            @Param("customerId") Long customerId,
            @Param("cutoff") LocalDateTime cutoff
    );

    @Query("""
            SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
            WHERE d.paid = true
              AND d.paidAt IS NOT NULL
              AND d.paidAt >= :cutoff
            """)
    BigDecimal sumPaidInTrash(@Param("cutoff") LocalDateTime cutoff);

    List<Debt> findByPaidTrueAndPaidAtBefore(LocalDateTime cutoff);

    List<Debt> findAllByCustomerId(Long customerId);

    List<Debt> findByCustomerIdAndPaidFalseOrderByAmountAscIdAsc(Long customerId);

    boolean existsByCustomerIdAndDebtType(Long customerId, DebtType debtType);

    boolean existsByCustomerIdAndPaidTrue(Long customerId);

    java.util.Optional<Debt> findBySaleId(Long saleId);
}
