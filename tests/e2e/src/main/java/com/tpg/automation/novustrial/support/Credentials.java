package com.tpg.automation.novustrial.support;

public final class Credentials {

    private Credentials() {
    }

    public static String username(String role) {
        return read(role, "USERNAME");
    }

    public static String password(String role) {
        return read(role, "PASSWORD");
    }

    public static String token(String role) {
        return read(role, "TOKEN");
    }

    private static String read(String role, String part) {
        String key = "AUT_" + role + "_" + part;
        String value = System.getProperty(key, System.getenv(key));
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(key + " is not set");
        }
        return value;
    }
}
