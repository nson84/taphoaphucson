package com.taphoa.debt.product;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductBarcodeRepository extends JpaRepository<ProductBarcode, Long> {

    @Query("""
            SELECT b FROM ProductBarcode b
            JOIN FETCH b.product p
            LEFT JOIN FETCH p.units
            WHERE b.code = :code
            """)
    Optional<ProductBarcode> findByCodeWithProduct(@Param("code") String code);

    @Query("SELECT b FROM ProductBarcode b JOIN FETCH b.product")
    java.util.List<ProductBarcode> findAllWithProduct();

    boolean existsByCode(String code);

    boolean existsByCodeAndProductIdNot(String code, Long productId);
}
