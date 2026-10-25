package com.taphoa.debt.cards;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CardCodeRepository extends JpaRepository<CardCode, Long> {
    List<CardCode> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);
}
