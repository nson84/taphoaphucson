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
                    WHERE (:q IS NULL OR :q = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')))
                    ORDER BY d.paid ASC, d.occurredAt DESC, d.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(d) FROM Debt d
                    JOIN d.customer c
                    WHERE (:q IS NULL OR :q = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')))
                    """
    )
    Page<Debt> searchAll(@Param("q") String q, Pageable pageable);

    @Query(
            value = """
                    SELECT d FROM Debt d
                    WHERE d.customer.id = :customerId
                      AND (:from IS NULL OR d.occurredAt >= :from)
                      AND (:to IS NULL OR d.occurredAt < :to)
                    ORDER BY d.paid ASC, d.occurredAt DESC, d.id DESC
                    """,
            countQuery = """
                    SELECT COUNT(d) FROM Debt d
                    WHERE d.customer.id = :customerId
                      AND (:from IS NULL OR d.occurredAt >= :from)
                      AND (:to IS NULL OR d.occurredAt < :to)
                    """
    )
    Page<Debt> findByCustomerAndRange(
            @Param("customerId") Long customerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
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

    List<Debt> findAllByCustomerId(Long customerId);
}
