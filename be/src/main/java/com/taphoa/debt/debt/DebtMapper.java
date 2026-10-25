package com.taphoa.debt.debt;

public final class DebtMapper {

    private DebtMapper() {
    }

    public static DebtDto toDto(Debt debt) {
        return new DebtDto(
                debt.getId(),
                debt.getCustomer().getId(),
                debt.getCustomer().getName(),
                debt.getAmount(),
                debt.getProductNote(),
                debt.getCustomerNote(),
                debt.getOccurredAt(),
                debt.isPaid(),
                debt.getPaidAt(),
                debt.getCreatedAt(),
                debt.getUpdatedAt()
        );
    }
}
