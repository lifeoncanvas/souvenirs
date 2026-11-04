package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "faqs")
public class Faq extends BaseEntity {
    @Column(nullable = false, length = 80) private String category;
    @Column(nullable = false, length = 300) private String question;
    @Column(nullable = false, length = 3000) private String answer;
    private int sortOrder;
    private boolean active = true;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
