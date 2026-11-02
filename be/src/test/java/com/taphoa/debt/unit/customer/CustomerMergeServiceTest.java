package com.taphoa.debt.unit.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.customer.CustomerMergeService;
import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.qr.DebtQrPaymentRepository;
import com.taphoa.debt.sale.SaleRepository;

@ExtendWith(MockitoExtension.class)
class CustomerMergeServiceTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private DebtRepository debtRepository;
    @Mock
    private DebtQrPaymentRepository debtQrPaymentRepository;
    @Mock
    private SaleRepository saleRepository;

    private CustomerMergeService service;

    @BeforeEach
    void setUp() {
        service = new CustomerMergeService(
                customerRepository, debtRepository, debtQrPaymentRepository, saleRepository);
    }

    @Test
    void findOrCreate_createsWhenMissing() {
        when(customerRepository.findAllByNormalizedName("An")).thenReturn(List.of());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        Customer created = service.findOrCreate("  An  ", "ghi chú");

        assertThat(created.getName()).isEqualTo("An");
        assertThat(created.getNote()).isEqualTo("ghi chú");
        verify(customerRepository).save(any(Customer.class));
    }

    @Test
    void findOrCreate_reusesExistingSameParent() {
        Customer existing = new Customer();
        existing.setName("An");
        existing.setParentName("vinh");
        when(customerRepository.findAllByNormalizedName("An")).thenReturn(List.of(existing));
        when(customerRepository.save(existing)).thenReturn(existing);

        Customer result = service.findOrCreate("An", null, "vinh");

        assertThat(result).isSameAs(existing);
        verify(debtRepository, never()).findAllByCustomerId(any());
    }

    @Test
    void findOrCreate_differentParent_createsSeparateCustomer() {
        Customer existing = new Customer();
        existing.setName("sơn");
        existing.setParentName("hải xóm 4");
        when(customerRepository.findAllByNormalizedName("sơn")).thenReturn(List.of(existing));
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        Customer created = service.findOrCreate("sơn", null, "trung");

        assertThat(created).isNotSameAs(existing);
        assertThat(created.getParentName()).isEqualTo("trung");
        assertThat(existing.getParentName()).isEqualTo("hải xóm 4");
        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        assertThat(captor.getValue().getParentName()).isEqualTo("trung");
    }

    @Test
    void findOrCreate_blankName_rejected() {
        assertThatThrownBy(() -> service.findOrCreate("   ", null))
                .isInstanceOf(IllegalArgumentException.class);
        verify(customerRepository, never()).save(any());
    }

    @Test
    void findOrCreate_updatesNoteWhenProvided() {
        Customer existing = new Customer();
        existing.setName("An");
        when(customerRepository.findAllByNormalizedName("An")).thenReturn(List.of(existing));
        when(customerRepository.save(existing)).thenReturn(existing);

        service.findOrCreate("An", "mới");

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        assertThat(captor.getValue().getNote()).isEqualTo("mới");
    }
}
