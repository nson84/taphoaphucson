package com.taphoa.debt.unit.customer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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

@ExtendWith(MockitoExtension.class)
class CustomerMergeCompanyTest {

    @Mock
    CustomerRepository customerRepository;
    @Mock
    DebtRepository debtRepository;

    CustomerMergeService service;

    @BeforeEach
    void setUp() {
        service = new CustomerMergeService(customerRepository, debtRepository);
    }

    @Test
    void findOrCreateCompany_reusesSameCompanyWhenRoleChanges() {
        Customer existing = new Customer();
        existing.setName("Anh Vĩ");
        existing.setParentName(null);
        when(customerRepository.findAllByNormalizedName("Anh Vĩ")).thenReturn(List.of(existing));
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        Customer result = service.findOrCreateCompany("Anh Vĩ", "Chủ công ty");

        assertThat(result).isSameAs(existing);
        assertThat(result.getParentName()).isEqualTo("Chủ công ty");
        verify(customerRepository).save(existing);
    }

    @Test
    void findOrCreateCompany_createsWhenMissing() {
        when(customerRepository.findAllByNormalizedName("An Phú")).thenReturn(List.of());
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));

        Customer result = service.findOrCreateCompany("An Phú", "Nhân viên công ty");

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("An Phú");
        assertThat(captor.getValue().getParentName()).isEqualTo("Nhân viên công ty");
        assertThat(result.getParentName()).isEqualTo("Nhân viên công ty");
    }

    @Test
    void isEmptyOrCompanyRole_detectsRoles() {
        assertThat(CustomerMergeService.isEmptyOrCompanyRole(null)).isTrue();
        assertThat(CustomerMergeService.isEmptyOrCompanyRole("")).isTrue();
        assertThat(CustomerMergeService.isEmptyOrCompanyRole("Chủ công ty")).isTrue();
        assertThat(CustomerMergeService.isEmptyOrCompanyRole("Chủ công ty:")).isTrue();
        assertThat(CustomerMergeService.isEmptyOrCompanyRole("Nhân viên công ty: Minh")).isTrue();
        assertThat(CustomerMergeService.isEmptyOrCompanyRole("Bố mẹ: Vinh")).isFalse();
    }
}
