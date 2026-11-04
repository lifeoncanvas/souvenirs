package com.licht.souvenirs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaRepositories(considerNestedRepositories = true)
@EnableScheduling
public class LichtApplication {
    public static void main(String[] args) {
        // Lets Hibernate's proxy generator run on JDKs newer than it officially knows.
        System.setProperty("net.bytebuddy.experimental", "true");
        SpringApplication.run(LichtApplication.class, args);
    }
}
