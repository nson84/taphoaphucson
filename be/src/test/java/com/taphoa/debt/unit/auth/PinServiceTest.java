package com.taphoa.debt.unit.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.taphoa.debt.auth.PinService;
import com.taphoa.debt.auth.User;
import com.taphoa.debt.auth.UserRepository;
import com.taphoa.debt.common.ApiException;

@ExtendWith(MockitoExtension.class)
class PinServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private PinService pinService;
    private User user;

    @BeforeEach
    void setUp() {
        pinService = new PinService(userRepository, passwordEncoder);
        user = new User();
        user.setUsername("admin");
        user.setPinHash("hashed-pin");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, java.util.List.of())
        );
        lenient().when(userRepository.findByUsername("admin")).thenReturn(Optional.of(user));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void verifyCurrentUserPin_ok() {
        when(passwordEncoder.matches("123456", "hashed-pin")).thenReturn(true);
        assertThatCode(() -> pinService.verifyCurrentUserPin("123456")).doesNotThrowAnyException();
    }

    @Test
    void verifyCurrentUserPin_wrongPin_forbidden() {
        when(passwordEncoder.matches("000000", "hashed-pin")).thenReturn(false);
        assertThatThrownBy(() -> pinService.verifyCurrentUserPin("000000"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("PIN");
    }

    @Test
    void verifyCurrentUserPin_blank_badRequest() {
        assertThatThrownBy(() -> pinService.verifyCurrentUserPin("  "))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("PIN");
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void changePin_updatesHash() {
        when(passwordEncoder.matches("123456", "hashed-pin")).thenReturn(true);
        when(passwordEncoder.encode("654321")).thenReturn("new-hash");

        pinService.changePin("123456", "654321");

        assertThatCode(() -> verify(userRepository).save(user)).doesNotThrowAnyException();
        org.assertj.core.api.Assertions.assertThat(user.getPinHash()).isEqualTo("new-hash");
    }

    @Test
    void changePin_invalidNewPin_rejected() {
        assertThatThrownBy(() -> pinService.changePin("123456", "12"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("4-8");
        verify(userRepository, never()).save(any());
    }
}
