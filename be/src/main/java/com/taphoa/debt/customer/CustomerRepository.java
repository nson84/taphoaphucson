package com.taphoa.debt.customer;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query(
            value = """
                    SELECT c FROM Customer c
                    WHERE c.trashedAt IS NULL
                      AND (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                           WHERE d.customer = c AND d.paid = false) > 0
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR (:nameOnly = false AND LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%'))))
                      AND (
                        (:filterPersonal = false AND :filterCompany = false)
                        OR (
                          (:filterPersonal = true AND NOT EXISTS (
                            SELECT 1 FROM Debt dpers WHERE dpers.customer = c
                              AND dpers.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                          OR (:filterCompany = true AND EXISTS (
                            SELECT 1 FROM Debt dco WHERE dco.customer = c
                              AND dco.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                        )
                      )
                    ORDER BY (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                              WHERE d.customer = c AND d.paid = false) DESC, c.id ASC
                    """,
            countQuery = """
                    SELECT COUNT(c) FROM Customer c
                    WHERE c.trashedAt IS NULL
                      AND (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                           WHERE d.customer = c AND d.paid = false) > 0
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR (:nameOnly = false AND LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%'))))
                      AND (
                        (:filterPersonal = false AND :filterCompany = false)
                        OR (
                          (:filterPersonal = true AND NOT EXISTS (
                            SELECT 1 FROM Debt dpers WHERE dpers.customer = c
                              AND dpers.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                          OR (:filterCompany = true AND EXISTS (
                            SELECT 1 FROM Debt dco WHERE dco.customer = c
                              AND dco.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                        )
                      )
                    """
    )
    Page<Customer> searchByNameOrderByBalanceDesc(
            @Param("q") String q,
            @Param("nameOnly") boolean nameOnly,
            @Param("filterPersonal") boolean filterPersonal,
            @Param("filterCompany") boolean filterCompany,
            Pageable pageable);

    @Query(
            value = """
                    SELECT c FROM Customer c
                    WHERE c.trashedAt IS NULL
                      AND (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                           WHERE d.customer = c AND d.paid = false) > 0
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR (:nameOnly = false AND LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%'))))
                      AND (
                        (:filterPersonal = false AND :filterCompany = false)
                        OR (
                          (:filterPersonal = true AND NOT EXISTS (
                            SELECT 1 FROM Debt dpers WHERE dpers.customer = c
                              AND dpers.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                          OR (:filterCompany = true AND EXISTS (
                            SELECT 1 FROM Debt dco WHERE dco.customer = c
                              AND dco.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                        )
                      )
                    ORDER BY (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                              WHERE d.customer = c AND d.paid = false) ASC, c.id ASC
                    """,
            countQuery = """
                    SELECT COUNT(c) FROM Customer c
                    WHERE c.trashedAt IS NULL
                      AND (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                           WHERE d.customer = c AND d.paid = false) > 0
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR (:nameOnly = false AND LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%'))))
                      AND (
                        (:filterPersonal = false AND :filterCompany = false)
                        OR (
                          (:filterPersonal = true AND NOT EXISTS (
                            SELECT 1 FROM Debt dpers WHERE dpers.customer = c
                              AND dpers.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                          OR (:filterCompany = true AND EXISTS (
                            SELECT 1 FROM Debt dco WHERE dco.customer = c
                              AND dco.debtType = com.taphoa.debt.debt.DebtType.COMPANY))
                        )
                      )
                    """
    )
    Page<Customer> searchByNameOrderByBalanceAsc(
            @Param("q") String q,
            @Param("nameOnly") boolean nameOnly,
            @Param("filterPersonal") boolean filterPersonal,
            @Param("filterCompany") boolean filterCompany,
            Pageable pageable);

    @Query(
            value = """
                    SELECT c FROM Customer c
                    WHERE c.trashedAt IS NOT NULL
                      AND c.trashedAt >= :cutoff
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
                    ORDER BY (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                              WHERE d.customer = c AND d.paid = true) DESC, c.trashedAt DESC, c.id ASC
                    """,
            countQuery = """
                    SELECT COUNT(c) FROM Customer c
                    WHERE c.trashedAt IS NOT NULL
                      AND c.trashedAt >= :cutoff
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
                    """
    )
    Page<Customer> searchTrashOrderByPaidDesc(
            @Param("q") String q,
            @Param("cutoff") LocalDateTime cutoff,
            Pageable pageable
    );

    @Query(
            value = """
                    SELECT c FROM Customer c
                    WHERE c.trashedAt IS NOT NULL
                      AND c.trashedAt >= :cutoff
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
                    ORDER BY (SELECT COALESCE(SUM(d.amount), 0) FROM Debt d
                              WHERE d.customer = c AND d.paid = true) ASC, c.trashedAt DESC, c.id ASC
                    """,
            countQuery = """
                    SELECT COUNT(c) FROM Customer c
                    WHERE c.trashedAt IS NOT NULL
                      AND c.trashedAt >= :cutoff
                      AND (:q IS NULL OR :q = ''
                        OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))
                        OR LOWER(COALESCE(c.parentName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
                    """
    )
    Page<Customer> searchTrashOrderByPaidAsc(
            @Param("q") String q,
            @Param("cutoff") LocalDateTime cutoff,
            Pageable pageable
    );

    List<Customer> findByTrashedAtBefore(LocalDateTime cutoff);

    @Query("""
            SELECT c FROM Customer c
            WHERE LOWER(TRIM(c.name)) = LOWER(:name)
            ORDER BY c.id ASC
            """)
    List<Customer> findAllByNormalizedName(@Param("name") String name);

    default Optional<Customer> findFirstByNormalizedName(String name) {
        List<Customer> list = findAllByNormalizedName(name);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
