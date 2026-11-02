package com.taphoa.debt.auth;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.http.HttpServletResponse;

final class SecurityJsonResponse {

    private SecurityJsonResponse() {}

    static void writeUnauthorized(HttpServletResponse response) throws IOException {
        write(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Chưa đăng nhập");
    }

    static void writeForbidden(HttpServletResponse response) throws IOException {
        write(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden", "Không có quyền truy cập");
    }

    static void writeAccessDenied(HttpServletResponse response) throws IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken) {
            writeUnauthorized(response);
        } else {
            writeForbidden(response);
        }
    }

    private static void write(HttpServletResponse response, int status, String error, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        String body = """
                {"timestamp":"%s","status":%d,"error":"%s","message":"%s"}
                """
                .formatted(Instant.now(), status, jsonEscape(error), jsonEscape(message))
                .trim();
        response.getWriter().write(body);
    }

    private static String jsonEscape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
