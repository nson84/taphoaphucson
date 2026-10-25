SET NAMES utf8mb4;

UPDATE debts SET product_note = 'dầu ăn' WHERE product_note = 'd?u an' OR product_note = 'dau an';
UPDATE debts SET product_note = 'trứng' WHERE product_note = 'tr?ng' OR product_note = 'trung';
UPDATE debts SET product_note = 'sữa' WHERE product_note = 's?a' OR product_note = 'sua';
UPDATE debts SET product_note = 'đường' WHERE product_note = 'du?ng' OR product_note = 'duong';
UPDATE debts SET product_note = 'nước ngọt' WHERE product_note = 'nu?c ng?t' OR product_note = 'nuoc ngot';
UPDATE debts SET product_note = 'kẹo' WHERE product_note = 'k?o' OR product_note = 'keo';
UPDATE debts SET product_note = 'nến' WHERE product_note = 'n?n' OR product_note = 'nen';
UPDATE debts SET product_note = 'mì tôm' WHERE product_note = 'mi tom';
UPDATE debts SET product_note = 'gạo' WHERE product_note = 'gao';
UPDATE debts SET product_note = 'nước mắm' WHERE product_note = 'nuoc mam';
UPDATE debts SET product_note = 'bánh mì' WHERE product_note = 'banh mi';
UPDATE debts SET product_note = 'muối' WHERE product_note = 'muoi';
UPDATE debts SET product_note = 'xà phòng' WHERE product_note = 'xa phong';
UPDATE debts SET product_note = 'kem đánh răng' WHERE product_note = 'kem danh rang';
UPDATE debts SET product_note = 'cà phê' WHERE product_note = 'ca phe';
UPDATE debts SET product_note = 'mì gói' WHERE product_note = 'mi goi';
UPDATE debts SET product_note = 'thuốc lá' WHERE product_note = 'thuoc la';

UPDATE debts SET customer_note = 'trả dần' WHERE customer_note = 'tr? d?n';
UPDATE debts SET customer_note = 'hẹn trả cuối tuần' WHERE customer_note = 'h?n tr? cu?i tu?n' OR customer_note = 'hen tra cuoi tuan';
UPDATE debts SET customer_note = 'lấy thiếu tiền' WHERE customer_note = 'lay thieu tien';
UPDATE debts SET customer_note = 'khách quen' WHERE customer_note = 'khach quen';
UPDATE debts SET customer_note = 'mua thêm' WHERE customer_note = 'mua them';

SELECT id, product_note, customer_note FROM debts ORDER BY id;
