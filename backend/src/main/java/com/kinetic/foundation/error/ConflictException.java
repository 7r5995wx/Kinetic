package com.kinetic.foundation.error;

public class ConflictException extends RuntimeException {

    private final String code;

    public ConflictException() {
        this("VERSION_CONFLICT", "The resource changed; refresh and retry");
    }

    public ConflictException(String message) {
        this("VERSION_CONFLICT", message);
    }

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
