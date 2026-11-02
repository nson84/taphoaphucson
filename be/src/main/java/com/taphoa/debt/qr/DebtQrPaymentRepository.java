package com.taphoa.debt.qr;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DebtQrPaymentRepository extends JpaRepository<DebtQrPayment, Long> {

    List<DebtQrPayment> findByCustomerIdAndStatus(Long customerId, DebtQrStatus status);

    List<DebtQrPayment> findByCustomerId(Long customerId);

    Optional<DebtQrPayment> findByCode(String code);

    boolean existsByCode(String code);
}
