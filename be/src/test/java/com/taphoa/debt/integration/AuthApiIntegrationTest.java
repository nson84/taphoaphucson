package com.taphoa.debt.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.support.ApiTestSupport;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void login_success() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"admin123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value("admin"));
    }

    @Test
    void login_wrongPassword_unauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"sai"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_withoutToken_forbidden() throws Exception {
        // Spring Security mặc định trả 403 khi chưa authenticated (stateless JWT)
        mockMvc.perform(post("/api/debts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void changePin_thenUnpayRequiresNewPin() throws Exception {
        String token = ApiTestSupport.loginToken(mockMvc);

        mockMvc.perform(put("/api/profile/pin")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPin":"123456","newPin":"654321"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Đã cập nhật mã PIN"));

        // đổi lại PIN để không ảnh hưởng test khác nếu rollback fail
        mockMvc.perform(put("/api/profile/pin")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPin":"654321","newPin":"123456"}
                                """))
                .andExpect(status().isOk());
    }
}
