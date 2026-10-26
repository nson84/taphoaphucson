package com.taphoa.debt.backup;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings/backup")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @PostMapping("/unlock")
    public Map<String, String> unlock(@Valid @RequestBody BackupPasswordRequest request) {
        backupService.verifyPassword(request.password());
        return Map.of("message", "Đã mở mục Backup");
    }

    @PostMapping("/download")
    public ResponseEntity<byte[]> download(@Valid @RequestBody BackupPasswordRequest request) {
        backupService.verifyPassword(request.password());
        byte[] body = backupService.createBackupJson();
        String filename = backupService.suggestedFileName();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .contentLength(body.length)
                .body(body);
    }
}
