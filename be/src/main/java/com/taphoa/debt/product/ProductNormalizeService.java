package com.taphoa.debt.product;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.auth.PinService;

@Service
public class ProductNormalizeService {

    public record Change(Long id, String oldName, String newName, String oldCategory, String newCategory) {
    }

    public record Preview(
            long total,
            long nameChanged,
            long categoryChanged,
            Map<String, Integer> categories,
            List<Change> samples
    ) {
    }

    public record ApplyResult(long nameChanged, long categoryChanged) {
    }

    private final ProductRepository productRepository;
    private final PinService pinService;

    public ProductNormalizeService(ProductRepository productRepository, PinService pinService) {
        this.productRepository = productRepository;
        this.pinService = pinService;
    }

    @Transactional(readOnly = true)
    public Preview preview(int limit, String onlyCategory) {
        List<Product> all = productRepository.findAll();
        Map<String, Integer> categories = new TreeMap<>();
        List<Change> samples = new ArrayList<>();
        long nameChanged = 0;
        long categoryChanged = 0;
        int step = 0;
        for (Product p : all) {
            String newName = ProductNormalizer.shortenName(p.getName());
            String newCategory = ProductNormalizer.classify(newName, p.getCategory());
            categories.merge(newCategory, 1, Integer::sum);
            boolean nc = !Objects.equals(newName, p.getName());
            boolean cc = !Objects.equals(newCategory, p.getCategory());
            if (nc) {
                nameChanged++;
            }
            if (cc) {
                categoryChanged++;
            }
            boolean wanted = onlyCategory == null || onlyCategory.isBlank()
                    ? (nc || cc)
                    : newCategory.equals(onlyCategory);
            if (wanted && samples.size() < limit) {
                // lấy cách quãng để mẫu trải đều thay vì chỉ đầu danh sách
                if (limit >= all.size() || step++ % 7 == 0) {
                    samples.add(new Change(p.getId(), p.getName(), newName, p.getCategory(), newCategory));
                }
            }
        }
        return new Preview(all.size(), nameChanged, categoryChanged, categories, samples);
    }

    @Transactional
    public ApplyResult apply(String pin) {
        pinService.verifyCurrentUserPin(pin);
        long nameChanged = 0;
        long categoryChanged = 0;
        for (Product p : productRepository.findAll()) {
            String newName = ProductNormalizer.shortenName(p.getName());
            String newCategory = ProductNormalizer.classify(newName, p.getCategory());
            if (!Objects.equals(newName, p.getName())) {
                p.setName(newName);
                nameChanged++;
            }
            if (!Objects.equals(newCategory, p.getCategory())) {
                p.setCategory(newCategory);
                categoryChanged++;
            }
        }
        return new ApplyResult(nameChanged, categoryChanged);
    }
}
