package com.taphoa.debt.unit.debt;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.debt.Debt;
import com.taphoa.debt.debt.DebtDto;
import com.taphoa.debt.debt.DebtMapper;
import com.taphoa.debt.debt.DebtType;

class DebtMapperTest {

    @Test
    void toDto_mapsAllFields() {
        Customer customer = new Customer();
        customer.setName("An");
        customer.setParentName("vinh");
        setId(customer, 7L);

        Debt debt = new Debt();
        setId(debt, 11L);
        debt.setCustomer(customer);
        debt.setDebtType(DebtType.COMPANY);
        debt.setAmount(new BigDecimal("5000"));
        debt.setProductNote("gạo");
        debt.setPickerName("Anh Minh");
        debt.setOccurredAt(LocalDateTime.of(2026, 10, 1, 8, 30));
        debt.setPaid(true);
        debt.setPaidAt(LocalDateTime.of(2026, 10, 2, 9, 0));

        DebtDto dto = DebtMapper.toDto(debt);

        assertThat(dto.id()).isEqualTo(11L);
        assertThat(dto.customerId()).isEqualTo(7L);
        assertThat(dto.customerName()).isEqualTo("An");
        assertThat(dto.parentName()).isEqualTo("vinh");
        assertThat(dto.debtType()).isEqualTo(DebtType.COMPANY);
        assertThat(dto.amount()).isEqualByComparingTo("5000");
        assertThat(dto.productNote()).isEqualTo("gạo");
        assertThat(dto.pickerName()).isEqualTo("Anh Minh");
        assertThat(dto.occurredAt()).isEqualTo(LocalDateTime.of(2026, 10, 1, 8, 30));
        assertThat(dto.paid()).isTrue();
        assertThat(dto.paidAt()).isEqualTo(LocalDateTime.of(2026, 10, 2, 9, 0));
    }

    private static void setId(Customer customer, Long id) {
        try {
            var field = Customer.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(customer, id);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static void setId(Debt debt, Long id) {
        try {
            var field = Debt.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(debt, id);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
