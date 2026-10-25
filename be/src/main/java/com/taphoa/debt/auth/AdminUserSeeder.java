package com.taphoa.debt.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;
    private final String pin;

    public AdminUserSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.username}") String username,
            @Value("${app.admin.password}") String password,
            @Value("${app.admin.pin}") String pin
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
        this.pin = pin;
    }

    @Override
    public void run(ApplicationArguments args) {
        userRepository.findByUsername(username).ifPresentOrElse(user -> {
            if (user.getPinHash() == null || user.getPinHash().isBlank()) {
                user.setPinHash(passwordEncoder.encode(pin));
                userRepository.save(user);
            }
        }, () -> {
            User user = new User();
            user.setUsername(username);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setPinHash(passwordEncoder.encode(pin));
            userRepository.save(user);
        });
    }
}
