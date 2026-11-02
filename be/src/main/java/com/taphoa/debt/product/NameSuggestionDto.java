package com.taphoa.debt.product;

public record NameSuggestionDto(
        String code,
        boolean found,
        String name,
        String brands,
        String quantity,
        String source,
        String message
) {
    static NameSuggestionDto notFound(String code, String message) {
        return new NameSuggestionDto(code, false, null, null, null, null, message);
    }
}
