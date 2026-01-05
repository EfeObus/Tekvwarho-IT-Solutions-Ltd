/**
 * Tekvwarho Visitor Tracking Script
 * Add this script to all public pages to track site visitors
 */

(function() {
    'use strict';

    const TRACKING_ENDPOINT = '/api/analytics/track';
    const VISITOR_ENDPOINT = '/api/analytics/visitor';
    const STORAGE_KEY = 'tekvwarho_visitor_id';

    // Get or create visitor ID
    function getVisitorId() {
        let visitorId = localStorage.getItem(STORAGE_KEY);
        return visitorId;
    }

    function setVisitorId(id) {
        localStorage.setItem(STORAGE_KEY, id);
    }

    // Track an event
    async function trackEvent(eventType, metadata = {}) {
        try {
            let visitorId = getVisitorId();

            const payload = {
                visitorId: visitorId,
                eventType: eventType,
                pageUrl: window.location.pathname,
                referrer: document.referrer || 'direct',
                metadata: {
                    ...metadata,
                    title: document.title,
                    screenWidth: window.innerWidth,
                    screenHeight: window.innerHeight,
                    timestamp: new Date().toISOString()
                }
            };

            const response = await fetch(TRACKING_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            // Store the visitor ID if we got a new one
            if (result.success && result.visitorId && !visitorId) {
                setVisitorId(result.visitorId);
            }

            return result;
        } catch (error) {
            console.debug('Tracking error:', error);
            return { success: false };
        }
    }

    // Track page view on load
    function trackPageView() {
        trackEvent('page_view');
    }

    // Track form submissions
    function trackFormSubmit(formType) {
        trackEvent('form_submit', { formType });
    }

    // Track chat start
    function trackChatStart() {
        trackEvent('chat_start');
    }

    // Track consultation booking
    function trackBooking(service) {
        trackEvent('booking', { service });
    }

    // Track scroll depth
    function trackScrollDepth() {
        let maxScroll = 0;
        let tracked25 = false;
        let tracked50 = false;
        let tracked75 = false;
        let tracked100 = false;

        window.addEventListener('scroll', function() {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollHeight > 0 ? Math.round((window.scrollY / scrollHeight) * 100) : 0;

            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;

                if (maxScroll >= 25 && !tracked25) {
                    tracked25 = true;
                    trackEvent('scroll_depth', { depth: 25 });
                }
                if (maxScroll >= 50 && !tracked50) {
                    tracked50 = true;
                    trackEvent('scroll_depth', { depth: 50 });
                }
                if (maxScroll >= 75 && !tracked75) {
                    tracked75 = true;
                    trackEvent('scroll_depth', { depth: 75 });
                }
                if (maxScroll >= 100 && !tracked100) {
                    tracked100 = true;
                    trackEvent('scroll_depth', { depth: 100 });
                }
            }
        });
    }

    // Track time on page
    function trackTimeOnPage() {
        let startTime = Date.now();
        
        window.addEventListener('beforeunload', function() {
            const timeSpent = Math.round((Date.now() - startTime) / 1000);
            
            // Send beacon for reliable tracking on page unload
            const payload = {
                visitorId: getVisitorId(),
                eventType: 'time_on_page',
                pageUrl: window.location.pathname,
                metadata: { seconds: timeSpent }
            };

            if (navigator.sendBeacon) {
                navigator.sendBeacon(TRACKING_ENDPOINT, JSON.stringify(payload));
            }
        });
    }

    // Track click events on important elements
    function trackClicks() {
        document.addEventListener('click', function(e) {
            const target = e.target.closest('a, button');
            if (!target) return;

            const isExternal = target.hostname && target.hostname !== window.location.hostname;
            const isCTA = target.classList.contains('btn-primary') || 
                          target.classList.contains('cta-btn') ||
                          target.id.includes('cta');

            if (isExternal || isCTA) {
                trackEvent('click', {
                    element: target.tagName.toLowerCase(),
                    text: target.textContent?.trim().substring(0, 50),
                    href: target.href || null,
                    isExternal,
                    isCTA
                });
            }
        });
    }

    // Initialize tracking
    function init() {
        // Track page view
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', trackPageView);
        } else {
            trackPageView();
        }

        // Set up scroll tracking
        trackScrollDepth();

        // Set up time on page tracking
        trackTimeOnPage();

        // Set up click tracking
        trackClicks();
    }

    // Expose tracking functions globally
    window.TekvwarhoTracker = {
        trackEvent,
        trackFormSubmit,
        trackChatStart,
        trackBooking
    };

    // Initialize
    init();

})();
