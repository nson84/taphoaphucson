package com.taphoa.debt.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.taphoa.debt.common.ApiException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AttemptLimiter attemptLimiter;

    public AuthController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AttemptLimiter attemptLimiter
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.attemptLimiter = attemptLimiter;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        String key = "login:" + request.username();
        attemptLimiter.checkAllowed(key);
        User user = userRepository.findByUsername(request.username()).orElse(null);
        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            attemptLimiter.recordFailure(key);
            throw new ApiException("Sai tài khoản hoặc mật khẩu", HttpStatus.UNAUTHORIZED);
        }
        attemptLimiter.recordSuccess(key);
        return new LoginResponse(jwtService.generateToken(user.getUsername()), user.getUsername());
    }

    @PostMapping("/logout")
    public void logout() {
        // JWT stateless: client xóa token
    }
}
