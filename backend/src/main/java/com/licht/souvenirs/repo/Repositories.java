package com.licht.souvenirs.repo;

import com.licht.souvenirs.domain.*;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * All Spring Data repositories, grouped as nested interfaces
 * (enabled with {@code considerNestedRepositories = true}).
 */
public final class Repositories {
    private Repositories() {}

    public interface RoleRepository extends JpaRepository<Role, Long> {
        Optional<Role> findByName(String name);
    }

    public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmailIgnoreCase(String email);
        Optional<User> findByVerificationToken(String token);
        Optional<User> findByResetToken(String token);
        boolean existsByEmailIgnoreCase(String email);

        @Query("select u from User u where lower(u.email) like lower(concat('%', :q, '%')) "
                + "or lower(u.firstName) like lower(concat('%', :q, '%')) "
                + "or lower(coalesce(u.lastName, '')) like lower(concat('%', :q, '%'))")
        Page<User> search(String q, Pageable pageable);
    }

    public interface AddressRepository extends JpaRepository<Address, Long> {
        List<Address> findByUserIdOrderByDefaultAddressDescIdAsc(Long userId);
        Optional<Address> findByIdAndUserId(Long id, Long userId);
    }

    public interface CategoryRepository extends JpaRepository<Category, Long> {
        Optional<Category> findBySlug(String slug);
        List<Category> findAllByOrderBySortOrderAscNameAsc();
        boolean existsBySlug(String slug);
    }

    public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {
        @EntityGraph(attributePaths = {"images", "categories", "personalisation"})
        Optional<Product> findBySlug(String slug);
        boolean existsBySlug(String slug);
        long countByActiveTrue();
        List<Product> findTop8ByActiveTrueOrderBySoldCountDesc();

        @Query("select min(p.price) from Product p where p.active = true")
        BigDecimal minPrice();

        @Query("select max(p.price) from Product p where p.active = true")
        BigDecimal maxPrice();
    }

    public interface CartRepository extends JpaRepository<Cart, Long> {
        Optional<Cart> findByToken(String token);
        Optional<Cart> findByUserId(Long userId);

        @Query("select count(i) > 0 from CartItem i where i.personalisationJson like concat('%', :fragment, '%')")
        boolean anyItemMentions(String fragment);

        @Modifying
        @Query("delete from CartItem i where i.cart.id in (select c.id from Cart c where c.user is null and c.createdAt < :cutoff)")
        int deleteGuestItemsCreatedBefore(Instant cutoff);

        @Modifying
        @Query("delete from Cart c where c.user is null and c.createdAt < :cutoff")
        int deleteGuestCartsCreatedBefore(Instant cutoff);
    }

    public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
        Optional<Order> findByOrderNumber(String orderNumber);

        /** Row-locks the order so payment capture, webhooks and the expiry job cannot interleave. */
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select o from Order o where o.orderNumber = :orderNumber")
        Optional<Order> lockByOrderNumber(String orderNumber);

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select o from Order o where o.id = :id")
        Optional<Order> lockById(Long id);

        @Query("select o.id from Order o where o.status = com.licht.souvenirs.domain.Order.Status.PENDING "
                + "and o.paymentStatus <> com.licht.souvenirs.domain.Order.PaymentStatus.PAID "
                + "and o.expiresAt is not null and o.expiresAt < :now")
        List<Long> expiredUnpaidIds(Instant now);
        List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
        long countByStatus(Order.Status status);
        long countByStatusIn(List<Order.Status> statuses);

        @Query("select coalesce(sum(o.total), 0) from Order o where o.paymentStatus = com.licht.souvenirs.domain.Order.PaymentStatus.PAID")
        BigDecimal paidRevenue();

        @Query("select o.user.id, count(o) from Order o where o.user is not null group by o.user.id")
        List<Object[]> orderCountsByUser();
    }

    public interface EnquiryRepository extends JpaRepository<Enquiry, Long>, JpaSpecificationExecutor<Enquiry> {
        long countByStatus(Enquiry.Status status);
    }

    public interface TestimonialRepository extends JpaRepository<Testimonial, Long> {
        List<Testimonial> findByActiveTrueOrderBySortOrderAscIdAsc();
        List<Testimonial> findAllByOrderBySortOrderAscIdAsc();
    }

    public interface ReviewRepository extends JpaRepository<Review, Long> {
        List<Review> findByProductIdAndApprovedTrueOrderByCreatedAtDesc(Long productId);
        Optional<Review> findByProductIdAndUserId(Long productId, Long userId);
        List<Review> findAllByOrderByCreatedAtDesc();

        @Query("select avg(r.rating), count(r) from Review r where r.product.id = :productId and r.approved = true")
        List<Object[]> stats(Long productId);
    }

    public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {
        List<WishlistItem> findByUserIdOrderByCreatedAtDesc(Long userId);
        Optional<WishlistItem> findByUserIdAndProductId(Long userId, Long productId);
    }

    public interface NewsletterRepository extends JpaRepository<NewsletterSubscriber, Long> {
        Optional<NewsletterSubscriber> findByEmailIgnoreCase(String email);
    }

    public interface CouponRepository extends JpaRepository<Coupon, Long> {
        Optional<Coupon> findByCodeIgnoreCase(String code);
    }

    public interface SiteContentRepository extends JpaRepository<SiteContent, Long> {
        Optional<SiteContent> findByKey(String key);
    }

    public interface FaqRepository extends JpaRepository<Faq, Long> {
        List<Faq> findByActiveTrueOrderBySortOrderAscIdAsc();
        List<Faq> findAllByOrderBySortOrderAscIdAsc();
    }

    public interface PaymentRepository extends JpaRepository<Payment, Long> {
        Optional<Payment> findFirstByProviderAndProviderReference(String provider, String providerReference);
        Optional<Payment> findFirstByCaptureReference(String captureReference);
    }

    public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
        @Query("select count(i) > 0 from OrderItem i where i.personalisationJson like concat('%', :fragment, '%')")
        boolean anyItemMentions(String fragment);

        /** True when the user has a paid or dispatched order containing the product. */
        @Query("select count(i) > 0 from OrderItem i where i.order.user.id = :userId and i.product.id = :productId "
                + "and i.order.status <> com.licht.souvenirs.domain.Order.Status.CANCELLED "
                + "and (i.order.paymentStatus = com.licht.souvenirs.domain.Order.PaymentStatus.PAID "
                + "or i.order.status in (com.licht.souvenirs.domain.Order.Status.SHIPPED, com.licht.souvenirs.domain.Order.Status.DELIVERED))")
        boolean hasPurchased(Long userId, Long productId);

        @Query("select i.productName, sum(i.quantity), sum(i.unitPrice * i.quantity) from OrderItem i "
                + "where i.order.status <> com.licht.souvenirs.domain.Order.Status.CANCELLED "
                + "group by i.productName order by sum(i.quantity) desc")
        List<Object[]> bestsellers(Pageable pageable);
    }
}
