package com.sentinel.soc.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import javax.sql.DataSource;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Manages HikariCP connection pooling for JDBC connectivity to MySQL 8.0.
 */
public class DatabaseConfig {
    private static final Logger LOGGER = Logger.getLogger(DatabaseConfig.class.getName());
    private static HikariDataSource dataSource;

    static {
        initDataSource();
    }

    private static synchronized void initDataSource() {
        if (dataSource != null && !dataSource.isClosed()) {
            return;
        }

        Properties props = new Properties();
        try (InputStream in = DatabaseConfig.class.getResourceAsStream("/application.properties")) {
            if (in != null) {
                props.load(in);
            }
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Failed to read application.properties, using fallback defaults", e);
        }

        HikariConfig config = new HikariConfig();
        config.setDriverClassName(props.getProperty("db.driver", "com.mysql.cj.jdbc.Driver"));
        config.setJdbcUrl(props.getProperty("db.url", "jdbc:mysql://localhost:3306/sentinel_soc?useSSL=false&serverTimezone=UTC"));
        config.setUsername(props.getProperty("db.username", "soc_app_user"));
        config.setPassword(props.getProperty("db.password", "soc_secure_password_2026"));

        config.setMaximumPoolSize(Integer.parseInt(props.getProperty("db.pool.maximum-pool-size", "10")));
        config.setMinimumIdle(Integer.parseInt(props.getProperty("db.pool.minimum-idle", "2")));
        config.setIdleTimeout(Long.parseLong(props.getProperty("db.pool.idle-timeout-ms", "30000")));
        config.setConnectionTimeout(Long.parseLong(props.getProperty("db.pool.connection-timeout-ms", "20000")));
        config.setMaxLifetime(Long.parseLong(props.getProperty("db.pool.max-lifetime-ms", "1800000")));

        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");

        try {
            dataSource = new HikariDataSource(config);
            LOGGER.info("HikariCP connection pool initialized successfully.");
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Could not connect to MySQL 8 database yet: " + e.getMessage());
        }
    }

    public static DataSource getDataSource() {
        if (dataSource == null || dataSource.isClosed()) {
            initDataSource();
        }
        return dataSource;
    }

    public static Connection getConnection() throws SQLException {
        DataSource ds = getDataSource();
        if (ds == null) {
            throw new SQLException("HikariDataSource is not initialized. Ensure MySQL is running on port 3306.");
        }
        return ds.getConnection();
    }

    public static boolean isHealthy() {
        if (dataSource == null || dataSource.isClosed()) return false;
        try (Connection conn = dataSource.getConnection()) {
            return conn.isValid(2);
        } catch (Exception e) {
            return false;
        }
    }

    public static void shutdown() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
            LOGGER.info("Database connection pool closed.");
        }
    }
}
