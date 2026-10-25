package com.taphoa.debt.cards;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CardProductRepository extends JpaRepository<CardProduct, Long> {
    List<CardProduct> findByActiveTrueOrderByTelcoAscDenominationAsc();
}
