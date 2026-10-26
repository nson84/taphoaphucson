package com.taphoa.debt.unit.debt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.taphoa.debt.auth.PinService;
import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.customer.CustomerMergeService;
import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.debt.AmountSort;
import com.taphoa.debt.debt.CreateDebtRequest;
import com.taphoa.debt.debt.Debt;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtService;
import com.taphoa.debt.debt.DebtType;
import com.taphoa.debt.debt.UpdateDebtRequest;
import com.taphoa.debt.qr.DebtQrService;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock
    private DebtRepository debtRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private CustomerMergeService customerMergeService;
    @Mock
    private PinService pinService;
    @Mock
    private DebtQrService debtQrService;

    private DebtService debtService;
    private Customer customer;

    @BeforeEach
    void setUp() {
        debtService = new DebtService(
                debtRepository, customerRepository, customerMergeService, pinService, debtQrService
        );
        customer = new Customer();
        customer.setName("An");
        setId(customer, 1L);
        lenient().when(debtRepository.sumUnpaidByCustomer(anyLong())).thenReturn(BigDecimal.ONE);
        lenient().when(customerRepository.findById(anyLong())).thenReturn(Optional.of(customer));
        lenient().when(debtRepository.existsByCustomerIdAndPaidTrue(anyLong())).thenReturn(false);
    }

    @Test
    void create_persistsUnpaidDebt() {
        LocalDateTime occurred = LocalDateTime.of(2026, 10, 25, 10, 0);
        CreateDebtRequest request = new CreateDebtRequest(
                DebtType.PERSONAL, "An", null, "Con An", new BigDecimal("5000"), "gạo", occurred
        );
        when(customerMergeService.findOrCreate("An", null, null)).thenReturn(customer);
        when(debtRepository.save(any(Debt.class))).thenAnswer(inv -> {
            Debt d = inv.getArgument(0);
            setId(d, 99L);
            return d;
        });

        var dto = debtService.create(request);

        assertThat(dto.id()).isEqualTo(99L);
        assertThat(dto.paid()).isFalse();
        assertThat(dto.amount()).isEqualByComparingTo("5000");

        ArgumentCaptor<Debt> captor = ArgumentCaptor.forClass(Debt.class);
        verify(debtRepository).save(captor.capture());
        assertThat(captor.getValue().getCustomer()).isSameAs(customer);
        assertThat(captor.getValue().getOccurredAt()).isEqualTo(occurred);
    }

    @Test
    void update_paidDebt_rejected() {
        Debt debt = unpaidDebt(10L);
        debt.setPaid(true);
        when(debtRepository.findById(10L)).thenReturn(Optional.of(debt));

        UpdateDebtRequest request = new UpdateDebtRequest(
                DebtType.PERSONAL, "An", null, "Con An", new BigDecimal("6000"), null, LocalDateTime.now()
        );

        assertThatThrownBy(() -> debtService.update(10L, request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đã trả");
        verify(debtRepository, never()).save(any());
    }

    @Test
    void markPaid_alreadyPaid_rejected() {
        Debt debt = unpaidDebt(5L);
        debt.setPaid(true);
        when(debtRepository.findById(5L)).thenReturn(Optional.of(debt));

        assertThatThrownBy(() -> debtService.markPaid(5L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đã được trả");
    }

    @Test
    void markPaidBatch_skipsAlreadyPaid() {
        Debt unpaid = unpaidDebt(1L);
        Debt paid = unpaidDebt(2L);
        paid.setPaid(true);
        when(debtRepository.findById(1L)).thenReturn(Optional.of(unpaid));
        when(debtRepository.findById(2L)).thenReturn(Optional.of(paid));
        when(debtRepository.save(any(Debt.class))).thenAnswer(inv -> inv.getArgument(0));

        int count = debtService.markPaidBatch(List.of(1L, 2L));

        assertThat(count).isEqualTo(1);
        assertThat(unpaid.isPaid()).isTrue();
        assertThat(unpaid.getPaidAt()).isNotNull();
    }

    @Test
    void markUnpaid_verifiesPinThenReopens() {
        Debt debt = unpaidDebt(3L);
        debt.setPaid(true);
        debt.setPaidAt(LocalDateTime.now());
        when(debtRepository.findById(3L)).thenReturn(Optional.of(debt));
        when(debtRepository.save(any(Debt.class))).thenAnswer(inv -> inv.getArgument(0));

        var dto = debtService.markUnpaid(3L, "123456");

        verify(pinService).verifyCurrentUserPin("123456");
        assertThat(dto.paid()).isFalse();
        assertThat(dto.paidAt()).isNull();
    }

    @Test
    void listByCustomer_missingCustomer_notFound() {
        when(customerRepository.existsById(404L)).thenReturn(false);
        assertThatThrownBy(() -> debtService.listByCustomer(404L, null, null, null, 0, 20, AmountSort.DESC))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("khách hàng");
    }

    @Test
    void listByCustomer_invalidDayWithoutMonth_rejected() {
        when(customerRepository.existsById(1L)).thenReturn(true);
        assertThatThrownBy(() -> debtService.listByCustomer(1L, 2026, null, 5, 0, 20, AmountSort.DESC))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("năm và tháng");
    }

    @Test
    void get_missing_notFound() {
        when(debtRepository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> debtService.get(1L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("khoản nợ");
    }

    @Test
    void search_delegatesToRepository() {
        Debt debt = unpaidDebt(1L);
        when(debtRepository.searchAll(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(debt)));

        Page<?> page = debtService.search("an", null, 0, 20, AmountSort.DESC);

        assertThat(page.getTotalElements()).isEqualTo(1);
        verify(debtRepository).searchAll(eq("an"), eq(null), any(Pageable.class));
    }

    @Test
    void payAmountForCustomer_paysSmallestFirst_andNotesPartial() {
        Debt small = unpaidDebt(1L);
        small.setAmount(new BigDecimal("5000"));
        small.setProductNote("gạo");
        Debt large = unpaidDebt(2L);
        large.setAmount(new BigDecimal("10000"));
        large.setProductNote("sữa");

        when(customerRepository.existsById(1L)).thenReturn(true);
        when(debtRepository.sumUnpaidByCustomer(1L)).thenReturn(new BigDecimal("15000"));
        when(debtRepository.findByCustomerIdAndPaidFalseOrderByAmountAscIdAsc(1L))
                .thenReturn(List.of(small, large));
        when(debtRepository.save(any(Debt.class))).thenAnswer(inv -> inv.getArgument(0));

        debtService.payAmountForCustomer(1L, new BigDecimal("7000"));

        assertThat(small.isPaid()).isTrue();
        assertThat(large.isPaid()).isFalse();
        assertThat(large.getAmount()).isEqualByComparingTo("8000");
        assertThat(large.getProductNote()).contains("Đã trả -2,000 đ lúc");
    }

    private Debt unpaidDebt(Long id) {
        Debt debt = new Debt();
        setId(debt, id);
        debt.setCustomer(customer);
        debt.setAmount(new BigDecimal("1000"));
        debt.setOccurredAt(LocalDateTime.of(2026, 1, 1, 0, 0));
        debt.setPaid(false);
        return debt;
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
