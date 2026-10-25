package com.taphoa.debt.cards;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/card-orders")
public class CardOrderController {

    private final CardOrderService cardOrderService;

    public CardOrderController(CardOrderService cardOrderService) {
        this.cardOrderService = cardOrderService;
    }

    @GetMapping
    public List<CardOrderDto> myOrders() {
        return cardOrderService.listMyOrders();
    }

    @GetMapping("/awaiting-fulfillment")
    public List<CardOrderDto> awaiting() {
        return cardOrderService.listAwaitingFulfillment();
    }

    @GetMapping("/by-ref/{reference}")
    public CardOrderDto byRef(@PathVariable String reference) {
        return cardOrderService.getByReference(reference);
    }

    @GetMapping("/{id}")
    public CardOrderDto byId(@PathVariable Long id) {
        return cardOrderService.getById(id);
    }

    @PostMapping
    public CardOrderDto create(@Valid @RequestBody CreateCardOrderRequest request) {
        return cardOrderService.createOrder(request);
    }

    @PostMapping("/{id}/fulfill")
    public CardOrderDto fulfill(@PathVariable Long id, @Valid @RequestBody FulfillCardOrderRequest request) {
        return cardOrderService.fulfill(id, request);
    }

    @PostMapping("/by-ref/{reference}/simulate-pay")
    public CardOrderDto simulatePay(@PathVariable String reference) {
        return cardOrderService.simulatePay(reference);
    }
}
