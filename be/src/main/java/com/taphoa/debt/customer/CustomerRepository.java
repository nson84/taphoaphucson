package com.taphoa.debt.customer;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("""
            SELECT c FROM Customer c
            WHERE (:q IS NULL OR :q = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Customer> searchByName(@Param("q") String q, Pageable pageable);

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
