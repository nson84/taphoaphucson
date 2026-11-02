package com.taphoa.debt.product;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rút gọn tên hàng và gán nhóm hàng chuẩn theo từ khóa trong tên (dữ liệu KiotViet nhập lộn nhóm).
 * Thuần hàm, không đụng DB.
 */
public final class ProductNormalizer {

    public static final String OTHER = "Khác";
    static final int MAX_NAME = 60;

    private ProductNormalizer() {
    }

    // ------------------------------------------------------------------ Tên hàng

    /** Mã nội bộ KiotViet: 35768T38_BÁNH… */
    private static final Pattern LEADING_CODE = Pattern.compile("^\\d+[A-Za-z]?\\d*_+");
    /** Tiền tố quầy: 079xa Hộp bút… */
    private static final Pattern LEADING_SKU_PREFIX = Pattern.compile("^\\d{2,}[A-Za-z]{0,4}\\s+");
    /** Mã model / SKU cuối tên: TL-079, VP-12 */
    private static final Pattern MODEL_CODE_TAIL = Pattern.compile("\\s+\\b[A-Za-z]{1,6}-\\d{2,8}\\s*$");
    /** Tem màu, size lẻ trong ngoặc — không phải tên chính */
    private static final Pattern VARIANT_BRACKET = Pattern.compile(
            "(?iu)[(\\[]\\s*(?:xanh|đỏ|do|den|trang|vang|tim|hong|hồng|xám|nâu|blue|red|green|black|white"
                    + "|size\\s*[smlxl]?|sz\\s*[sml]|loại\\s*\\d+|màu[^)\\]]*)[^)\\]]*[)\\]]");
    private static final Pattern VARIANT_BRACKET_TAIL = Pattern.compile("(?iu)\\s*[\\(\\[][^)\\]]{0,40}[)\\]\\}]?\\s*$");
    private static final Pattern PROMO_BRACKET = Pattern.compile(
            "(?iu)[(\\[][^)\\]]*(tem phụ|tem phu|date|hsd|hạn dùng|khuyến mãi|khuyen mai|tặng|tang|quà|qua tang|mua \\d|combo)[^)\\]]*[)\\]]");
    private static final Pattern DATE_TAIL = Pattern.compile("(?iu)\\s+(date|hsd|exp|nsx)\\b.*$");
    private static final Pattern PACK_TAIL = Pattern.compile(
            "(?iu)\\s*[-–—]\\s*(tuýp|tuyp|lớn|nhỏ|chai|gói|hộp|thùng|lốc|lon|túi|bịch|hũ|vpd|loại|size)\\b.*$");
    private static final Pattern BUY_PROMO = Pattern.compile("(?iu)\\bmua\\s*\\d+\\s*(tặng\\s*)?\\d*\\b");
    private static final Pattern GIFT_TAIL = Pattern.compile("(?iu)\\s+(tặng|khuyến mãi)\\b.*$");
    private static final Pattern PRICE_NOTE = Pattern.compile("(?iu)[.\\s]\\d{2,3}k$");
    private static final Pattern SIZE = Pattern.compile(
            "(?iu)(?<![\\p{L}\\d])\\d+(?:[.,]\\d+)?\\s*(ml|lít|lit|kg|gam|gr|g|l)(?![\\p{L}\\d])");
    // "+" cuối từ (Fuzetea+, 6m+) là một phần tên nên không cắt
    private static final Pattern EDGE_JUNK = Pattern.compile("^[\\s.\\-–—,;:/+&]+|[\\s.\\-–—,;:/&]+$|\\s+\\+$");
    private static final Pattern DANGLING = Pattern.compile(
            "(?iu)(?:^|\\s)(và|cho|của|the|with|and|for|of|vị|hương)$");

    public static String shortenName(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.replaceAll("[\\p{Cntrl}\\uFFFD]", " ").trim();
        if (s.isEmpty() || s.matches("\\d+")) {
            return s;
        }
        boolean stripped = false;
        if (LEADING_CODE.matcher(s).find()) {
            s = LEADING_CODE.matcher(s).replaceFirst("");
            stripped = true;
        }
        if (LEADING_SKU_PREFIX.matcher(s).find()) {
            s = LEADING_SKU_PREFIX.matcher(s).replaceFirst("");
            stripped = true;
        }
        if (PROMO_BRACKET.matcher(s).find()) {
            s = PROMO_BRACKET.matcher(s).replaceAll(" ");
            stripped = true;
        }
        if (VARIANT_BRACKET.matcher(s).find()) {
            s = VARIANT_BRACKET.matcher(s).replaceAll(" ");
            stripped = true;
        }
        String beforeTail = s;
        s = cutTail(DATE_TAIL, s);
        stripped = stripped || !s.equals(beforeTail);
        beforeTail = s;
        s = cutTail(PACK_TAIL, s);
        stripped = stripped || !s.equals(beforeTail);
        if (BUY_PROMO.matcher(s).find()) {
            s = BUY_PROMO.matcher(s).replaceAll(" ");
            stripped = true;
        }
        beforeTail = s;
        s = cutTail(GIFT_TAIL, s);
        stripped = stripped || !s.equals(beforeTail);
        s = clean(s);
        if (PRICE_NOTE.matcher(s).find()) {
            s = PRICE_NOTE.matcher(s).replaceFirst("");
            stripped = true;
        }
        s = clean(s);
        if (MODEL_CODE_TAIL.matcher(s).find()) {
            s = MODEL_CODE_TAIL.matcher(s).replaceAll("");
            stripped = true;
        }
        if (VARIANT_BRACKET_TAIL.matcher(s).find()) {
            s = VARIANT_BRACKET_TAIL.matcher(s).replaceAll("");
            stripped = true;
        }
        s = clean(s);
        if (s.isEmpty()) {
            return raw.trim();
        }
        if (stripped) {
            s = readableViCase(s);
        } else if (hasNoLowercase(s)) {
            s = titleCase(s);
        } else {
            s = Character.toUpperCase(s.charAt(0)) + s.substring(1);
        }
        if (s.length() > MAX_NAME) {
            s = truncate(s);
        }
        return normalizeUnits(s);
    }

    private static String cutTail(Pattern p, String s) {
        Matcher m = p.matcher(s);
        if (m.find() && m.start() > 0) {
            return s.substring(0, m.start());
        }
        return s;
    }

    private static String clean(String s) {
        String t = s.replaceAll("\\s+", " ").trim();
        String prev;
        do {
            prev = t;
            t = EDGE_JUNK.matcher(t).replaceAll("").trim();
        } while (!t.equals(prev));
        return t;
    }

    private static String truncate(String s) {
        Matcher m = SIZE.matcher(s);
        String size = null;
        int sizeEnd = -1;
        if (m.find()) {
            size = m.group().replaceAll("\\s+", "");
            sizeEnd = m.end();
        }
        String cut;
        if (sizeEnd > 0 && sizeEnd <= MAX_NAME + 10) {
            return clean(s.substring(0, sizeEnd));
        }
        int sp = s.lastIndexOf(' ', MAX_NAME);
        cut = clean(sp > 20 ? s.substring(0, sp) : s.substring(0, MAX_NAME));
        Matcher d = DANGLING.matcher(cut);
        while (d.find()) {
            cut = clean(cut.substring(0, d.start()));
            d = DANGLING.matcher(cut);
        }
        if (size != null && !SIZE.matcher(cut).find()) {
            cut = cut + " " + size;
        }
        return cut;
    }

    private static boolean hasNoLowercase(String s) {
        boolean letter = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (Character.isLowerCase(c)) {
                return false;
            }
            if (Character.isUpperCase(c)) {
                letter = true;
            }
        }
        return letter;
    }

    /** Tên đã bỏ mã/tem: một chữ hoa đầu, còn lại thường — dễ đọc trên POS. */
    private static String readableViCase(String s) {
        String lower = s.toLowerCase(Locale.forLanguageTag("vi"));
        if (lower.isEmpty()) {
            return lower;
        }
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private static String titleCase(String s) {
        StringBuilder out = new StringBuilder();
        for (String w : s.split(" ")) {
            if (out.length() > 0) {
                out.append(' ');
            }
            if (w.matches("[A-Z]{1,3}/[A-Z]{1,3}")) {
                out.append(w);
                continue;
            }
            String lower = w.toLowerCase(Locale.ROOT);
            if (!lower.isEmpty() && Character.isLetter(lower.charAt(0))) {
                out.append(Character.toUpperCase(lower.charAt(0))).append(lower.substring(1));
            } else {
                out.append(lower);
            }
        }
        return out.toString();
    }

    /** 170G → 170g, 3.2KG → 3.2kg, 500ML → 500ml. */
    private static String normalizeUnits(String s) {
        Matcher m = SIZE.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, Matcher.quoteReplacement(m.group().toLowerCase(Locale.ROOT)));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    // ------------------------------------------------------------------ Nhóm hàng

    private record Rule(String category, String... keywords) {
    }

    private static final List<Rule> RULES = List.of(
            new Rule("Gia vị & bột", "thuoc bac"),
            new Rule("Thuốc lá & bật lửa", "thuoc la", "marlboro", "vinataba", "bat lua", "zippo", "bao thuoc"),
            new Rule("Nước giải khát", "nuoc hoa qua", "nuoc ep", "nuoc ngot", "coca", "pepsi", "7up", "sprite",
                    "fanta", "mirinda", "redbull", "red bull", "bo huc", "monster", "aquafina", "lavie",
                    "nuoc suoi", "nuoc khoang", "nuoc tinh khiet", "tropicana", "kirin", "tea plus",
                    "nuoc giai khat", "nuoc tang luc", "sting", "revive", "number 1", "nuoc dua", "pocari"),
            new Rule("Văn phòng phẩm", "but bi", "but chi", "but muc", "but long", "but xoa", "but da quang", "but",
                    "vo ke", "vo tap", "vo hs", "thuoc ke", "hop but", "gom tay", "tay chi", "giay a4",
                    "giay note", "ho dan", "keo dan", "so tay", "bia nhua", "bia cong", "bia ho so", "bia la",
                    "bang keo", "phan viet", "compa", "kep giay", "kim bam", "tap sinh vien",
                    "^vo o", "^vo 4", "^vo 5", "^vo 6", "^so", "so office", "hai tien", "hong ha", "thien long",
                    "thuoc deo", "thuoc thang", "thuoc eke", "ghim", "file"),
            new Rule("Băng vệ sinh", "bang ve sinh", "bvs", "kotex", "diana", "laurier", "sofy", "mieng lot",
                    "whisper", "ladycare"),
            new Rule("Mẹ & bé", "ta quan", "ta dan", "ta bim", "bobby", "huggies", "pampers", "merries", "moony",
                    "khan uot", "giay uot", "binh sua", "pigeon", "mom love", "momlove", "nuoc rua binh",
                    "bim quan", "bim dan", "dnee", "d nee", "tam lot"),
            new Rule("Đồ dùng gia đình", "giay bac", "giay nen", "mang boc"),
            new Rule("Giấy & khăn giấy", "^giay", "giay ve sinh", "giay an", "khan giay", "giay rut", "khan an",
                    "cuon giay", "giay lau", "giay thom",
                    "silkwell", "gvs", "pulppy"),
            new Rule("Răng miệng", "kem danh rang", "kdr", "ban chai", "nuoc suc mieng", "chi nha khoa", "colgate", "closeup", "close up"),
            new Rule("Mỹ phẩm & chăm sóc da", "sua rua mat", "kem chong nang", "chong nang", "tay trang",
                    "duong da", "duong the", "duong am", "serum", "mat na", "hatomugi", "kose", "kem duong",
                    "son moi", "son duong", "nuoc hoa hong", "toner", "lotion", "sua duong", "kem lot", "phan",
                    "tay te bao chet", "gel rua mat", "rua mat", "cushion", "nuoc hoa", "body mist", "tay long",
                    "kem tay", "dung dich ve sinh", "lactacyd", "kem tri mun"),
            new Rule("Dầu gội & sữa tắm", "dau goi", "dau xa", "sua tam", "dau tam", "gel tam", "xa bong", "xmen",
                    "rejoice", "romano", "sunsilk", "lifebuoy", "pantene", "tresemme", "kem xa", "head shoulders",
                    "xa phong tam", "soap"),
            new Rule("Giặt giũ & vệ sinh nhà", "nuoc giat", "nuoc xa", "bot giat", "omo", "surf", "ariel", "downy",
                    "comfort", "nuoc lau san", "nuoc rua chen", "nuoc rua bat", "sunlight", "nuoc rua tay",
                    "javel", "nuoc tay", "cif", "lix", "vim", "tay bon cau", "xit phong", "xit muoi", "nhang muoi",
                    "thuoc diet", "raid", "baygon", "tay rua", "nuoc lau kinh", "nuoc lau", "diet con trung",
                    "xit con trung", "xa vai", "binh xit", "xit thom", "sap thom", "thong cong", "thong tac",
                    "tay can", "lau san", "xit ruoi", "glade", "mr fresh", "ambi pur", "sifa", "fily", "sat khuan",
                    "cuoc", "sit kinh", "xit kinh", "nuoc sit", "tui thom", "huong muoi", "huong tram",
                    "tay quan ao", "vien tay", "toilet", "lam sach"),
            new Rule("Đồ cá nhân", "dao cao", "gillette", "bong tay trang", "tam bong", "bam mong", "cat mong",
                    "luoc", "khau trang", "khan mat", "lan khu mui", "khu mui", "bang ca nhan", "kep toc",
                    "chun buoc toc", "nivea", "roll on", "^tat", "quan tat", "vo tat", "nhip tia", "tam goi",
                    "khan tam", "khan", "bong tam", "razor"),
            new Rule("Đồ chơi", "lego", "do choi", "bup be", "slime", "robot", "sung nuoc", "bong bay", "con quay",
                    "hinh dan", "sticker", "dat nan", "tranh to", "tu lo kho"),
            new Rule("Pin & điện", "pin", "den pin", "bong den", "o cam", "day dien", "cu sac", "cap sac",
                    "tai nghe"),
            new Rule("Thuốc & y tế", "thuoc", "salonpas", "dau gio", "cao sao vang", "oresol", "panadol",
                    "nhiet ke", "con y te", "oxy gia", "dau nong", "dau khuynh diep", "dau cu la", "tinh dau",
                    "muoi sinh ly", "bang dan", "bong gon", "keo ngam ho", "strepsils"),
            new Rule("Bia & rượu", "bia", "ruou", "vodka", "sake", "whisky", "heineken", "tiger", "saigon beer",
                    "larue", "bivina", "strongbow", "soju"),
            new Rule("Bánh mì & bánh bao", "banh mi", "sandwich", "banh bao", "pizza"),
            new Rule("Gia vị & bột", "bot canh", "bot ngot", "bot mi", "bot nang", "bot gao", "bot nep", "bot chien",
                    "bot banh", "bot nghe", "bot xu", "bot tay", "nuoc mam", "nuoc tuong", "tuong ot", "tuong ca",
                    "tuong an", "dau tuong", "xi dau", "dau an", "dau hao", "hat nem", "mi chinh", "gia vi",
                    "muoi i ot", "muoi tinh", "duong cat", "duong phen", "duong trang", "dau me", "dau oliu",
                    "simply", "neptune", "cholimex", "uop thit", "mayonnaise", "nuoc cham"),
            new Rule("Mì, phở, cháo", "mi", "mien", "pho an lien", "pho bo", "pho ga", "hu tieu", "banh canh",
                    "hao hao", "omachi", "kokomi", "chao an lien", "chao tuoi", "chao yen", "chao gau do",
                    "chao sup", "nui", "my y", "my tom", "my goi", "my an lien", "pho tron", "bun bo", "bun"),
            new Rule("Snack", "snack", "bim bim", "oishi", "poca", "lay", "lays", "pringles", "swing", "cheetos",
                    "khoai tay chien", "khoai tay", "bap rang", "bong bap", "bap ly", "phong tom"),
            new Rule("Bánh", "banh", "banha", "banhs", "toppo", "cookie", "cracker", "oreo", "chocopie", "choco pie", "nabati", "quy"),
            new Rule("Sữa", "^sua", "sua tuoi", "sua chua", "sua dac", "sua bot", "sua hop", "sua dau nanh",
                    "sua hat", "pho mai", "vinamilk", "th true milk", "dalat milk", "milk", "milo", "ovaltine", "nutifood",
                    "yakult", "probi", "growplus", "kun", "aptamil", "dielac", "enfa", "similac", "dutch lady", "yomost"),
            new Rule("Kẹo & socola", "keo", "socola", "chocolate", "thach", "alpenliebe", "chewing", "singum",
                    "marshmallow", "gum", "gummy", "kitkat", "kit kat", "mentos", "xylitol", "opero", "candy",
                    "lollipop", "lolipop", "o mai", "omai", "xi muoi"),
            new Rule("Kem", "^kem", "kem que", "kem oc que", "kem sua dua", "oc que"),
            new Rule("Cà phê & trà", "ca phe", "cafe", "coffee", "g7", "nescafe", "vinacafe", "trung nguyen",
                    "tra tui loc", "lipton", "tra gung", "tra thao moc", "che"),
            new Rule("Nước giải khát", "ice", "tra xanh", "tra chanh", "tra dao", "tra sua", "tra bi dao",
                    "tra thai", "tra da", "tra o long", "o long", "olong", "c2", "nuoc yen", "nuoc cam",
                    "nuoc uong", "nuoc dua", "nuoc mia", "twister", "wonderfarm", "vfresh", "chanh day", "yen",
                    "nuoc trai cay", "nuoc loc", "nutri boost", "nutriboost", "fuzetea", "th true", "juice", "tra", "pororo", "nutri", "tea"),
            new Rule("Gia vị & bột", "xot", "sot", "tieu", "giam an", "mam tom", "mam ruoc", "mam nem", "muoi hat",
                    "muoi tom", "muoi ot", "knorr", "maggi", "chinsu", "tuong", "ca ri", "bot",
                    "ngu vi huong", "nuoc dung", "mam", "nam ngu", "sa te", "duong kinh", "duong vang",
                    "giam trang", "wasabi", "mu tat", "muoi vung"),
            new Rule("Gạo, ngũ cốc & hạt", "gao", "ngu coc", "yen mach", "oatmeal", "dau xanh", "dau den",
                    "dau do", "dau phong", "hat dieu", "hat huong duong", "hat de", "hat chia", "nho kho", "mut",
                    "hat sen", "hat", "say", "mix", "khoai lang", "huong duong", "tao do"),
            new Rule("Thực phẩm chế biến", "xuc xich", "cha lua", "cha", "pate", "thit hop", "ca hop", "ruoc",
                    "kho bo", "kho ga", "muc", "tom kho", "rong bien", "kim chi", "dua muoi", "ca kho", "lap xuong",
                    "trung ga", "trung vit", "trung cut", "thit",
                    "bo kho", "luong kho", "ca vien", "bo vien", "dui ga", "ga cay", "ga ran", "chan ga", "da heo", "doi sun"),
            new Rule("Đồ dùng gia đình", "bao rac", "tui rac", "tui nilon", "tui zip", "mang boc", "giay bac",
                    "gang tay", "khan lau", "hop nhua", "binh nuoc", "coc nhua", "ly nhua", "ly giay", "bat nhua",
                    "dia nhua", "que tam", "tam xop", "day thun", "chen", "dua", "muong", "thia", "choi", "xo",
                    "mang nhom", "khay", "moc dan", "moc treo", "moc dinh", "moc", "tui dung", "rua bat", "lau bep", "gia de",
                    "tam nhua", "tam vi", "bang dinh", "lo nhua", "ao mua", "phich", "hop lanh", "ca uong")
    );

    /** Nhóm cũ KiotViet đủ tin cậy để dùng khi tên không khớp từ khóa nào. */
    private static final Map<String, String> LEGACY = Map.ofEntries(
            Map.entry("mi tom", "Mì, phở, cháo"),
            Map.entry("mien", "Mì, phở, cháo"),
            Map.entry("chao an lien", "Mì, phở, cháo"),
            Map.entry("sua", "Sữa"),
            Map.entry("sua chua", "Sữa"),
            Map.entry("nuoc ngot", "Nước giải khát"),
            Map.entry("bia", "Bia & rượu"),
            Map.entry("bia ha long", "Bia & rượu"),
            Map.entry("keo", "Kẹo & socola"),
            Map.entry("thach binh dung goi", "Kẹo & socola"),
            Map.entry("kem", "Kem"),
            Map.entry("dau goi", "Dầu gội & sữa tắm"),
            Map.entry("dau an", "Gia vị & bột"),
            Map.entry("bim bim", "Snack"),
            Map.entry("cafe", "Cà phê & trà"),
            Map.entry("pin", "Pin & điện"),
            Map.entry("do choi", "Đồ chơi"),
            Map.entry("thuoc la", "Thuốc lá & bật lửa"),
            Map.entry("thuoc", "Thuốc & y tế"));

    /** Bỏ dấu, thường hóa, chỉ giữ chữ số và chữ cái; bọc dấu cách để khớp nguyên từ. */
    static String fold(String s) {
        if (s == null) {
            return " ";
        }
        String t = Normalizer.normalize(s.toLowerCase(Locale.ROOT).replace('đ', 'd'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        t = t.replaceAll("[^a-z0-9]+", " ").trim();
        return " " + t + " ";
    }

    public static String classify(String name, String legacyCategory) {
        String f = fold(name);
        for (Rule rule : RULES) {
            for (String kw : rule.keywords()) {
                if (matches(f, kw)) {
                    return rule.category();
                }
            }
        }
        if (legacyCategory != null) {
            // đã là nhóm chuẩn (chạy lại nhiều lần vẫn ra cùng kết quả)
            if (OTHER.equals(legacyCategory) || isStandardCategory(legacyCategory)) {
                return legacyCategory;
            }
            String key = fold(legacyCategory).trim();
            String mapped = LEGACY.get(key);
            if (mapped != null) {
                return mapped;
            }
        }
        return OTHER;
    }

    private static boolean isStandardCategory(String category) {
        for (Rule rule : RULES) {
            if (rule.category().equals(category)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matches(String folded, String kw) {
        if (kw.startsWith("^")) {
            return folded.startsWith(" " + kw.substring(1) + " ");
        }
        return folded.contains(" " + kw + " ");
    }
}
