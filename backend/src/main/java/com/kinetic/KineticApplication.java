package com.kinetic;

import com.kinetic.foundation.config.KineticProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(KineticProperties.class)
public class KineticApplication {

    public static void main(String[] args) {
        SpringApplication.run(KineticApplication.class, args);
    }
}
