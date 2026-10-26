package com.taphoa.debt.auth;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final PinService pinService;

    public ProfileController(PinService pinService) {
        this.pinService = pinService;
    }

    @PostMapping("/pin/verify")
    public Map<String, String> verifyPin(@Valid @RequestBody VerifyPinRequest request) {
        pinService.verifyCurrentUserPin(request.pin());
        return Map.of("message", "PIN hợp lệ");
    }

    @PutMapping("/pin")
    public Map<String, String> changePin(@Valid @RequestBody ChangePinRequest request) {
        pinService.changePin(request.currentPin(), request.newPin());
        return Map.of("message", "Đã cập nhật mã PIN");
    }
}
