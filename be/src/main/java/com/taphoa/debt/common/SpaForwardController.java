package com.taphoa.debt.common;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Phục vụ React SPA khi FE được build vào static/ của jar (app desktop).
 */
@Controller
public class SpaForwardController {

    @GetMapping({
            "/",
            "/login",
            "/debts",
            "/debts/**",
            "/customers",
            "/customers/**",
            "/trash",
            "/settings",
            "/error",
            "/error/**",
            "/cards",
            "/cards/**",
            "/pos",
            "/products",
            "/products/**",
            "/sales",
            "/sales/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
