package com.taphoa.debt.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class ApiTestSupport {

    public static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();

    private ApiTestSupport() {
    }

    public static String loginToken(MockMvc mockMvc) throws Exception {
        return loginToken(mockMvc, "admin", "admin123");
    }

    public static String loginToken(MockMvc mockMvc, String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = MAPPER.readTree(result.getResponse().getContentAsString());
        return body.get("token").asText();
    }

    public static String bearer(String token) {
        return "Bearer " + token;
    }

    public static long readId(MvcResult result) throws Exception {
        return MAPPER.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }
}
