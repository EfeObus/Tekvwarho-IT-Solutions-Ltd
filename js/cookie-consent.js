/**
 * Tekvwarho IT Solutions - Cookie Consent Manager
 * Version: 1.0.0
 * 
 * GDPR and CCPA compliant cookie consent management
 * Handles user consent for different cookie categories
 */

(function() {
    'use strict';

    // Cookie consent configuration
    const CookieConsent = {
        // Cookie settings
        cookieName: 'tekvwarho_cookie_consent',
        cookieExpiry: 365, // days
        version: '1.0',

        // Cookie categories
        categories: {
            necessary: {
                name: 'Necessary',
                description: 'Essential cookies required for the website to function properly.',
                required: true,
                enabled: true
            },
            analytics: {
                name: 'Analytics',
                description: 'Help us understand how visitors interact with our website.',
                required: false,
                enabled: false
            },
            marketing: {
                name: 'Marketing',
                description: 'Used to deliver personalized advertisements.',
                required: false,
                enabled: false
            },
            functional: {
                name: 'Functional',
                description: 'Enable enhanced functionality and personalization.',
                required: false,
                enabled: false
            }
        },

        // Initialize cookie consent
        init: function() {
            // Check if consent already exists
            const existingConsent = this.getConsent();
            
            if (!existingConsent) {
                // Show cookie banner
                this.showBanner();
            } else {
                // Apply existing consent
                this.applyConsent(existingConsent);
            }

            // Listen for consent changes from settings page
            window.addEventListener('updateCookieConsent', (e) => {
                this.saveConsent(e.detail);
            });
        },

        // Create and show the cookie banner
        showBanner: function() {
            // Create banner element
            const banner = document.createElement('div');
            banner.id = 'cookie-consent-banner';
            banner.className = 'cookie-consent-banner';
            banner.setAttribute('role', 'dialog');
            banner.setAttribute('aria-labelledby', 'cookie-consent-title');
            banner.setAttribute('aria-describedby', 'cookie-consent-description');
            
            banner.innerHTML = `
                <div class="cookie-consent-content">
                    <div class="cookie-consent-text">
                        <h3 id="cookie-consent-title">
                            <i class="fas fa-cookie-bite"></i>
                            We Value Your Privacy
                        </h3>
                        <p id="cookie-consent-description">
                            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                            By clicking "Accept All", you consent to our use of cookies. 
                            <a href="cookie-policy.html" class="cookie-link">Learn more about our Cookie Policy</a>
                        </p>
                    </div>
                    <div class="cookie-consent-actions">
                        <button type="button" class="cookie-btn cookie-btn-settings" id="cookie-settings-btn">
                            <i class="fas fa-cog"></i>
                            Customize
                        </button>
                        <button type="button" class="cookie-btn cookie-btn-reject" id="cookie-reject-btn">
                            Reject All
                        </button>
                        <button type="button" class="cookie-btn cookie-btn-accept" id="cookie-accept-btn">
                            Accept All
                        </button>
                    </div>
                </div>
                
                <!-- Cookie Settings Modal -->
                <div class="cookie-settings-modal" id="cookie-settings-modal" style="display: none;">
                    <div class="cookie-settings-overlay"></div>
                    <div class="cookie-settings-content">
                        <div class="cookie-settings-header">
                            <h3>Cookie Preferences</h3>
                            <button type="button" class="cookie-settings-close" id="cookie-settings-close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="cookie-settings-body">
                            <p class="cookie-settings-intro">
                                Manage your cookie preferences below. You can enable or disable different types of cookies. 
                                Note that blocking some types of cookies may impact your experience on our website.
                            </p>
                            
                            <div class="cookie-category">
                                <div class="cookie-category-header">
                                    <div class="cookie-category-info">
                                        <h4>Necessary Cookies</h4>
                                        <p>These cookies are essential for the website to function and cannot be disabled.</p>
                                    </div>
                                    <div class="cookie-toggle">
                                        <input type="checkbox" id="cookie-necessary" checked disabled>
                                        <label for="cookie-necessary" class="cookie-toggle-label disabled">
                                            <span class="cookie-toggle-track">
                                                <span class="cookie-toggle-thumb"></span>
                                            </span>
                                            <span class="cookie-toggle-text">Always Active</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="cookie-category">
                                <div class="cookie-category-header">
                                    <div class="cookie-category-info">
                                        <h4>Analytics Cookies</h4>
                                        <p>Help us understand how visitors interact with our website by collecting and reporting information anonymously.</p>
                                    </div>
                                    <div class="cookie-toggle">
                                        <input type="checkbox" id="cookie-analytics">
                                        <label for="cookie-analytics" class="cookie-toggle-label">
                                            <span class="cookie-toggle-track">
                                                <span class="cookie-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="cookie-category">
                                <div class="cookie-category-header">
                                    <div class="cookie-category-info">
                                        <h4>Marketing Cookies</h4>
                                        <p>Used to track visitors across websites to display relevant advertisements.</p>
                                    </div>
                                    <div class="cookie-toggle">
                                        <input type="checkbox" id="cookie-marketing">
                                        <label for="cookie-marketing" class="cookie-toggle-label">
                                            <span class="cookie-toggle-track">
                                                <span class="cookie-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="cookie-category">
                                <div class="cookie-category-header">
                                    <div class="cookie-category-info">
                                        <h4>Functional Cookies</h4>
                                        <p>Enable enhanced functionality and personalization, such as remembering your preferences.</p>
                                    </div>
                                    <div class="cookie-toggle">
                                        <input type="checkbox" id="cookie-functional">
                                        <label for="cookie-functional" class="cookie-toggle-label">
                                            <span class="cookie-toggle-track">
                                                <span class="cookie-toggle-thumb"></span>
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="cookie-settings-footer">
                            <a href="cookie-policy.html" class="cookie-policy-link">
                                <i class="fas fa-external-link-alt"></i>
                                View Cookie Policy
                            </a>
                            <div class="cookie-settings-actions">
                                <button type="button" class="cookie-btn cookie-btn-reject" id="cookie-reject-all-btn">
                                    Reject All
                                </button>
                                <button type="button" class="cookie-btn cookie-btn-accept" id="cookie-save-preferences-btn">
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(banner);
            
            // Add animation class after a brief delay
            setTimeout(() => {
                banner.classList.add('show');
            }, 100);
            
            // Bind event listeners
            this.bindEvents(banner);
        },

        // Bind event listeners
        bindEvents: function(banner) {
            const self = this;
            
            // Accept All button
            const acceptBtn = document.getElementById('cookie-accept-btn');
            if (acceptBtn) {
                acceptBtn.addEventListener('click', function() {
                    self.acceptAll();
                });
            }
            
            // Reject All button
            const rejectBtn = document.getElementById('cookie-reject-btn');
            if (rejectBtn) {
                rejectBtn.addEventListener('click', function() {
                    self.rejectAll();
                });
            }
            
            // Settings button
            const settingsBtn = document.getElementById('cookie-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', function() {
                    self.showSettings();
                });
            }
            
            // Settings modal close
            const closeBtn = document.getElementById('cookie-settings-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    self.hideSettings();
                });
            }
            
            // Settings overlay click
            const overlay = banner.querySelector('.cookie-settings-overlay');
            if (overlay) {
                overlay.addEventListener('click', function() {
                    self.hideSettings();
                });
            }
            
            // Reject All in modal
            const rejectAllBtn = document.getElementById('cookie-reject-all-btn');
            if (rejectAllBtn) {
                rejectAllBtn.addEventListener('click', function() {
                    self.rejectAll();
                });
            }
            
            // Save Preferences button
            const saveBtn = document.getElementById('cookie-save-preferences-btn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() {
                    self.savePreferences();
                });
            }
            
            // Keyboard accessibility
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('cookie-settings-modal');
                    if (modal && modal.style.display !== 'none') {
                        self.hideSettings();
                    }
                }
            });
        },

        // Show settings modal
        showSettings: function() {
            const modal = document.getElementById('cookie-settings-modal');
            if (modal) {
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
                document.body.style.overflow = 'hidden';
            }
        },

        // Hide settings modal
        hideSettings: function() {
            const modal = document.getElementById('cookie-settings-modal');
            if (modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
                document.body.style.overflow = '';
            }
        },

        // Accept all cookies
        acceptAll: function() {
            const consent = {
                necessary: true,
                analytics: true,
                marketing: true,
                functional: true,
                timestamp: new Date().toISOString(),
                version: this.version
            };
            
            this.saveConsent(consent);
            this.hideBanner();
            this.showNotification('Cookie preferences saved. Thank you!', 'success');
        },

        // Reject all optional cookies
        rejectAll: function() {
            const consent = {
                necessary: true,
                analytics: false,
                marketing: false,
                functional: false,
                timestamp: new Date().toISOString(),
                version: this.version
            };
            
            this.saveConsent(consent);
            this.hideBanner();
            this.showNotification('Only essential cookies will be used.', 'info');
        },

        // Save preferences from settings modal
        savePreferences: function() {
            const consent = {
                necessary: true,
                analytics: document.getElementById('cookie-analytics')?.checked || false,
                marketing: document.getElementById('cookie-marketing')?.checked || false,
                functional: document.getElementById('cookie-functional')?.checked || false,
                timestamp: new Date().toISOString(),
                version: this.version
            };
            
            this.saveConsent(consent);
            this.hideSettings();
            this.hideBanner();
            this.showNotification('Your cookie preferences have been saved.', 'success');
        },

        // Save consent to cookie
        saveConsent: function(consent) {
            const expires = new Date();
            expires.setDate(expires.getDate() + this.cookieExpiry);
            
            document.cookie = `${this.cookieName}=${JSON.stringify(consent)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
            
            // Apply the consent
            this.applyConsent(consent);
            
            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('cookieConsentUpdated', {
                detail: consent
            }));
        },

        // Get existing consent from cookie
        getConsent: function() {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === this.cookieName) {
                    try {
                        return JSON.parse(value);
                    } catch (e) {
                        return null;
                    }
                }
            }
            return null;
        },

        // Apply consent (enable/disable tracking)
        applyConsent: function(consent) {
            // Analytics
            if (consent.analytics) {
                this.enableAnalytics();
            } else {
                this.disableAnalytics();
            }
            
            // Marketing
            if (consent.marketing) {
                this.enableMarketing();
            } else {
                this.disableMarketing();
            }
            
            // Functional
            if (consent.functional) {
                this.enableFunctional();
            } else {
                this.disableFunctional();
            }
        },

        // Analytics functions
        enableAnalytics: function() {
            // Enable Google Analytics, etc.
            if (window.gtag) {
                window.gtag('consent', 'update', {
                    'analytics_storage': 'granted'
                });
            }
            document.body.classList.add('analytics-enabled');
        },

        disableAnalytics: function() {
            if (window.gtag) {
                window.gtag('consent', 'update', {
                    'analytics_storage': 'denied'
                });
            }
            document.body.classList.remove('analytics-enabled');
        },

        // Marketing functions
        enableMarketing: function() {
            if (window.gtag) {
                window.gtag('consent', 'update', {
                    'ad_storage': 'granted',
                    'ad_user_data': 'granted',
                    'ad_personalization': 'granted'
                });
            }
            document.body.classList.add('marketing-enabled');
        },

        disableMarketing: function() {
            if (window.gtag) {
                window.gtag('consent', 'update', {
                    'ad_storage': 'denied',
                    'ad_user_data': 'denied',
                    'ad_personalization': 'denied'
                });
            }
            document.body.classList.remove('marketing-enabled');
        },

        // Functional functions
        enableFunctional: function() {
            document.body.classList.add('functional-enabled');
        },

        disableFunctional: function() {
            document.body.classList.remove('functional-enabled');
        },

        // Hide the banner
        hideBanner: function() {
            const banner = document.getElementById('cookie-consent-banner');
            if (banner) {
                banner.classList.remove('show');
                setTimeout(() => {
                    banner.remove();
                }, 300);
            }
        },

        // Show notification
        showNotification: function(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `cookie-notification cookie-notification-${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        },

        // Open cookie settings (for use from privacy policy page, etc.)
        openSettings: function() {
            const banner = document.getElementById('cookie-consent-banner');
            if (!banner) {
                this.showBanner();
                setTimeout(() => {
                    this.showSettings();
                }, 100);
            } else {
                this.showSettings();
            }
        },

        // Revoke consent
        revokeConsent: function() {
            // Delete the consent cookie
            document.cookie = `${this.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            
            // Show banner again
            this.showBanner();
            
            this.showNotification('Cookie preferences reset. Please select your preferences.', 'info');
        }
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CookieConsent.init());
    } else {
        CookieConsent.init();
    }

    // Expose to global scope for external access
    window.CookieConsent = CookieConsent;
})();
