package com.taphoa.debt.unit.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.taphoa.debt.product.ProductNormalizer;

class ProductNormalizerTest {

    @Test
    void shortenName_dropsPromoDateAndMarketingTail() {
        String out = ProductNormalizer.shortenName(
                "(Có Tem Phụ) Sữa Rửa Mặt Reihaku Hatomugi Moisturizing & Facial Washing The Facial Foam 170g Date 05/2024- Tuýp Lớn");
        assertTrue(out.startsWith("Sữa rửa mặt reihaku hatomugi moisturizing & facial washing"), out);
        assertTrue(out.length() <= 70, out);
        assertTrue(!out.contains("Date") && !out.contains("Tem"), out);
    }

    @Test
    void shortenName_keepsShortNamesAndSize() {
        assertEquals("Sữa Milo 180ml", ProductNormalizer.shortenName("Sữa Milo 180ml"));
        assertEquals("Bánh Que Toppo Sôcôla 40gr", ProductNormalizer.shortenName("BÁNH QUE TOPPO SÔCÔLA 40GR"));
    }

    @Test
    void shortenName_stripsLeadingInternalCode() {
        assertTrue(ProductNormalizer.shortenName("35768T38_BÁNH QUY RICHY 333G").startsWith("Bánh quy richy"));
    }

    @Test
    void shortenName_keepsMainProductDescription() {
        assertEquals(
                "Hộp bút bi thiên long treedee",
                ProductNormalizer.shortenName("079xa Hộp Bút Bi Thiên Long Treedee TL-079 (xanh]"));
    }

    @Test
    void classify_fixesWrongKiotVietGroup() {
        assertEquals("Nước giải khát",
                ProductNormalizer.classify("Nước tăng lực Bò Húc 250ml", "Băng vệ sinh>>mieng lot bobby64 +6m"));
        assertEquals("Băng vệ sinh", ProductNormalizer.classify("Băng Vệ Sinh Diana Sensi 8 miếng", "Gia vị"));
        assertEquals("Mì, phở, cháo", ProductNormalizer.classify("Mì Hảo Hảo tôm chua cay 75g", "Gia vị"));
        assertEquals("Gia vị & bột", ProductNormalizer.classify("Bột mì số 8 1kg", "mì tôm"));
        assertEquals("Bánh mì & bánh bao", ProductNormalizer.classify("Bánh mì sandwich Staff", "mì tôm"));
        assertEquals("Răng miệng", ProductNormalizer.classify("Kem đánh răng P/S 180g", "Kẹo bánh"));
        assertEquals("Kem", ProductNormalizer.classify("Kem ốc quế dâu 65g", "kem"));
        assertEquals("Khác", ProductNormalizer.classify("18934804047802", "Băng vệ sinh>>mieng lot bobby64 +6m"));
        // chạy lại trên dữ liệu đã chuẩn hóa không đổi nhóm
        assertEquals("Bánh", ProductNormalizer.classify("Orion Custas", "Bánh"));
        assertEquals("Khác", ProductNormalizer.classify("Orochi", "Khác"));
    }
}
