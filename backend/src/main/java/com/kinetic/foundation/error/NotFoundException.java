package com.kinetic.foundation.error;

public class NotFoundException extends RuntimeException {

    public NotFoundException() {
        super("Resource was not found");
    }

    public NotFoundException(String message) {
        super(message);
    }
}
