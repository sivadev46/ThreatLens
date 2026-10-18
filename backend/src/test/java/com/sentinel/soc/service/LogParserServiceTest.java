package com.sentinel.soc.service;

import com.sentinel.soc.model.LogEntry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class LogParserServiceTest {
    private LogParserService parser;

    @BeforeEach
    public void setup() {
        parser = new LogParserService();
    }

    @Test
    @DisplayName("Should successfully parse valid standard log line")
    public void testValidLogLine() {
        String line = "2026-03-14 10:15:32 | 192.168.1.50 | alice | LOGIN_SUCCESS | /login";
        LogParserService.ParseResult result = parser.parseLine(line, 1, "auth.log");

        assertTrue(result.isSuccess());
        assertNull(result.getError());

        LogEntry entry = result.getEntry();
        assertNotNull(entry);
        assertEquals("192.168.1.50", entry.getSourceIp());
        assertEquals("alice", entry.getUsername());
        assertEquals("LOGIN_SUCCESS", entry.getEventType());
        assertEquals("/login", entry.getEndpoint());
        assertEquals(200, entry.getStatusCode());
    }

    @Test
    @DisplayName("Should reject line with invalid IPv4 octet > 255")
    public void testInvalidIpv4Boundary() {
        String line = "2026-03-14 10:15:32 | 192.168.1.256 | alice | LOGIN_FAILED | /login";
        LogParserService.ParseResult result = parser.parseLine(line, 2, "auth.log");

        assertFalse(result.isSuccess());
        assertNotNull(result.getError());
        assertTrue(result.getError().contains("Invalid IPv4"));
    }

    @Test
    @DisplayName("Should reject malformed line with fewer than 5 pipe fields")
    public void testFewerThanFivePipes() {
        String line = "2026-03-14 10:15:32 | 10.0.0.1 | LOGIN_SUCCESS";
        LogParserService.ParseResult result = parser.parseLine(line, 3, "auth.log");

        assertFalse(result.isSuccess());
        assertNotNull(result.getError());
        assertTrue(result.getError().contains("Expected 5 pipe-delimited fields"));
    }
}
