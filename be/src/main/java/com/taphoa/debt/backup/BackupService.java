package com.taphoa.debt.backup;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.sql.DataSource;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.taphoa.debt.common.ApiException;

@Service
public class BackupService {

    private static final Set<String> SKIP_TABLES = Set.of(
            "flyway_schema_history",
            "FLYWAY_SCHEMA_HISTORY"
    );

    private final DataSource dataSource;
    private final ObjectMapper objectMapper;

    public BackupService(DataSource dataSource) {
        this.dataSource = dataSource;
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    public String suggestedFileName() {
        String stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(Instant.now());
        return "taphoa-backup-" + stamp + ".json";
    }

    public byte[] createBackupJson() {
        try (Connection conn = dataSource.getConnection()) {
            Map<String, Object> root = new LinkedHashMap<>();
            root.put("version", 1);
            root.put("exportedAt", Instant.now().toString());
            root.put("catalog", conn.getCatalog());
            root.put("tables", dumpAllTables(conn));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            objectMapper.writeValue(out, root);
            return out.toByteArray();
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Không tạo được bản sao lưu: " + ex.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Map<String, List<Map<String, Object>>> dumpAllTables(Connection conn) throws Exception {
        Map<String, List<Map<String, Object>>> tables = new LinkedHashMap<>();
        DatabaseMetaData meta = conn.getMetaData();
        String catalog = conn.getCatalog();
        // MySQL: getSchema() = null (phạm vi theo catalog). H2/DB khác: giới hạn schema hiện tại, bỏ INFORMATION_SCHEMA.
        String schema = conn.getSchema();
        try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[] {"TABLE"})) {
            while (rs.next()) {
                String table = rs.getString("TABLE_NAME");
                if (table == null || SKIP_TABLES.contains(table) || SKIP_TABLES.contains(table.toLowerCase())) {
                    continue;
                }
                tables.put(table, dumpTable(conn, table));
            }
        }
        return tables;
    }

    private List<Map<String, Object>> dumpTable(Connection conn, String table) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        String sql = "SELECT * FROM `" + table.replace("`", "") + "`";
        try (Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            ResultSetMetaData md = rs.getMetaData();
            int cols = md.getColumnCount();
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= cols; i++) {
                    row.put(md.getColumnLabel(i), normalizeValue(rs.getObject(i)));
                }
                rows.add(row);
            }
        }
        return rows;
    }

    /**
     * Đưa giá trị JDBC về dạng JSON được: MySQL driver trả {@code LocalDateTime/LocalDate/LocalTime}
     * cho cột DATETIME/DATE/TIME, mà ObjectMapper trần không serialize được → backup lỗi khi có dữ liệu.
     */
    static Object normalizeValue(Object value) {
        if (value instanceof byte[] bytes) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        if (value instanceof TemporalAccessor temporal) {
            return temporal.toString();
        }
        if (value instanceof java.sql.Timestamp ts) {
            return ts.toLocalDateTime().toString();
        }
        if (value instanceof java.sql.Date d) {
            return d.toLocalDate().toString();
        }
        if (value instanceof java.sql.Time t) {
            return t.toLocalTime().toString();
        }
        return value;
    }
}
