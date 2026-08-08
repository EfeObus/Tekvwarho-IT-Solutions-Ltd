/**
 * Admin Dashboard JavaScript
 * Tekvwa IT Solutions Ltd
 * 
 * Security Features:
 * - JWT access tokens (15 min) + refresh tokens (7 days)
 * - Automatic token refresh before expiry
 * - Session management and forced logout
 */

const AdminApp = (function() {
    'use strict';

    // API Base URL
    const API_BASE = '/api';
    
    // Token refresh settings
    const TOKEN_REFRESH_THRESHOLD = 60 * 1000; // Refresh 1 minute before expiry
    let tokenRefreshTimer = null;
    let isRefreshing = false;
    let refreshSubscribers = [];
    
    // State
    let currentUser = null;
    let chatWs = null;
    let currentChatSession = null;

    // ========================================
    // Toast Notification System
    // ========================================

    const NotificationIcons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
    };

    const NotificationTitles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    /**
     * Create toast container if it doesn't exist
     */
    function getToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default 4000, 0 for persistent)
     */
    function showToast(message, type = 'info', duration = 4000) {
        const container = getToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${NotificationIcons[type] || NotificationIcons.info}
            </div>
            <div class="toast-content">
                <div class="toast-title">${NotificationTitles[type] || 'Notification'}</div>
                <div class="toast-message">${escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => removeToast(toast));
        
        container.appendChild(toast);
        
        if (duration > 0) {
            setTimeout(() => removeToast(toast), duration);
        }
        
        return toast;
    }

    /**
     * Remove a toast with animation
     */
    function removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }

    /**
     * Show a confirmation modal
     * @param {Object} options - Modal options
     * @returns {Promise<boolean>} - True if confirmed, false if cancelled
     */
    function showConfirmModal(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm',
                message = 'Are you sure?',
                type = 'warning',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                confirmClass = 'btn-primary'
            } = options;

            // Remove existing confirm modal
            const existing = document.getElementById('confirm-modal-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'confirm-modal-overlay';
            overlay.className = 'confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-modal-icon ${type}">
                        ${NotificationIcons[type] || NotificationIcons.info}
                    </div>
                    <div class="confirm-modal-title">${escapeHtml(title)}</div>
                    <div class="confirm-modal-message">${escapeHtml(message)}</div>
                    <div class="confirm-modal-actions">
                        <button class="btn btn-secondary" id="confirm-cancel">${escapeHtml(cancelText)}</button>
                        <button class="btn ${confirmClass}" id="confirm-ok">${escapeHtml(confirmText)}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Trigger reflow for animation
            overlay.offsetHeight;
            overlay.classList.add('active');

            const closeModal = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 200);
                resolve(result);
            };

            overlay.querySelector('#confirm-cancel').addEventListener('click', () => closeModal(false));
            overlay.querySelector('#confirm-ok').addEventListener('click', () => closeModal(true));
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal(false);
            });

            // Close on Escape
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    closeModal(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Show an alert modal (single button, just for info)
     * @param {string} message - Message to show
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {string} title - Optional title
     */
    function showAlert(message, type = 'info', title = null) {
        return new Promise((resolve) => {
            const existing = document.getElementById('confirm-modal-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'confirm-modal-overlay';
            overlay.className = 'confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-modal-icon ${type}">
                        ${NotificationIcons[type] || NotificationIcons.info}
                    </div>
                    <div class="confirm-modal-title">${escapeHtml(title || NotificationTitles[type])}</div>
                    <div class="confirm-modal-message">${escapeHtml(message)}</div>
                    <div class="confirm-modal-actions">
                        <button class="btn btn-primary" id="alert-ok">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            overlay.offsetHeight;
            overlay.classList.add('active');

            const closeModal = () => {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 200);
                resolve();
            };

            overlay.querySelector('#alert-ok').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });

            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    closeModal();
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Initialize the admin app
     * @returns {boolean} true if initialized, false if auth failed
     */
    function init() {
        // Check authentication
        if (!checkAuth()) {
            return false;
        }

        // Setup token refresh
        setupTokenRefresh();
        
        // Setup common event listeners
        setupEventListeners();
        
        // Load user info
        loadUserInfo();
        
        return true;
    }

    /**
     * Check authentication
     */
    function checkAuth() {
        const token = localStorage.getItem('adminToken');
        const user = localStorage.getItem('adminUser');
        
        if (!token || !user) {
            window.location.href = 'login.html';
            return false;
        }
        
        currentUser = JSON.parse(user);
        return true;
    }

    /**
     * Get auth headers
     */
    function getAuthHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Setup automatic token refresh
     */
    function setupTokenRefresh() {
        const expiresIn = parseInt(localStorage.getItem('tokenExpiresIn') || '900', 10);
        const refreshTime = (expiresIn * 1000) - TOKEN_REFRESH_THRESHOLD;
        
        if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer);
        }
        
        tokenRefreshTimer = setTimeout(async () => {
            await refreshAccessToken();
        }, Math.max(refreshTime, 60000)); // Minimum 1 minute
    }

    /**
     * Refresh access token using refresh token
     */
    async function refreshAccessToken() {
        if (isRefreshing) {
            return new Promise((resolve) => {
                refreshSubscribers.push(resolve);
            });
        }
        
        isRefreshing = true;
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            handleAuthFailure();
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Store new tokens
                localStorage.setItem('adminToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('tokenExpiresIn', '900'); // 15 minutes
                
                // Notify subscribers
                refreshSubscribers.forEach(callback => callback(data.accessToken));
                refreshSubscribers = [];
                
                // Setup next refresh
                setupTokenRefresh();
                
                console.log('Token refreshed successfully');
                return data.accessToken;
            } else {
                throw new Error(data.error?.message || 'Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            handleAuthFailure();
        } finally {
            isRefreshing = false;
        }
    }

    /**
     * Handle authentication failure
     */
    function handleAuthFailure() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('tokenExpiresIn');
        if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
        if (chatWs) chatWs.close();
        window.location.href = 'login.html?session=expired';
    }

    /**
     * API request helper with auto-refresh
     */
    async function apiRequest(endpoint, options = {}) {
        try {
            let response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    ...getAuthHeaders(),
                    ...options.headers
                }
            });

            // If token expired, try to refresh and retry
            if (response.status === 401) {
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.error?.code === 'TOKEN_EXPIRED') {
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        // Retry the request with new token
                        response = await fetch(`${API_BASE}${endpoint}`, {
                            ...options,
                            headers: {
                                'Authorization': `Bearer ${newToken}`,
                                'Content-Type': 'application/json',
                                ...options.headers
                            }
                        });
                    } else {
                        handleAuthFailure();
                        return null;
                    }
                } else {
                    handleAuthFailure();
                    return null;
                }
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Setup common event listeners
     */
    function setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }

        // Modal close handlers
        document.querySelectorAll('.modal-close, #close-modal-btn').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });
        
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModals();
                }
            });
        });
    }

    /**
     * Load user info into header
     */
    function loadUserInfo() {
        if (!currentUser) return;
        
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        const role = document.getElementById('user-role');
        
        if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();
        if (name) name.textContent = currentUser.name;
        if (role) role.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    }

    /**
     * Logout
     */
    async function logout() {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Call logout API to revoke tokens
        if (refreshToken) {
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                console.error('Logout API error:', error);
            }
        }
        
        // Clear local storage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('tokenExpiresIn');
        
        // Clear timers
        if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
        if (chatWs) chatWs.close();
        
        window.location.href = 'login.html';
    }

    /**
     * Close all modals
     */
    function closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    /**
     * Show notification toast
     */
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification-toast').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    /**
     * Format date
     */
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format time
     */
    function formatTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format relative time
     */
    function formatRelativeTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return formatDate(dateStr);
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get status badge HTML
     */
    function getStatusBadge(status) {
        const statusClass = status.replace('_', '-');
        const label = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `<span class="status-badge ${statusClass}">${label}</span>`;
    }

    // ========================================
    // Dashboard Functions
    // ========================================

    async function loadDashboardStats() {
        const response = await apiRequest('/admin/dashboard');
        
        if (!response || !response.success) {
            console.error('Failed to load dashboard stats');
            return;
        }
        
        // Handle both response formats (data.stats or data.data.stats)
        const data = response.data || response;
        const stats = data.stats || {};
        
        // Update stats
        const statMessages = document.getElementById('stat-messages');
        const statNewMessages = document.getElementById('stat-new-messages');
        const statChats = document.getElementById('stat-chats');
        const statWaitingChats = document.getElementById('stat-waiting-chats');
        const statConsultations = document.getElementById('stat-consultations');
        const statTodayConsultations = document.getElementById('stat-today-consultations');
        const statLeads = document.getElementById('stat-leads');
        const statConvertedLeads = document.getElementById('stat-converted-leads');
        
        if (statMessages) statMessages.textContent = stats.totalMessages || 0;
        if (statNewMessages) statNewMessages.textContent = `${stats.newMessages || 0} new today`;
        if (statChats) statChats.textContent = stats.activeChats || 0;
        if (statWaitingChats) statWaitingChats.textContent = `${stats.unreadChats || stats.waitingChats || 0} waiting`;
        if (statConsultations) statConsultations.textContent = stats.totalConsultations || stats.upcomingConsultations || 0;
        if (statTodayConsultations) statTodayConsultations.textContent = `${stats.pendingConsultations || stats.todayConsultations || 0} pending`;
        if (statLeads) statLeads.textContent = stats.totalVisitors || stats.totalLeads || 0;
        if (statConvertedLeads) statConvertedLeads.textContent = `${stats.convertedLeads || 0} converted`;
        
        // Load recent messages
        loadRecentMessages(data.recentMessages || []);
        
        // Load upcoming consultations
        loadUpcomingConsultations(data.upcomingConsultations || []);
    }

    function loadRecentMessages(messages) {
        const container = document.getElementById('recent-messages');
        if (!container) return;
        
        if (!messages.length) {
            container.innerHTML = '<div class="empty-state"><p>No recent messages</p></div>';
            return;
        }
        
        container.innerHTML = messages.slice(0, 5).map(msg => `
            <div class="message-item ${msg.status === 'new' ? 'unread' : ''}" data-id="${msg.id}">
                <div class="message-avatar">${msg.name.charAt(0).toUpperCase()}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${escapeHtml(msg.name)}</span>
                        <span class="message-time">${formatRelativeTime(msg.created_at)}</span>
                    </div>
                    <div class="message-preview">${escapeHtml(msg.message.substring(0, 60))}...</div>
                    <div class="message-meta">
                        ${getStatusBadge(msg.status)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    function loadUpcomingConsultations(consultations) {
        const tbody = document.querySelector('#upcoming-consultations tbody');
        if (!tbody) return;
        
        if (!consultations.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted" style="padding: 40px;">
                        No upcoming consultations
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = consultations.slice(0, 5).map(c => `
            <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${formatDate(c.booking_date)}</td>
                <td>${c.booking_time}</td>
                <td>${getStatusBadge(c.status)}</td>
            </tr>
        `).join('');
    }

    // ========================================
    // Messages Functions
    // ========================================

    let messagesPage = 1;
    let messagesFilters = {};

    async function loadMessages() {
        const params = new URLSearchParams({
            page: messagesPage,
            limit: 20,
            ...messagesFilters
        });
        
        // Try the admin messages endpoint first (with auth), fallback to contact endpoint
        let data = await apiRequest(`/admin/messages?${params}`);
        
        // If that fails (no auth), try the public contact endpoint
        if (!data || !data.success) {
            data = await apiRequest(`/contact?${params}`);
            // Normalize the response format
            if (data && data.success && data.data) {
                data.messages = data.data;
                data.pagination = {
                    page: messagesPage,
                    limit: 20,
                    total: data.data.length,
                    totalPages: 1
                };
            }
        } else {
            // Normalize the response from admin/messages endpoint
            data.messages = data.data;
        }
        
        if (!data || !data.success) {
            console.error('Failed to load messages');
            const tbody = document.getElementById('messages-tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted" style="padding: 60px;">
                            Failed to load messages. Please try again.
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        renderMessages(data.messages || []);
        renderPagination(data.pagination);
        
        // Setup filter listeners
        setupMessageFilters();
    }

    function renderMessages(messages) {
        const tbody = document.getElementById('messages-tbody');
        if (!tbody) return;
        
        if (!messages.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted" style="padding: 60px;">
                        No messages found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = messages.map(msg => `
            <tr>
                <td><strong>${escapeHtml(msg.name)}</strong></td>
                <td>${escapeHtml(msg.email)}</td>
                <td>${msg.service || 'General'}</td>
                <td>${getStatusBadge(msg.status)}</td>
                <td>${formatDate(msg.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-outline" onclick="AdminApp.viewMessage('${msg.id}')" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="btn btn-icon btn-outline" onclick="AdminApp.updateMessageStatus('${msg.id}', 'archived')" title="Archive">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                <rect x="1" y="3" width="22" height="5"></rect>
                                <line x1="10" y1="12" x2="14" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!container || !pagination) return;
        
        const { page, totalPages } = pagination;
        let html = '';
        
        // Previous button
        html += `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="AdminApp.goToPage(${page - 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                html += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="AdminApp.goToPage(${i})">${i}</button>`;
            } else if (i === page - 2 || i === page + 2) {
                html += '<span style="padding: 0 8px;">...</span>';
            }
        }
        
        // Next button
        html += `<button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="AdminApp.goToPage(${page + 1})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>`;
        
        container.innerHTML = html;
    }

    function goToPage(page) {
        messagesPage = page;
        loadMessages();
    }

    function setupMessageFilters() {
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('filter-status');
        const serviceFilter = document.getElementById('filter-service');
        
        let searchTimeout;
        
        if (searchInput && !searchInput._hasListener) {
            searchInput._hasListener = true;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    messagesFilters.search = e.target.value;
                    messagesPage = 1;
                    loadMessages();
                }, 300);
            });
        }
        
        if (statusFilter && !statusFilter._hasListener) {
            statusFilter._hasListener = true;
            statusFilter.addEventListener('change', (e) => {
                messagesFilters.status = e.target.value;
                messagesPage = 1;
                loadMessages();
            });
        }
        
        if (serviceFilter && !serviceFilter._hasListener) {
            serviceFilter._hasListener = true;
            serviceFilter.addEventListener('change', (e) => {
                messagesFilters.service = e.target.value;
                messagesPage = 1;
                loadMessages();
            });
        }
    }

    async function viewMessage(id) {
        const data = await apiRequest(`/contact/${id}`);
        
        if (!data || !data.success || !data.data) {
            showToast('Failed to load message', 'error');
            return;
        }
        
        const msg = data.data;
        const modal = document.getElementById('message-modal');
        const detail = document.getElementById('message-detail');
        
        detail.innerHTML = `
            <div class="form-group">
                <label>From</label>
                <p><strong>${escapeHtml(msg.name)}</strong> (${escapeHtml(msg.email)})</p>
            </div>
            ${msg.company ? `
            <div class="form-group">
                <label>Company</label>
                <p>${escapeHtml(msg.company)}</p>
            </div>
            ` : ''}
            <div class="form-group">
                <label>Service</label>
                <p>${msg.service || 'General Inquiry'}</p>
            </div>
            <div class="form-group">
                <label>Status</label>
                <div class="d-flex gap-2 align-items-center">
                    ${getStatusBadge(msg.status)}
                    <select id="message-status" class="form-control" style="width: auto; margin-left: 10px;">
                        <option value="new" ${msg.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="in_progress" ${msg.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="converted" ${msg.status === 'converted' ? 'selected' : ''}>Converted</option>
                        <option value="archived" ${msg.status === 'archived' ? 'selected' : ''}>Archived</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Message</label>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    ${escapeHtml(msg.message)}
                </div>
            </div>
            <div class="form-group">
                <label>Reply</label>
                <textarea id="reply-content" class="form-control" rows="4" placeholder="Type your reply..."></textarea>
            </div>
        `;
        
        // Status change handler
        const statusSelect = document.getElementById('message-status');
        statusSelect.addEventListener('change', async (e) => {
            await updateMessageStatus(id, e.target.value);
        });
        
        // Reply button handler
        const replyBtn = document.getElementById('reply-btn');
        if (!replyBtn) {
            console.error('Reply button not found');
            return;
        }
        
        // Remove any existing handlers by cloning
        const newReplyBtn = replyBtn.cloneNode(true);
        replyBtn.parentNode.replaceChild(newReplyBtn, replyBtn);
        
        newReplyBtn.addEventListener('click', async () => {
            const content = document.getElementById('reply-content').value;
            if (!content.trim()) {
                showToast('Please enter a reply', 'warning');
                return;
            }
            
            const result = await apiRequest(`/contact/${id}/reply`, {
                method: 'POST',
                body: JSON.stringify({ 
                    content,
                    staffId: currentUser.id,
                    sendEmail: true
                })
            });
            
            if (result && result.success) {
                if (result.emailSent) {
                    showToast('Reply sent successfully! Email delivered to the visitor.', 'success');
                } else if (result.emailError) {
                    showToast(`Reply saved but email failed: ${result.emailError}`, 'warning');
                } else {
                    showToast('Reply saved successfully.', 'success');
                }
                closeModals();
                loadMessages();
            } else {
                showToast(result?.message || 'Failed to send reply', 'error');
            }
        });
        
        modal.classList.add('active');
    }

    async function updateMessageStatus(id, status) {
        const result = await apiRequest(`/contact/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        
        if (result && result.success) {
            showToast('Status updated', 'success');
            loadMessages();
        } else {
            showToast(result?.message || 'Failed to update status', 'error');
        }
    }

    // ========================================
    // Chat Functions
    // ========================================

    function initChatPage() {
        connectChatWebSocket();
        loadChatSessions();
        setupChatEventListeners();
    }

    function connectChatWebSocket() {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat?type=admin`;
        
        chatWs = new WebSocket(wsUrl);
        
        chatWs.onopen = () => {
            console.log('Admin chat connected');
            
            // Authenticate with the verified access token (server derives identity from it)
            const wsAuthToken = localStorage.getItem('adminToken');
            if (wsAuthToken) {
                chatWs.send(JSON.stringify({
                    type: 'authenticate',
                    token: wsAuthToken
                }));
            }
            
            chatWs.send(JSON.stringify({ type: 'get_sessions' }));
        };
        
        chatWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleChatMessage(data);
            } catch (error) {
                console.error('Chat message error:', error);
            }
        };
        
        chatWs.onclose = () => {
            console.log('Chat disconnected, reconnecting...');
            setTimeout(connectChatWebSocket, 3000);
        };
    }

    function handleChatMessage(data) {
        switch (data.type) {
            case 'authenticated':
                console.log('Chat WebSocket authenticated');
                break;
                
            case 'sessions_list':
                renderChatSessions(data.sessions);
                break;
                
            case 'new_session':
                addNewSession(data.session);
                break;
                
            case 'chat_assigned':
                // A new chat has been auto-assigned
                addNewSession(data.session);
                showChatNotification(`New chat assigned: ${data.session?.visitor?.name || 'New visitor'}`, 'success');
                break;
            
            case 'admin_chat_notification':
                // Admin-specific notification for record keeping
                showChatNotification(data.message, 'info');
                // Also add to session list if not already there
                if (data.session) {
                    addNewSession(data.session);
                }
                // Play notification sound if available
                try {
                    const audio = new Audio('/admin/sounds/notification.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(() => {}); // Ignore if audio fails
                } catch(e) {}
                break;
                
            case 'session_joined':
                renderChatMessages(data.messages, data.assignedTo);
                break;
                
            case 'session_locked':
                showChatNotification(data.message, 'warning');
                // Clear selection if trying to join locked session
                currentChatSession = null;
                document.getElementById('chat-input-area').style.display = 'none';
                document.getElementById('close-chat-btn').style.display = 'none';
                break;
                
            case 'session_claimed':
                updateSessionClaimed(data.sessionId, data.staffName);
                break;
                
            case 'session_transferred':
                showChatNotification(`Chat transferred from ${data.fromStaffName} to ${data.toStaffName}`, 'info');
                if (data.toStaffId === currentUser?.id) {
                    showChatNotification('A chat was transferred to you!', 'info');
                }
                loadChatSessions();
                break;
                
            case 'session_released':
                showChatNotification(`${data.staffName} released a chat`, 'info');
                loadChatSessions();
                break;
                
            case 'transfer_success':
                showChatNotification(data.message, 'info');
                currentChatSession = null;
                document.getElementById('chat-input-area').style.display = 'none';
                loadChatSessions();
                break;
                
            case 'release_success':
                showChatNotification(data.message, 'info');
                currentChatSession = null;
                document.getElementById('chat-input-area').style.display = 'none';
                loadChatSessions();
                break;
                
            case 'new_message':
                if (data.sessionId === currentChatSession) {
                    appendChatMessage(data.message);
                }
                updateSessionPreview(data.sessionId, data.preview);
                break;
                
            case 'message_sent':
                appendChatMessage(data.message);
                break;
                
            case 'typing':
                showTypingIndicator(data.sessionId);
                break;
                
            case 'session_closed':
            case 'visitor_disconnected':
                updateSessionStatus(data.sessionId, 'disconnected');
                break;
                
            case 'info':
                showChatNotification(data.message, 'info');
                break;
                
            case 'warning':
                showChatNotification(data.message, 'warning');
                break;
                
            case 'error':
                showChatNotification(data.message, 'warning');
                break;
        }
    }
    
    function updateSessionClaimed(sessionId, staffName) {
        const sessionItem = document.querySelector(`[data-session="${sessionId}"]`);
        if (sessionItem) {
            let badge = sessionItem.querySelector('.claimed-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'claimed-badge';
                badge.style.cssText = 'font-size: 10px; background: #2c3e50; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;';
                const header = sessionItem.querySelector('.message-header');
                if (header) header.appendChild(badge);
            }
            badge.textContent = staffName;
        }
    }

    function showChatNotification(message, type) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const bgColor = type === 'info' ? '#e3f2fd' : '#fff3cd';
        const textColor = type === 'info' ? '#1976d2' : '#856404';
        
        const html = `
            <div class="chat-notification" style="background: ${bgColor}; color: ${textColor}; padding: 10px 15px; border-radius: 8px; margin: 10px 0; text-align: center; font-size: 13px;">
                <i class="fas fa-${type === 'info' ? 'info-circle' : 'exclamation-triangle'}"></i>
                ${escapeHtml(message)}
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    }

    async function loadChatSessions() {
        // Only load active sessions to match dashboard count
        const data = await apiRequest('/chat/sessions?status=active');
        
        if (data && data.success) {
            renderChatSessions(data.sessions);
            // Update the sidebar badge as well
            const chatsBadge = document.getElementById('chats-badge');
            if (chatsBadge) {
                chatsBadge.textContent = data.sessions?.length || 0;
            }
        }
    }

    function renderChatSessions(sessions) {
        const container = document.getElementById('chat-sessions');
        if (!container) return;
        
        if (!sessions || !sessions.length) {
            container.innerHTML = '<div class="empty-state"><p>No active chats</p></div>';
            return;
        }
        
        container.innerHTML = sessions.map(session => {
            const staffName = session.assigned_to_name || session.staff_name;
            const assignedBadge = session.assigned_to 
                ? `<span class="claimed-badge" style="font-size: 10px; background: #2c3e50; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">
                    ${escapeHtml(staffName || 'Assigned')}
                   </span>` 
                : '';
            
            return `
                <div class="message-item ${session.unread_count > 0 ? 'unread' : ''}" 
                     data-session="${session.id}"
                     onclick="AdminApp.selectChatSession('${session.id}')">
                    <div class="message-avatar">${(session.visitor_name || 'V').charAt(0).toUpperCase()}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-sender">${escapeHtml(session.visitor_name || 'Visitor')}</span>
                            ${assignedBadge}
                            <span class="message-time">${formatRelativeTime(session.created_at)}</span>
                        </div>
                        <div class="message-preview">${session.visitor_email || ''}</div>
                        <div class="message-meta">
                            ${getStatusBadge(session.status)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function addNewSession(session) {
        const container = document.getElementById('chat-sessions');
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            container.innerHTML = '';
        }
        
        const html = `
            <div class="message-item unread" 
                 data-session="${session.id}"
                 onclick="AdminApp.selectChatSession('${session.id}')">
                <div class="message-avatar">${session.visitor.name.charAt(0).toUpperCase()}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${escapeHtml(session.visitor.name)}</span>
                        <span class="message-time">Just now</span>
                    </div>
                    <div class="message-preview">${escapeHtml(session.visitor.email)}</div>
                    <div class="message-meta">
                        ${getStatusBadge('active')}
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('afterbegin', html);
    }

    function selectChatSession(sessionId) {
        currentChatSession = sessionId;
        
        // Update UI
        document.querySelectorAll('#chat-sessions .message-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.session === sessionId) {
                item.classList.add('active');
                item.classList.remove('unread');
            }
        });
        
        // Join session via WebSocket
        if (chatWs && chatWs.readyState === WebSocket.OPEN) {
            chatWs.send(JSON.stringify({
                type: 'join_session',
                sessionId
            }));
        }
        
        // Show action buttons
        document.getElementById('chat-input-area').style.display = 'flex';
        document.getElementById('close-chat-btn').style.display = 'block';
        document.getElementById('transfer-chat-btn').style.display = 'inline-block';
        document.getElementById('release-chat-btn').style.display = 'inline-block';
    }
    
    async function showTransferModal() {
        if (!currentChatSession) return;
        
        // Get available staff
        const data = await apiRequest('/admin/staff');
        if (!data || !data.success) {
            showToast('Failed to load staff list', 'error');
            return;
        }
        
        // Filter out current user - API returns data.data, not data.staff
        const availableStaff = (data.data || []).filter(s => s.id !== currentUser?.id);
        
        if (!availableStaff.length) {
            showToast('No other staff available for transfer', 'warning');
            return;
        }
        
        const staffOptions = availableStaff.map(s => 
            `<option value="${s.id}" data-name="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${s.role})</option>`
        ).join('');
        
        const modal = document.createElement('div');
        modal.id = 'transfer-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; width: 100%;">
                <h3 style="margin-bottom: 16px;">Transfer Chat</h3>
                <select id="transfer-staff-select" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 16px;">
                    ${staffOptions}
                </select>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="document.getElementById('transfer-modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="AdminApp.executeTransfer()">Transfer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    function executeTransfer() {
        const select = document.getElementById('transfer-staff-select');
        const staffId = parseInt(select.value);
        const staffName = select.options[select.selectedIndex].dataset.name;
        
        if (chatWs && chatWs.readyState === WebSocket.OPEN && currentChatSession) {
            chatWs.send(JSON.stringify({
                type: 'transfer_session',
                sessionId: currentChatSession,
                toStaffId: staffId,
                toStaffName: staffName
            }));
        }
        
        document.getElementById('transfer-modal').remove();
    }
    
    async function releaseChat() {
        if (!currentChatSession) return;
        
        const confirmed = await showConfirmModal({
            title: 'Release Chat',
            message: 'Are you sure you want to release this chat? It will become available for other staff.',
            type: 'warning',
            confirmText: 'Release',
            cancelText: 'Cancel'
        });
        
        if (confirmed) {
            if (chatWs && chatWs.readyState === WebSocket.OPEN) {
                chatWs.send(JSON.stringify({
                    type: 'release_session',
                    sessionId: currentChatSession
                }));
            }
        }
    }

    function renderChatMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        if (!messages || !messages.length) {
            container.innerHTML = '<div class="empty-state"><p>No messages yet</p></div>';
            return;
        }
        
        container.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.sender_type === 'staff' ? 'outgoing' : 'incoming'}">
                <div class="chat-bubble">
                    ${escapeHtml(msg.content)}
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
                        ${formatTime(msg.created_at)}
                    </div>
                </div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    function appendChatMessage(message) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) {
            container.innerHTML = '';
        }
        
        const html = `
            <div class="chat-message ${message.sender_type === 'staff' ? 'outgoing' : 'incoming'}">
                <div class="chat-bubble">
                    ${escapeHtml(message.content)}
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 4px;">
                        ${formatTime(message.created_at)}
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    }

    function setupChatEventListeners() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-chat-btn');
        const closeBtn = document.getElementById('close-chat-btn');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', sendChatMessage);
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendChatMessage();
                }
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeChatSession);
        }
    }

    function sendChatMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        
        if (!content || !currentChatSession || !chatWs) return;
        
        chatWs.send(JSON.stringify({
            type: 'send_message',
            sessionId: currentChatSession,
            content
        }));
        
        input.value = '';
    }

    async function closeChatSession() {
        if (!currentChatSession || !chatWs) return;
        
        const confirmed = await showConfirmModal({
            title: 'Close Chat',
            message: 'Are you sure you want to close this chat session?',
            type: 'warning',
            confirmText: 'Close Chat',
            cancelText: 'Cancel'
        });
        
        if (confirmed) {
            chatWs.send(JSON.stringify({
                type: 'close_session',
                sessionId: currentChatSession
            }));
            
            currentChatSession = null;
            document.getElementById('chat-messages').innerHTML = '<div class="empty-state"><p>Select a chat to continue</p></div>';
            document.getElementById('chat-input-area').style.display = 'none';
            document.getElementById('close-chat-btn').style.display = 'none';
            
            loadChatSessions();
        }
    }

    // ========================================
    // Consultations Functions
    // ========================================

    let consultationsPage = 1;
    let consultationsFilters = {};

    async function loadConsultations() {
        const params = new URLSearchParams({
            page: consultationsPage,
            limit: 20,
            ...consultationsFilters
        });
        
        const data = await apiRequest(`/consultation?${params}`);
        
        if (!data || !data.success) {
            console.error('Failed to load consultations');
            return;
        }
        
        renderConsultations(data.consultations);
        setupConsultationFilters();
    }

    function renderConsultations(consultations) {
        const tbody = document.getElementById('consultations-tbody');
        if (!tbody) return;
        
        if (!consultations || !consultations.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted" style="padding: 60px;">
                        No consultations found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = consultations.map(c => `
            <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.email)}</td>
                <td>${c.service || 'General'}</td>
                <td>${formatDate(c.booking_date)}</td>
                <td>${c.booking_time}</td>
                <td>${getStatusBadge(c.status)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-outline" onclick="AdminApp.viewConsultation('${c.id}')" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        ${c.status === 'pending' ? `
                        <button class="btn btn-icon btn-primary" onclick="AdminApp.updateConsultationStatus('${c.id}', 'confirmed')" title="Confirm">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function setupConsultationFilters() {
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('filter-status');
        const dateFilter = document.getElementById('filter-date');
        
        let searchTimeout;
        
        if (searchInput && !searchInput._hasListener) {
            searchInput._hasListener = true;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    consultationsFilters.search = e.target.value;
                    consultationsPage = 1;
                    loadConsultations();
                }, 300);
            });
        }
        
        if (statusFilter && !statusFilter._hasListener) {
            statusFilter._hasListener = true;
            statusFilter.addEventListener('change', (e) => {
                consultationsFilters.status = e.target.value;
                consultationsPage = 1;
                loadConsultations();
            });
        }
        
        if (dateFilter && !dateFilter._hasListener) {
            dateFilter._hasListener = true;
            dateFilter.addEventListener('change', (e) => {
                consultationsFilters.date = e.target.value;
                consultationsPage = 1;
                loadConsultations();
            });
        }
    }

    async function viewConsultation(id) {
        const data = await apiRequest(`/consultation/${id}`);
        
        if (!data || !data.success) {
            showToast('Failed to load consultation', 'error');
            return;
        }
        
        const c = data.consultation;
        const modal = document.getElementById('consultation-modal');
        const detail = document.getElementById('consultation-detail');
        
        detail.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <p><strong>${escapeHtml(c.name)}</strong></p>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <p>${escapeHtml(c.email)}</p>
                </div>
            </div>
            ${c.phone ? `
            <div class="form-group">
                <label>Phone</label>
                <p>${escapeHtml(c.phone)}</p>
            </div>
            ` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label>Date</label>
                    <p>${formatDate(c.booking_date)}</p>
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <p>${c.booking_time}</p>
                </div>
            </div>
            <div class="form-group">
                <label>Service</label>
                <p>${c.service || 'General Consultation'}</p>
            </div>
            ${c.notes ? `
            <div class="form-group">
                <label>Notes</label>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
                    ${escapeHtml(c.notes)}
                </div>
            </div>
            ` : ''}
            <div class="form-group">
                <label>Status</label>
                <div>${getStatusBadge(c.status)}</div>
            </div>
        `;
        
        // Update button visibility based on status
        const confirmBtn = document.getElementById('confirm-consultation-btn');
        const cancelBtn = document.getElementById('cancel-consultation-btn');
        
        confirmBtn.style.display = c.status === 'pending' ? 'block' : 'none';
        cancelBtn.style.display = c.status !== 'cancelled' ? 'block' : 'none';
        
        confirmBtn.onclick = async () => {
            await updateConsultationStatus(id, 'confirmed');
            closeModals();
        };
        
        cancelBtn.onclick = async () => {
            const confirmed = await showConfirmModal({
                title: 'Cancel Consultation',
                message: 'Are you sure you want to cancel this consultation?',
                type: 'warning',
                confirmText: 'Yes, Cancel',
                cancelText: 'No, Keep It',
                confirmClass: 'btn-danger'
            });
            
            if (confirmed) {
                await updateConsultationStatus(id, 'cancelled');
                closeModals();
            }
        };
        
        modal.classList.add('active');
    }

    async function updateConsultationStatus(id, status) {
        const result = await apiRequest(`/consultation/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        
        if (result && result.success) {
            showToast('Consultation status updated', 'success');
            loadConsultations();
        } else {
            showToast(result?.message || 'Failed to update status', 'error');
        }
    }

    // ========================================
    // Staff Functions
    // ========================================

    async function loadStaff() {
        const data = await apiRequest('/admin/staff');
        
        if (!data || !data.success) {
            console.error('Failed to load staff');
            return;
        }
        
        renderStaff(data.staff);
        setupStaffEventListeners();
    }

    function renderStaff(staff) {
        const tbody = document.getElementById('staff-tbody');
        if (!tbody) return;
        
        if (!staff || !staff.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted" style="padding: 60px;">
                        No staff members found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = staff.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml(s.email)}</td>
                <td>${s.role.charAt(0).toUpperCase() + s.role.slice(1)}</td>
                <td>${getStatusBadge(s.status)}</td>
                <td>${s.last_login ? formatRelativeTime(s.last_login) : 'Never'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon btn-outline" onclick="AdminApp.editStaff('${s.id}')" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        ${s.id !== currentUser.id ? `
                        <button class="btn btn-icon btn-danger" onclick="AdminApp.deleteStaff('${s.id}')" title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function setupStaffEventListeners() {
        const addBtn = document.getElementById('add-staff-btn');
        const saveBtn = document.getElementById('save-staff-btn');
        
        if (addBtn && !addBtn._hasListener) {
            addBtn._hasListener = true;
            addBtn.addEventListener('click', () => {
                openStaffModal();
            });
        }
        
        if (saveBtn && !saveBtn._hasListener) {
            saveBtn._hasListener = true;
            saveBtn.addEventListener('click', saveStaff);
        }
    }

    function openStaffModal(staff = null) {
        const modal = document.getElementById('staff-modal');
        const title = document.getElementById('staff-modal-title');
        const form = document.getElementById('staff-form');
        const passwordRow = document.getElementById('password-row');
        
        form.reset();
        
        if (staff) {
            title.textContent = 'Edit Staff Member';
            document.getElementById('staff-id').value = staff.id;
            document.getElementById('staff-name').value = staff.name;
            document.getElementById('staff-email').value = staff.email;
            document.getElementById('staff-role').value = staff.role;
            if (document.getElementById('staff-phone')) {
                document.getElementById('staff-phone').value = staff.phone || '';
            }
            if (document.getElementById('staff-department')) {
                document.getElementById('staff-department').value = staff.department || '';
            }
            // Set permissions if they exist
            if (document.getElementById('perm-messages')) {
                document.getElementById('perm-messages').checked = staff.can_manage_messages !== false;
            }
            if (document.getElementById('perm-consultations')) {
                document.getElementById('perm-consultations').checked = staff.can_manage_consultations !== false;
            }
            if (document.getElementById('perm-chats')) {
                document.getElementById('perm-chats').checked = staff.can_manage_chats !== false;
            }
            if (document.getElementById('perm-analytics')) {
                document.getElementById('perm-analytics').checked = staff.can_view_analytics === true;
            }
            document.getElementById('staff-password').required = false;
            if (passwordRow) {
                const label = passwordRow.querySelector('label[for="staff-password"]');
                if (label) label.textContent = 'New Password (leave blank to keep current)';
            }
        } else {
            title.textContent = 'Add Staff Member';
            document.getElementById('staff-id').value = '';
            document.getElementById('staff-password').required = true;
            if (passwordRow) {
                const label = passwordRow.querySelector('label[for="staff-password"]');
                if (label) label.textContent = 'Password *';
            }
        }
        
        modal.classList.add('active');
    }

    async function editStaff(id) {
        const data = await apiRequest(`/admin/staff/${id}`);
        
        if (data && data.success) {
            openStaffModal(data.data);
        } else {
            showToast('Failed to load staff member', 'error');
        }
    }

    async function saveStaff() {
        const id = document.getElementById('staff-id').value;
        const errorEl = document.getElementById('form-error');
        
        // Collect permissions from checkboxes
        const permissions = {
            messages: document.getElementById('perm-messages')?.checked || false,
            consultations: document.getElementById('perm-consultations')?.checked || false,
            chats: document.getElementById('perm-chats')?.checked || false,
            analytics: document.getElementById('perm-analytics')?.checked || false
        };
        
        const staffData = {
            name: document.getElementById('staff-name').value,
            email: document.getElementById('staff-email').value,
            role: document.getElementById('staff-role').value,
            phone: document.getElementById('staff-phone')?.value || '',
            department: document.getElementById('staff-department')?.value || '',
            permissions
        };
        
        const password = document.getElementById('staff-password').value;
        
        // Password is required for new staff
        if (!id && !password) {
            if (errorEl) {
                errorEl.textContent = 'Password is required for new staff members';
                errorEl.style.display = 'block';
            }
            return;
        }
        
        if (password) {
            staffData.password = password;
        }
        
        // Hide previous errors
        if (errorEl) errorEl.style.display = 'none';
        
        const url = id ? `/admin/staff/${id}` : '/admin/staff';
        const method = id ? 'PATCH' : 'POST';
        
        const result = await apiRequest(url, {
            method,
            body: JSON.stringify(staffData)
        });
        
        if (result && result.success) {
            closeModals();
            loadStaff();
        } else {
            const message = result?.message || result?.errors?.[0]?.msg || 'Failed to save staff member';
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
            } else {
                showToast(message, 'error');
            }
        }
    }

    async function deleteStaff(id) {
        const confirmed = await showConfirmModal({
            title: 'Delete Staff Member',
            message: 'Are you sure you want to delete this staff member? This action cannot be undone.',
            type: 'error',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmClass: 'btn-danger'
        });
        
        if (!confirmed) return;
        
        const result = await apiRequest(`/admin/staff/${id}`, {
            method: 'DELETE'
        });
        
        if (result && result.success) {
            showToast('Staff member deleted', 'success');
            loadStaff();
        } else {
            showToast(result?.message || 'Failed to delete staff member', 'error');
        }
    }

    // ========================================
    // Analytics Functions
    // ========================================

    async function loadAnalytics() {
        const period = document.getElementById('period-filter')?.value || 30;
        const data = await apiRequest(`/analytics?days=${period}`);
        
        if (!data || !data.success) {
            console.error('Failed to load analytics');
            return;
        }
        
        renderAnalytics(data);
        setupAnalyticsFilters();
    }

    function renderAnalytics(data) {
        // Update stats
        document.getElementById('stat-visitors').textContent = data.totalVisitors || 0;
        document.getElementById('stat-messages').textContent = data.totalMessages || 0;
        document.getElementById('stat-chats').textContent = data.totalChats || 0;
        document.getElementById('stat-consultations').textContent = data.totalConsultations || 0;
        
        // Render service breakdown
        renderServiceBreakdown(data.messagesByService || {});
        
        // Render status breakdown
        renderStatusBreakdown(data.messagesByStatus || {});
        
        // Render activity
        renderActivityLog(data.recentActivity || []);
    }

    function renderServiceBreakdown(services) {
        const container = document.getElementById('services-breakdown');
        if (!container) return;
        
        const total = Object.values(services).reduce((a, b) => a + b, 0) || 1;
        const colors = ['blue', 'green', 'orange', 'purple'];
        
        const items = Object.entries(services).map(([service, count], i) => ({
            label: service || 'General',
            count,
            percentage: Math.round((count / total) * 100),
            color: colors[i % colors.length]
        }));
        
        container.innerHTML = items.map(item => `
            <div class="breakdown-item">
                <span class="breakdown-label">${item.label}</span>
                <div class="breakdown-bar">
                    <div class="breakdown-fill ${item.color}" style="width: ${item.percentage}%"></div>
                </div>
                <span class="breakdown-value">${item.count}</span>
            </div>
        `).join('');
    }

    function renderStatusBreakdown(statuses) {
        const container = document.getElementById('status-breakdown');
        if (!container) return;
        
        const total = Object.values(statuses).reduce((a, b) => a + b, 0) || 1;
        const colorMap = {
            'new': 'blue',
            'in_progress': 'orange',
            'converted': 'green',
            'archived': 'gray'
        };
        
        const items = Object.entries(statuses).map(([status, count]) => ({
            label: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count,
            percentage: Math.round((count / total) * 100),
            color: colorMap[status] || 'gray'
        }));
        
        container.innerHTML = items.map(item => `
            <div class="breakdown-item">
                <span class="breakdown-label">${item.label}</span>
                <div class="breakdown-bar">
                    <div class="breakdown-fill ${item.color}" style="width: ${item.percentage}%"></div>
                </div>
                <span class="breakdown-value">${item.count}</span>
            </div>
        `).join('');
    }

    function renderActivityLog(activity) {
        const tbody = document.getElementById('activity-tbody');
        if (!tbody) return;
        
        if (!activity.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted" style="padding: 40px;">
                        No recent activity
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = activity.slice(0, 10).map(a => `
            <tr>
                <td>${escapeHtml(a.event)}</td>
                <td><span class="status-badge">${a.type}</span></td>
                <td>${a.details || '-'}</td>
                <td>${formatRelativeTime(a.created_at)}</td>
            </tr>
        `).join('');
    }

    function setupAnalyticsFilters() {
        const periodFilter = document.getElementById('period-filter');
        
        if (periodFilter && !periodFilter._hasListener) {
            periodFilter._hasListener = true;
            periodFilter.addEventListener('change', loadAnalytics);
        }
    }

    // Public API
    return {
        init,
        apiRequest,
        showNotification,
        getCurrentUser: () => currentUser,
        getAuthHeaders,
        loadDashboardStats,
        loadMessages,
        viewMessage,
        updateMessageStatus,
        goToPage,
        initChatPage,
        selectChatSession,
        showTransferModal,
        executeTransfer,
        releaseChat,
        loadConsultations,
        viewConsultation,
        updateConsultationStatus,
        loadStaff,
        editStaff,
        deleteStaff,
        loadAnalytics
    };
})();
