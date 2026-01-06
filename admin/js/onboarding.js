/**
 * Onboarding & Empty States Module
 * Tekvwarho IT Solutions - Admin Dashboard
 * 
 * Provides first-time user guidance and helpful empty states
 */

const OnboardingManager = {
    // Onboarding steps configuration
    steps: [
        {
            id: 'welcome',
            title: 'Welcome to Tekvwarho Admin',
            description: 'Let\'s get you set up to manage your business effectively.',
            icon: '👋',
            action: null,
            completed: true // Always completed after first view
        },
        {
            id: 'profile',
            title: 'Complete Your Profile',
            description: 'Add your name and contact details for better communication.',
            icon: '👤',
            action: () => window.location.href = 'settings.html#profile',
            checkComplete: () => OnboardingManager.checkProfileComplete()
        },
        {
            id: 'business_hours',
            title: 'Set Business Hours',
            description: 'Configure when you\'re available for consultations.',
            icon: '🕐',
            action: () => window.location.href = 'settings.html#hours',
            checkComplete: () => OnboardingManager.checkBusinessHoursSet()
        },
        {
            id: 'email_templates',
            title: 'Customize Email Templates',
            description: 'Personalize the emails sent to your clients.',
            icon: '📧',
            action: () => window.location.href = 'settings.html#templates',
            checkComplete: () => OnboardingManager.checkTemplatesCustomized()
        },
        {
            id: 'first_staff',
            title: 'Add Team Member',
            description: 'Invite colleagues to help manage inquiries.',
            icon: '👥',
            action: () => window.location.href = 'staff.html?action=add',
            checkComplete: () => OnboardingManager.checkStaffAdded()
        },
        {
            id: 'test_chat',
            title: 'Test Live Chat',
            description: 'Preview how customers interact with your chat widget.',
            icon: '💬',
            action: () => window.open('../index.html#chat-test', '_blank'),
            checkComplete: () => OnboardingManager.checkChatTested()
        }
    ],

    // Storage key for onboarding progress
    STORAGE_KEY: 'tekvwarho_onboarding',

    /**
     * Initialize onboarding system
     */
    async init() {
        this.progress = this.loadProgress();
        
        // Check if first-time user
        if (!this.progress.started) {
            this.showWelcomeModal();
            this.progress.started = true;
            this.progress.startedAt = new Date().toISOString();
            this.saveProgress();
        }
        
        // Update step completion status
        await this.refreshStepStatus();
        
        // Add onboarding checklist to dashboard if not dismissed
        if (!this.progress.dismissed && this.getCompletionPercentage() < 100) {
            this.renderChecklistWidget();
        }
    },

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            return saved ? JSON.parse(saved) : {
                started: false,
                dismissed: false,
                completedSteps: [],
                startedAt: null,
                completedAt: null
            };
        } catch (e) {
            return { started: false, dismissed: false, completedSteps: [], startedAt: null, completedAt: null };
        }
    },

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.progress));
        } catch (e) {
            console.warn('Could not save onboarding progress:', e);
        }
    },

    /**
     * Show welcome modal for first-time users
     */
    showWelcomeModal() {
        const modal = document.createElement('div');
        modal.className = 'onboarding-modal-overlay';
        modal.innerHTML = `
            <div class="onboarding-modal">
                <div class="onboarding-modal-content">
                    <div class="onboarding-icon">👋</div>
                    <h2>Welcome to Tekvwarho Admin!</h2>
                    <p>We're excited to have you here. This dashboard helps you manage customer inquiries, consultations, and team communication all in one place.</p>
                    
                    <div class="onboarding-features">
                        <div class="onboarding-feature">
                            <span class="feature-icon">📬</span>
                            <div>
                                <strong>Messages</strong>
                                <span>Manage customer inquiries</span>
                            </div>
                        </div>
                        <div class="onboarding-feature">
                            <span class="feature-icon">💬</span>
                            <div>
                                <strong>Live Chat</strong>
                                <span>Real-time customer support</span>
                            </div>
                        </div>
                        <div class="onboarding-feature">
                            <span class="feature-icon">📅</span>
                            <div>
                                <strong>Consultations</strong>
                                <span>Schedule & manage bookings</span>
                            </div>
                        </div>
                        <div class="onboarding-feature">
                            <span class="feature-icon">📊</span>
                            <div>
                                <strong>Analytics</strong>
                                <span>Track your performance</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="onboarding-actions">
                        <button class="btn btn-primary btn-lg" id="start-tour-btn">
                            Get Started
                        </button>
                        <button class="btn btn-outline btn-sm" id="skip-tour-btn">
                            I'll explore on my own
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        // Event handlers
        modal.querySelector('#start-tour-btn').addEventListener('click', () => {
            this.closeModal(modal);
            this.startGuidedTour();
        });
        
        modal.querySelector('#skip-tour-btn').addEventListener('click', () => {
            this.closeModal(modal);
        });
    },

    /**
     * Close onboarding modal
     */
    closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    },

    /**
     * Start guided tour
     */
    startGuidedTour() {
        // Highlight key areas of the dashboard
        this.highlightElement('.admin-sidebar', 'Navigation', 'Use the sidebar to navigate between different sections of your admin dashboard.');
    },

    /**
     * Highlight an element with a tooltip
     */
    highlightElement(selector, title, description, callback) {
        const element = document.querySelector(selector);
        if (!element) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tour-tooltip';
        tooltip.innerHTML = `
            <div class="tour-tooltip-content">
                <h4>${title}</h4>
                <p>${description}</p>
                <button class="btn btn-primary btn-sm tour-next">Got it</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(tooltip);
        
        // Position tooltip near element
        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
        tooltip.style.left = `${rect.right + 20}px`;
        
        // Highlight element
        element.style.position = 'relative';
        element.style.zIndex = '10001';
        
        tooltip.querySelector('.tour-next').addEventListener('click', () => {
            overlay.remove();
            tooltip.remove();
            element.style.position = '';
            element.style.zIndex = '';
            if (callback) callback();
        });
    },

    /**
     * Refresh completion status for all steps
     */
    async refreshStepStatus() {
        for (const step of this.steps) {
            if (step.checkComplete && !this.progress.completedSteps.includes(step.id)) {
                try {
                    const isComplete = await step.checkComplete();
                    if (isComplete) {
                        this.markStepComplete(step.id);
                    }
                } catch (e) {
                    // Ignore errors in check functions
                }
            }
        }
    },

    /**
     * Mark a step as complete
     */
    markStepComplete(stepId) {
        if (!this.progress.completedSteps.includes(stepId)) {
            this.progress.completedSteps.push(stepId);
            this.saveProgress();
            
            // Check if all steps complete
            if (this.getCompletionPercentage() === 100) {
                this.progress.completedAt = new Date().toISOString();
                this.saveProgress();
                this.showCompletionCelebration();
            }
        }
    },

    /**
     * Get completion percentage
     */
    getCompletionPercentage() {
        const checkableSteps = this.steps.filter(s => s.checkComplete);
        if (checkableSteps.length === 0) return 100;
        
        const completed = checkableSteps.filter(s => 
            this.progress.completedSteps.includes(s.id)
        ).length;
        
        return Math.round((completed / checkableSteps.length) * 100);
    },

    /**
     * Render onboarding checklist widget
     */
    renderChecklistWidget() {
        const container = document.querySelector('.admin-content');
        if (!container) return;
        
        const widget = document.createElement('div');
        widget.className = 'onboarding-widget';
        widget.id = 'onboarding-widget';
        
        const percentage = this.getCompletionPercentage();
        
        widget.innerHTML = `
            <div class="onboarding-widget-header">
                <div class="onboarding-widget-title">
                    <span class="onboarding-icon-sm">🚀</span>
                    <div>
                        <h3>Getting Started</h3>
                        <span class="progress-text">${percentage}% complete</span>
                    </div>
                </div>
                <button class="onboarding-dismiss" title="Dismiss">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="onboarding-progress-bar">
                <div class="onboarding-progress-fill" style="width: ${percentage}%"></div>
            </div>
            <ul class="onboarding-checklist">
                ${this.steps.filter(s => s.checkComplete).map(step => `
                    <li class="onboarding-step ${this.progress.completedSteps.includes(step.id) ? 'completed' : ''}" data-step="${step.id}">
                        <span class="step-checkbox">
                            ${this.progress.completedSteps.includes(step.id) ? 
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 
                                ''
                            }
                        </span>
                        <div class="step-content">
                            <span class="step-title">${step.title}</span>
                            <span class="step-description">${step.description}</span>
                        </div>
                        ${!this.progress.completedSteps.includes(step.id) && step.action ? 
                            '<button class="btn btn-sm btn-outline step-action">Start</button>' : 
                            ''
                        }
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Insert at the top of content
        container.insertBefore(widget, container.firstChild);
        
        // Event handlers
        widget.querySelector('.onboarding-dismiss').addEventListener('click', () => {
            this.dismissChecklist();
        });
        
        widget.querySelectorAll('.step-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stepId = e.target.closest('.onboarding-step').dataset.step;
                const step = this.steps.find(s => s.id === stepId);
                if (step && step.action) step.action();
            });
        });
    },

    /**
     * Dismiss the checklist widget
     */
    dismissChecklist() {
        this.progress.dismissed = true;
        this.saveProgress();
        
        const widget = document.getElementById('onboarding-widget');
        if (widget) {
            widget.classList.add('dismissing');
            setTimeout(() => widget.remove(), 300);
        }
    },

    /**
     * Show completion celebration
     */
    showCompletionCelebration() {
        const toast = document.createElement('div');
        toast.className = 'celebration-toast';
        toast.innerHTML = `
            <span class="celebration-icon">🎉</span>
            <div class="celebration-content">
                <strong>Congratulations!</strong>
                <span>You've completed the setup. You're all ready to go!</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    // Check functions for each step
    async checkProfileComplete() {
        // Check if user has updated their profile
        try {
            const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
            return !!(user.name && user.name !== 'Admin');
        } catch {
            return false;
        }
    },

    async checkBusinessHoursSet() {
        // This would check the server for business hours configuration
        try {
            const settings = JSON.parse(localStorage.getItem('tekvwarho_settings') || '{}');
            return !!settings.businessHoursConfigured;
        } catch {
            return false;
        }
    },

    async checkTemplatesCustomized() {
        try {
            const settings = JSON.parse(localStorage.getItem('tekvwarho_settings') || '{}');
            return !!settings.templatesCustomized;
        } catch {
            return false;
        }
    },

    async checkStaffAdded() {
        // Check if there's more than one staff member
        try {
            const response = await fetch('/api/admin/staff/count', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            if (response.ok) {
                const data = await response.json();
                return data.count > 1;
            }
        } catch {
            // Fallback to localStorage
            const progress = JSON.parse(localStorage.getItem('tekvwarho_onboarding') || '{}');
            return progress.completedSteps?.includes('first_staff') || false;
        }
        return false;
    },

    async checkChatTested() {
        try {
            const settings = JSON.parse(localStorage.getItem('tekvwarho_settings') || '{}');
            return !!settings.chatTested;
        } catch {
            return false;
        }
    }
};

/**
 * Empty States Configuration
 */
const EmptyStates = {
    configs: {
        messages: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
            </svg>`,
            title: 'No messages yet',
            description: 'When customers reach out through your contact form, their messages will appear here.',
            primaryAction: {
                label: 'Copy Contact Page URL',
                action: () => EmptyStates.copyToClipboard(window.location.origin + '/contact.html')
            },
            secondaryAction: {
                label: 'View Contact Page',
                action: () => window.open('../contact.html', '_blank')
            }
        },
        chats: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>`,
            title: 'No chat conversations yet',
            description: 'Your live chat widget is active. When visitors start a chat, conversations will appear here.',
            primaryAction: {
                label: 'Preview Chat Widget',
                action: () => window.open('../index.html', '_blank')
            },
            tips: [
                'The chat widget appears on all pages of your website',
                'You\'ll receive a notification when a new chat starts',
                'Chat history is saved for 1 year'
            ]
        },
        consultations: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`,
            title: 'No consultations booked',
            description: 'Share your booking page to start receiving consultation requests from clients.',
            primaryAction: {
                label: 'Copy Booking Page URL',
                action: () => EmptyStates.copyToClipboard(window.location.origin + '/book.html')
            },
            secondaryAction: {
                label: 'View Booking Page',
                action: () => window.open('../book.html', '_blank')
            }
        },
        staff: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>`,
            title: 'You\'re the only team member',
            description: 'Add staff members to help manage customer inquiries and consultations.',
            primaryAction: {
                label: 'Add Staff Member',
                action: () => {
                    if (typeof AdminApp !== 'undefined' && AdminApp.showAddStaffModal) {
                        AdminApp.showAddStaffModal();
                    }
                }
            }
        },
        analytics: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>`,
            title: 'Analytics will appear here',
            description: 'Start collecting data by receiving messages, chats, and bookings. Analytics will update automatically.',
            tips: [
                'Data updates every hour',
                'Export reports in CSV or PDF format',
                'Track conversion rates and response times'
            ]
        },
        audit: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>`,
            title: 'No activity recorded yet',
            description: 'Audit logs track all administrative actions. Activity will be recorded as you use the dashboard.',
            tips: [
                'All login attempts are logged',
                'Data changes are tracked',
                'Logs are retained for 5 years'
            ]
        },
        search: {
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>`,
            title: 'No results found',
            description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
            primaryAction: {
                label: 'Clear Search',
                action: () => {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }
            }
        }
    },

    /**
     * Render an empty state
     */
    render(type, container) {
        const config = this.configs[type];
        if (!config) return;
        
        const element = document.createElement('div');
        element.className = 'empty-state';
        element.innerHTML = `
            <div class="empty-state-icon">${config.icon}</div>
            <h3 class="empty-state-title">${config.title}</h3>
            <p class="empty-state-description">${config.description}</p>
            ${config.tips ? `
                <div class="empty-state-tips">
                    <span class="tips-label">💡 Tips:</span>
                    <ul>
                        ${config.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            <div class="empty-state-actions">
                ${config.primaryAction ? `
                    <button class="btn btn-primary" id="empty-state-primary-action">
                        ${config.primaryAction.label}
                    </button>
                ` : ''}
                ${config.secondaryAction ? `
                    <button class="btn btn-outline" id="empty-state-secondary-action">
                        ${config.secondaryAction.label}
                    </button>
                ` : ''}
            </div>
        `;
        
        // Clear container and add empty state
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(element);
            
            // Bind action handlers
            if (config.primaryAction) {
                element.querySelector('#empty-state-primary-action')?.addEventListener('click', config.primaryAction.action);
            }
            if (config.secondaryAction) {
                element.querySelector('#empty-state-secondary-action')?.addEventListener('click', config.secondaryAction.action);
            }
        }
        
        return element;
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard!', 'success');
        } catch (e) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!', 'success');
        }
    },

    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Export for use in other modules
window.OnboardingManager = OnboardingManager;
window.EmptyStates = EmptyStates;
