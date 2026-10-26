package com.taphoa.debt.debt;

public final class DebtMapper {

    private DebtMapper() {
    }

    public static DebtDto toDto(Debt debt) {
        DebtType type = debt.getDebtType() != null ? debt.getDebtType() : DebtType.PERSONAL;
        return new DebtDto(
                debt.getId(),
                debt.getCustomer().getId(),
                debt.getCustomer().getName(),
                debt.getCustomer().getParentName(),
                type,
                debt.getAmount(),
                debt.getProductNote(),
                debt.getPickerName(),
                debt.getOccurredAt(),
                debt.isPaid(),
                debt.getPaidAt(),
                debt.getCreatedAt(),
                debt.getUpdatedAt()
        );
    }
}
