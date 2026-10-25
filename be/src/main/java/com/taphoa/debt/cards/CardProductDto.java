package com.taphoa.debt.cards;

import java.math.BigDecimal;

public record CardProductDto(
        Long id,
        String telco,
        Integer denomination,
        BigDecimal price
) {
    public static CardProductDto from(CardProduct p) {
        return new CardProductDto(p.getId(), p.getTelco(), p.getDenomination(), p.getPrice());
    }
}
