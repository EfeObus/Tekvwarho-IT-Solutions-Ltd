/**
 * Tekvwarho IT Solutions - Main JavaScript
 * Version: 1.0.0
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initMobileMenu();
    initHeaderScroll();
    initDropdownMenu();
    initFAQAccordion();
    initSmoothScroll();
    initFormValidation();
    initScrollAnimations();
});

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    const header = document.getElementById('header');
    
    if (!mobileMenuToggle || !navLinks) return;
    
    mobileMenuToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });
    
    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!header.contains(e.target) && navLinks.classList.contains('active')) {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
}

/**
 * Header Scroll Effect
 */
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    
    let lastScroll = 0;
    const scrollThreshold = 100;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class when scrolled past threshold
        if (currentScroll > scrollThreshold) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Hide/show header based on scroll direction
        if (currentScroll > lastScroll && currentScroll > 300) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScroll = currentScroll;
    });
}

/**
 * Dropdown Menu for Desktop
 */
function initDropdownMenu() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        const menu = dropdown.querySelector('.nav-dropdown-menu');
        
        if (!toggle || !menu) return;
        
        // Desktop hover behavior
        if (window.innerWidth > 768) {
            dropdown.addEventListener('mouseenter', function() {
                menu.classList.add('active');
            });
            
            dropdown.addEventListener('mouseleave', function() {
                menu.classList.remove('active');
            });
        }
        
        // Mobile click behavior
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                menu.classList.toggle('active');
                toggle.classList.toggle('active');
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const menus = document.querySelectorAll('.nav-dropdown-menu');
        if (window.innerWidth > 768) {
            menus.forEach(menu => menu.classList.remove('active'));
        }
    });
}

/**
 * FAQ Accordion
 */
function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (!question || !answer) return;
        
        question.addEventListener('click', function() {
            const isActive = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherAnswer) {
                        otherAnswer.style.maxHeight = null;
                    }
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
            
            if (!isActive) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = null;
            }
        });
    });
}

/**
 * Smooth Scroll for Anchor Links
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href === '') return;
            
            const target = document.querySelector(href);
            if (!target) return;
            
            e.preventDefault();
            
            const headerHeight = document.getElementById('header')?.offsetHeight || 80;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });
}

/**
 * Form Validation
 */
function initFormValidation() {
    const contactForm = document.getElementById('contactForm');
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (validateForm(this)) {
                // Show success message
                showFormMessage(this, 'success', 'Thank you for your message! We\'ll get back to you soon.');
                this.reset();
            }
        });
    }
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = this.querySelector('input[type="email"]');
            if (emailInput && validateEmail(emailInput.value)) {
                showFormMessage(this, 'success', 'Thank you for subscribing! We\'ll keep you updated.');
                this.reset();
            } else {
                showFormMessage(this, 'error', 'Please enter a valid email address.');
            }
        });
    }
}

/**
 * Validate Form
 */
function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('[required]');
    
    inputs.forEach(input => {
        removeError(input);
        
        if (!input.value.trim()) {
            showError(input, 'This field is required');
            isValid = false;
        } else if (input.type === 'email' && !validateEmail(input.value)) {
            showError(input, 'Please enter a valid email address');
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Validate Email
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Show Error Message
 */
function showError(input, message) {
    input.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem;';
    input.parentNode.appendChild(errorDiv);
}

/**
 * Remove Error Message
 */
function removeError(input) {
    input.classList.remove('error');
    const errorDiv = input.parentNode.querySelector('.form-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * Show Form Message
 */
function showFormMessage(form, type, message) {
    // Remove existing message
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `form-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        padding: 1rem;
        margin-top: 1rem;
        border-radius: 8px;
        text-align: center;
        font-weight: 500;
        ${type === 'success' 
            ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;' 
            : 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}
    `;
    
    form.appendChild(messageDiv);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

/**
 * Scroll Animations
 */
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.card, .service-card, .process-step, .value-card, .testimonial-card, .blog-card, .faq-item');
    
    if (!animatedElements.length) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Add CSS for animation
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Utility: Debounce Function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Throttle Function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
