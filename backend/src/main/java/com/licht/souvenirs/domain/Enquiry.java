package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "enquiries")
public class Enquiry extends BaseEntity {
    public enum Type { CORPORATE, BULK, CUSTOM, CONTACT }
    public enum Status { NEW, IN_PROGRESS, QUOTED, CONFIRMED, CLOSED }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.NEW;

    @Column(nullable = false, length = 120) private String fullName;
    @Column(nullable = false, length = 160) private String email;
    @Column(length = 40) private String phone;
    @Column(length = 160) private String companyName;
    @Column(length = 80) private String enquiryTopic;
    @Column(length = 80) private String eventType;
    private LocalDate eventDate;
    @Column(length = 1000) private String productRequirements;
    private Integer quantity;
    @Column(length = 60) private String budgetRange;
    @Column(length = 1000) private String personalisationRequirements;
    @Column(length = 3000) private String message;
    @Column(length = 6000) private String internalNotes;

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getEnquiryTopic() { return enquiryTopic; }
    public void setEnquiryTopic(String enquiryTopic) { this.enquiryTopic = enquiryTopic; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public String getProductRequirements() { return productRequirements; }
    public void setProductRequirements(String productRequirements) { this.productRequirements = productRequirements; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public String getBudgetRange() { return budgetRange; }
    public void setBudgetRange(String budgetRange) { this.budgetRange = budgetRange; }
    public String getPersonalisationRequirements() { return personalisationRequirements; }
    public void setPersonalisationRequirements(String v) { this.personalisationRequirements = v; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getInternalNotes() { return internalNotes; }
    public void setInternalNotes(String internalNotes) { this.internalNotes = internalNotes; }
}
