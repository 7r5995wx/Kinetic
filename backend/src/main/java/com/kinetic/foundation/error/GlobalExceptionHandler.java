package com.kinetic.foundation.error;

import com.kinetic.identity.service.DuplicateEmailException;
import com.kinetic.identity.service.InvalidCredentialsException;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldError)
                .toList();
        return response(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_FAILED", "Request validation failed", fieldErrors, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException exception, HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = exception.getConstraintViolations().stream()
                .map(violation -> new ApiError.FieldError(violation.getPropertyPath().toString(), violation.getMessage()))
                .toList();
        return response(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_FAILED", "Request validation failed", fieldErrors, request);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ApiError> handleHandlerMethodValidation(HandlerMethodValidationException exception, HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = new ArrayList<>();
        for (ParameterValidationResult result : exception.getParameterValidationResults()) {
            String paramName = result.getMethodParameter().getParameterName();
            for (MessageSourceResolvable resolvable : result.getResolvableErrors()) {
                fieldErrors.add(new ApiError.FieldError(
                        paramName != null ? paramName : "parameter",
                        resolvable.getDefaultMessage()
                ));
            }
        }
        return response(HttpStatus.UNPROCESSABLE_CONTENT, "VALIDATION_FAILED", "Request validation failed", fieldErrors, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleMalformedJson(HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "MALFORMED_JSON", "Request body is invalid", List.of(), request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER", "Parameter '" + exception.getName() + "' is invalid", List.of(), request);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    ResponseEntity<ApiError> handleDuplicateEmail(HttpServletRequest request) {
        return response(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "An account already exists for this email", List.of(), request);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    ResponseEntity<ApiError> handleInvalidCredentials(HttpServletRequest request) {
        return response(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email or password is incorrect", List.of(), request);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> handleAuthenticationException(HttpServletRequest request) {
        return response(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication is required", List.of(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> handleAccessDenied(HttpServletRequest request) {
        return response(HttpStatus.FORBIDDEN, "FORBIDDEN", "You are not allowed to perform this action", List.of(), request);
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> handleNotFound(NotFoundException exception, HttpServletRequest request) {
        String message = exception.getMessage() != null && !exception.getMessage().isBlank()
                ? exception.getMessage()
                : "Resource was not found";
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", message, List.of(), request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> handleNoResourceFound(HttpServletRequest request) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", "Endpoint was not found", List.of(), request);
    }

    @ExceptionHandler({ConflictException.class, OptimisticLockingFailureException.class, OptimisticLockException.class})
    ResponseEntity<ApiError> handleConflict(Exception exception, HttpServletRequest request) {
        String code = "VERSION_CONFLICT";
        String message = "The resource changed; refresh and retry";
        if (exception instanceof ConflictException conflictException) {
            if (conflictException.getCode() != null) {
                code = conflictException.getCode();
            }
            if (conflictException.getMessage() != null) {
                message = conflictException.getMessage();
            }
        }
        return response(HttpStatus.CONFLICT, code, message, List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception, HttpServletRequest request) {
        String requestId = RequestIds.from(request);
        LOGGER.error("Unhandled request failure requestId={}", requestId, exception);
        ApiError error = ApiError.of(500, "INTERNAL_ERROR", "An unexpected error occurred", List.of(), requestId);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private ApiError.FieldError toFieldError(FieldError fieldError) {
        return new ApiError.FieldError(fieldError.getField(), fieldError.getDefaultMessage());
    }

    private ResponseEntity<ApiError> response(
            HttpStatus status,
            String code,
            String message,
            List<ApiError.FieldError> fieldErrors,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(status)
                .body(ApiError.of(status.value(), code, message, fieldErrors, RequestIds.from(request)));
    }
}
