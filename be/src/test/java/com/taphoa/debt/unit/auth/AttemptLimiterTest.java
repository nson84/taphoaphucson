package com.taphoa.debt.unit.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.taphoa.debt.auth.AttemptLimiter;
import com.taphoa.debt.common.ApiException;

class AttemptLimiterTest {

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private MutableClock clock;
    private AttemptLimiter limiter;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        limiter = new AttemptLimiter(clock);
    }

    private void fail(String key, int times) {
        for (int i = 0; i < times; i++) {
            limiter.checkAllowed(key);
            limiter.recordFailure(key);
        }
    }

    @Test
    void belowThreshold_staysAllowed() {
        fail("pin:admin", AttemptLimiter.MAX_FAILURES - 1);
        assertThatCode(() -> limiter.checkAllowed("pin:admin")).doesNotThrowAnyException();
    }

    @Test
    void reachingThreshold_locksWith429() {
        fail("pin:admin", AttemptLimiter.MAX_FAILURES);

        assertThatThrownBy(() -> limiter.checkAllowed("pin:admin"))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    void lockExpiresAfterDuration() {
        fail("pin:admin", AttemptLimiter.MAX_FAILURES);

        clock.advance(AttemptLimiter.LOCK_DURATION.plusSeconds(1));

        assertThatCode(() -> limiter.checkAllowed("pin:admin")).doesNotThrowAnyException();
    }

    @Test
    void success_resetsFailureCount() {
        fail("pin:admin", AttemptLimiter.MAX_FAILURES - 1);
        limiter.recordSuccess("pin:admin");
        fail("pin:admin", AttemptLimiter.MAX_FAILURES - 1);

        assertThatCode(() -> limiter.checkAllowed("pin:admin")).doesNotThrowAnyException();
    }

    @Test
    void keysAreIndependent() {
        fail("pin:admin", AttemptLimiter.MAX_FAILURES);

        assertThatCode(() -> limiter.checkAllowed("backup")).doesNotThrowAnyException();
    }
}
