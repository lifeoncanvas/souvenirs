package com.licht.souvenirs.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sends transactional email over SMTP when SMTP_HOST is configured;
 * otherwise logs the message so local development works without a mail server.
 * Inside a transaction, sending waits until it commits, so a rolled-back checkout never emails anyone.
 */
@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> sender;
    private final TaskExecutor executor;
    private final String smtpHost;
    private final String from;
    private final String adminNotify;
    private final boolean logBodies;

    public EmailService(ObjectProvider<JavaMailSender> sender,
                        @Qualifier("applicationTaskExecutor") TaskExecutor executor,
                        @Value("${spring.mail.host:}") String smtpHost,
                        @Value("${app.mail.from}") String from,
                        @Value("${app.mail.admin-notify:}") String adminNotify,
                        @Value("${app.mail.log-bodies:false}") boolean logBodies) {
        this.sender = sender;
        this.executor = executor;
        this.smtpHost = smtpHost;
        this.from = from;
        this.adminNotify = adminNotify;
        this.logBodies = logBodies;
        if (smtpHost == null || smtpHost.isBlank()) {
            log.warn("SMTP_HOST is not set: emails (including password resets) are logged, not sent.");
        }
    }

    public void send(String to, String subject, String body) {
        if (to == null || to.isBlank() || to.indexOf('\r') >= 0 || to.indexOf('\n') >= 0) {
            log.warn("Refusing to send email to an invalid address");
            return;
        }
        String safeSubject = headerSafe(subject);
        Runnable task = () -> deliver(to.trim(), safeSubject, body);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    executor.execute(task);
                }
            });
        } else {
            executor.execute(task);
        }
    }

    public void notifyAdmin(String subject, String body) {
        if (adminNotify != null && !adminNotify.isBlank()) send(adminNotify, subject, body);
        else log.info("[mail:admin] {}\n{}", headerSafe(subject), logBodies ? body : "(body hidden)");
    }

    /** Collapses line breaks and control characters so user-supplied text cannot add mail headers. */
    static String headerSafe(String s) {
        if (s == null) return "";
        String flat = s.replaceAll("[\\r\\n\\t\\x00-\\x1F\\x7F]+", " ").trim();
        return flat.length() > 200 ? flat.substring(0, 200) : flat;
    }

    private void deliver(String to, String subject, String body) {
        if (smtpHost == null || smtpHost.isBlank() || sender.getIfAvailable() == null) {
            if (logBodies) log.info("[mail:dev] to={} subject=\"{}\"\n{}", to, subject, body);
            else log.info("[mail:dev] to={} subject=\"{}\" (body hidden; set MAIL_LOG_BODIES=true to show)", to, subject);
            return;
        }
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(body);
            sender.getObject().send(m);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
