package com.taphoa.debt.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.common.ApiException;

@Service
public class PinService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PinService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void verifyCurrentUserPin(String pin) {
        if (pin == null || pin.isBlank()) {
            throw new ApiException("Vui lòng nhập mã PIN", HttpStatus.BAD_REQUEST);
        }
        User user = currentUser();
        if (user.getPinHash() == null || !passwordEncoder.matches(pin, user.getPinHash())) {
            throw new ApiException("Mã PIN không đúng", HttpStatus.FORBIDDEN);
        }
    }

    @Transactional
    public void changePin(String currentPin, String newPin) {
        if (newPin == null || !newPin.matches("^\\d{4,8}$")) {
            throw new ApiException("PIN mới phải gồm 4-8 chữ số", HttpStatus.BAD_REQUEST);
        }
        User user = currentUser();
        if (user.getPinHash() == null || !passwordEncoder.matches(currentPin, user.getPinHash())) {
            throw new ApiException("PIN hiện tại không đúng", HttpStatus.BAD_REQUEST);
        }
        user.setPinHash(passwordEncoder.encode(newPin));
        userRepository.save(user);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ApiException("Chưa đăng nhập", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ApiException("Không tìm thấy tài khoản", HttpStatus.UNAUTHORIZED));
    }
}
