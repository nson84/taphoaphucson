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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
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
    private final String backupPassword;

    public BackupService(
            DataSource dataSource,
            @Value("${app.backup.password:842003}") String backupPassword
    ) {
        this.dataSource = dataSource;
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
        this.backupPassword = backupPassword;
    }

    public void verifyPassword(String password) {
        if (password == null || !backupPassword.equals(password)) {
            throw new ApiException("Mật khẩu backup không đúng", HttpStatus.FORBIDDEN);
        }
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
        try (ResultSet rs = meta.getTables(catalog, null, "%", new String[] {"TABLE"})) {
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
                    Object value = rs.getObject(i);
                    if (value instanceof byte[] bytes) {
                        value = new String(bytes, StandardCharsets.UTF_8);
                    }
                    row.put(md.getColumnLabel(i), value);
                }
                rows.add(row);
            }
        }
        return rows;
    }
}
