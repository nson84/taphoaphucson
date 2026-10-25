package com.taphoa.debt.cards;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/card-products")
public class CardProductController {

    private final CardOrderService cardOrderService;

    public CardProductController(CardOrderService cardOrderService) {
        this.cardOrderService = cardOrderService;
    }

    @GetMapping
    public List<CardProductDto> list() {
        return cardOrderService.listProducts();
    }
}
