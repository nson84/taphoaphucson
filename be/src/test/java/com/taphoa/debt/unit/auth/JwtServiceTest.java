package com.taphoa.debt.unit.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.taphoa.debt.auth.JwtService;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("taphoa-test-secret-key-must-be-32chars-min", 3_600_000L);
    }

    @Test
    void generateAndValidate_roundTrip() {
        String token = jwtService.generateToken("admin");
        assertThat(jwtService.extractUsername(token)).isEqualTo("admin");
        assertThat(jwtService.isValid(token, "admin")).isTrue();
        assertThat(jwtService.isValid(token, "other")).isFalse();
    }

    @Test
    void expiredToken_throwsWhenParsed() {
        JwtService shortLived = new JwtService("taphoa-test-secret-key-must-be-32chars-min", 1L);
        String token = shortLived.generateToken("admin");
        try {
            Thread.sleep(20);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        assertThatThrownBy(() -> shortLived.isValid(token, "admin"))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void tamperedToken_throws() {
        String token = jwtService.generateToken("admin") + "x";
        assertThatThrownBy(() -> jwtService.extractUsername(token))
                .isInstanceOf(RuntimeException.class);
    }
}
