package com.taphoa.debt.sale;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    Optional<Sale> findByCode(String code);

    Optional<Sale> findByClientRequestId(String clientRequestId);

    List<Sale> findByCustomerId(Long customerId);

    @Query("""
            SELECT DISTINCT s FROM Sale s
            LEFT JOIN FETCH s.items
            LEFT JOIN FETCH s.customer
            WHERE s.id = :id
            """)
    Optional<Sale> findByIdWithItems(@Param("id") Long id);

    @Query("""
            SELECT s FROM Sale s
            LEFT JOIN s.customer c
            WHERE (:from IS NULL OR s.occurredAt >= :from)
              AND (:to IS NULL OR s.occurredAt < :to)
              AND (:q IS NULL OR :q = ''
                   OR LOWER(s.code) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Sale> search(
            @Param("q") String q,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );

    @Query("""
            SELECT s FROM Sale s
            WHERE s.cancelledAt IS NULL
              AND s.occurredAt >= :from
              AND s.occurredAt < :to
            """)
    List<Sale> findActiveInRange(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
