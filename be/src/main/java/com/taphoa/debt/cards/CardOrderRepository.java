package com.taphoa.debt.cards;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CardOrderRepository extends JpaRepository<CardOrder, Long> {
    Optional<CardOrder> findByReferenceNumber(String referenceNumber);

    List<CardOrder> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<CardOrder> findByStatusOrderByCreatedAtDesc(CardOrderStatus status);
}
