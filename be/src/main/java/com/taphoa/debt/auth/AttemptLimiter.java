package com.taphoa.debt.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.taphoa.debt.common.ApiException;

/**
 * Giới hạn số lần nhập sai (PIN, đăng nhập): sai {@value #MAX_FAILURES} lần liên tiếp
 * thì khóa {@code key} đó {@code LOCK_DURATION}. Lưu trong bộ nhớ — đủ cho app 1 máy quầy; khởi động lại thì xóa.
 */
@Component
public class AttemptLimiter {

    public static final int MAX_FAILURES = 5;
    public static final Duration LOCK_DURATION = Duration.ofMinutes(1);

    private record State(int failures, Instant lockedUntil) {
    }

    private final ConcurrentMap<String, State> states = new ConcurrentHashMap<>();
    private final Clock clock;

    public AttemptLimiter() {
        this(Clock.systemUTC());
    }

    /** Dùng trong test để điều khiển thời gian. */
    public AttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Ném 429 nếu {@code key} đang bị khóa. Gọi trước khi so khớp PIN/mật khẩu. */
    public void checkAllowed(String key) {
        State state = states.get(key);
        if (state == null || state.lockedUntil() == null) {
            return;
        }
        Instant now = clock.instant();
        if (now.isBefore(state.lockedUntil())) {
            long seconds = Math.max(1, Duration.between(now, state.lockedUntil()).toSeconds() + 1);
            throw new ApiException(
                    "Nhập sai quá nhiều lần. Vui lòng thử lại sau " + seconds + " giây",
                    HttpStatus.TOO_MANY_REQUESTS);
        }
        states.remove(key, state);
    }

    public void recordFailure(String key) {
        Instant now = clock.instant();
        states.merge(key, new State(1, null), (old, ignored) -> {
            int failures = old.failures() + 1;
            if (failures >= MAX_FAILURES) {
                return new State(0, now.plus(LOCK_DURATION));
            }
            return new State(failures, old.lockedUntil());
        });
    }

    public void recordSuccess(String key) {
        states.remove(key);
    }
}
