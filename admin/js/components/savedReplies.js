/**
 * Saved Replies Manager
 * UI component for managing and using saved reply templates
 */

class SavedRepliesManager {
    constructor(options = {}) {
        this.container = options.container || '#saved-replies-panel';
        this.onSelect = options.onSelect || (() => {});
        this.apiEndpoint = '/api/admin/replies';
        
        this.replies = [];
        this.categories = [];
        this.selectedCategory = 'all';
        this.searchTerm = '';
        
        this.init();
    }
    
    async init() {
        await this.loadReplies();
        await this.loadCategories();
        this.render();
        this.bindEvents();
    }
    
    async loadReplies() {
        try {
            const params = new URLSearchParams();
            if (this.selectedCategory && this.selectedCategory !== 'all') {
                params.set('category', this.selectedCategory);
            }
            if (this.searchTerm) {
                params.set('search', this.searchTerm);
            }
            
            const response = await fetch(`${this.apiEndpoint}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.replies = data.data;
            }
        } catch (error) {
            console.error('Error loading saved replies:', error);
        }
    }
    
    async loadCategories() {
        try {
            const response = await fetch(`${this.apiEndpoint}/categories`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.data;
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    render() {
        const container = document.querySelector(this.container);
        if (!container) return;
        
        container.innerHTML = `
            <div class="saved-replies-manager">
                <div class="saved-replies-header">
                    <h3>Saved Replies</h3>
                    <button class="btn-icon add-reply-btn" title="Add New Reply">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="saved-replies-search">
                    <input type="text" 
                           id="replies-search" 
                           placeholder="Search or type shortcut..." 
                           value="${this.searchTerm}">
                </div>
                
                <div class="saved-replies-categories">
                    <button class="category-btn ${this.selectedCategory === 'all' ? 'active' : ''}" 
                            data-category="all">All</button>
                    ${this.categories.map(cat => `
                        <button class="category-btn ${this.selectedCategory === cat.category ? 'active' : ''}" 
                                data-category="${cat.category}">
                            ${this.formatCategoryName(cat.category)} (${cat.count})
                        </button>
                    `).join('')}
                </div>
                
                <div class="saved-replies-list">
                    ${this.replies.length === 0 ? `
                        <div class="empty-state">
                            <p>No saved replies found</p>
                            <button class="btn btn-secondary add-first-reply">Create Your First Reply</button>
                        </div>
                    ` : this.replies.map(reply => `
                        <div class="saved-reply-item" data-id="${reply.id}">
                            <div class="reply-header">
                                <span class="reply-title">${this.escapeHtml(reply.title)}</span>
                                ${reply.shortcut ? `<span class="reply-shortcut">${reply.shortcut}</span>` : ''}
                            </div>
                            <div class="reply-preview">${this.escapeHtml(reply.content.substring(0, 100))}${reply.content.length > 100 ? '...' : ''}</div>
                            <div class="reply-meta">
                                <span class="reply-category">${this.formatCategoryName(reply.category)}</span>
                                ${reply.is_global ? '<span class="reply-global" title="Available to all staff">🌐</span>' : ''}
                                ${reply.use_count > 0 ? `<span class="reply-usage">Used ${reply.use_count}x</span>` : ''}
                            </div>
                            <div class="reply-actions">
                                <button class="btn-icon use-reply" title="Use this reply">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    </svg>
                                </button>
                                <button class="btn-icon edit-reply" title="Edit">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.bindListEvents();
    }
    
    bindEvents() {
        // These are for the main container that persists
    }
    
    bindListEvents() {
        const container = document.querySelector(this.container);
        if (!container) return;
        
        // Search input
        const searchInput = container.querySelector('#replies-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchTerm = e.target.value;
                    this.checkShortcut(e.target.value);
                    this.loadReplies().then(() => this.render());
                }, 300);
            });
        }
        
        // Category buttons
        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedCategory = btn.dataset.category;
                this.loadReplies().then(() => this.render());
            });
        });
        
        // Add reply button
        container.querySelector('.add-reply-btn')?.addEventListener('click', () => {
            this.showCreateModal();
        });
        
        container.querySelector('.add-first-reply')?.addEventListener('click', () => {
            this.showCreateModal();
        });
        
        // Reply items
        container.querySelectorAll('.saved-reply-item').forEach(item => {
            const id = item.dataset.id;
            
            item.querySelector('.use-reply')?.addEventListener('click', () => {
                this.useReply(id);
            });
            
            item.querySelector('.edit-reply')?.addEventListener('click', () => {
                this.showEditModal(id);
            });
            
            // Double-click to use
            item.addEventListener('dblclick', () => {
                this.useReply(id);
            });
        });
    }
    
    async checkShortcut(input) {
        // Check if input starts with /
        if (!input.startsWith('/')) return;
        
        try {
            const response = await fetch(`${this.apiEndpoint}/shortcut/${encodeURIComponent(input)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.onSelect(data.data.content);
                    
                    // Clear search
                    const searchInput = document.querySelector('#replies-search');
                    if (searchInput) searchInput.value = '';
                    this.searchTerm = '';
                    
                    // Show notification
                    this.showNotification(`Used: ${data.data.title}`);
                }
            }
        } catch (error) {
            // Shortcut not found, that's okay
        }
    }
    
    async useReply(id) {
        const reply = this.replies.find(r => r.id === id);
        if (!reply) return;
        
        this.onSelect(reply.content);
        
        // Track usage
        try {
            await fetch(`${this.apiEndpoint}/${id}/use`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
        } catch (error) {
            console.error('Error tracking reply usage:', error);
        }
        
        this.showNotification(`Used: ${reply.title}`);
    }
    
    showCreateModal() {
        this.showModal({
            title: 'Create Saved Reply',
            reply: { title: '', content: '', category: 'general', shortcut: '', is_global: false },
            isNew: true
        });
    }
    
    async showEditModal(id) {
        const reply = this.replies.find(r => r.id === id);
        if (!reply) return;
        
        this.showModal({
            title: 'Edit Saved Reply',
            reply,
            isNew: false
        });
    }
    
    showModal({ title, reply, isNew }) {
        // Remove existing modal
        document.querySelector('.saved-reply-modal')?.remove();
        
        const modal = document.createElement('div');
        modal.className = 'saved-reply-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form id="saved-reply-form">
                    <div class="form-group">
                        <label for="reply-title">Title *</label>
                        <input type="text" id="reply-title" value="${this.escapeHtml(reply.title)}" required>
                    </div>
                    <div class="form-group">
                        <label for="reply-content">Content *</label>
                        <textarea id="reply-content" rows="6" required>${this.escapeHtml(reply.content)}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reply-category">Category</label>
                            <select id="reply-category">
                                <option value="general" ${reply.category === 'general' ? 'selected' : ''}>General</option>
                                <option value="greetings" ${reply.category === 'greetings' ? 'selected' : ''}>Greetings</option>
                                <option value="closings" ${reply.category === 'closings' ? 'selected' : ''}>Closings</option>
                                <option value="sales" ${reply.category === 'sales' ? 'selected' : ''}>Sales</option>
                                <option value="support" ${reply.category === 'support' ? 'selected' : ''}>Support</option>
                                <option value="pricing" ${reply.category === 'pricing' ? 'selected' : ''}>Pricing</option>
                                <option value="questions" ${reply.category === 'questions' ? 'selected' : ''}>Questions</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="reply-shortcut">Shortcut</label>
                            <input type="text" id="reply-shortcut" value="${this.escapeHtml(reply.shortcut || '')}" placeholder="/example">
                            <small>Start with / to use as shortcut</small>
                        </div>
                    </div>
                    <div class="form-group form-checkbox">
                        <input type="checkbox" id="reply-global" ${reply.is_global ? 'checked' : ''}>
                        <label for="reply-global">Make available to all staff members</label>
                    </div>
                    <div class="modal-actions">
                        ${!isNew ? `<button type="button" class="btn btn-danger delete-reply">Delete</button>` : ''}
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isNew ? 'Create' : 'Save'}</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Bind modal events
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        modal.querySelector('#saved-reply-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveReply(reply.id, isNew);
            modal.remove();
        });
        
        modal.querySelector('.delete-reply')?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this saved reply?')) {
                await this.deleteReply(reply.id);
                modal.remove();
            }
        });
    }
    
    async saveReply(id, isNew) {
        const data = {
            title: document.getElementById('reply-title').value,
            content: document.getElementById('reply-content').value,
            category: document.getElementById('reply-category').value,
            shortcut: document.getElementById('reply-shortcut').value || null,
            isGlobal: document.getElementById('reply-global').checked
        };
        
        try {
            const url = isNew ? this.apiEndpoint : `${this.apiEndpoint}/${id}`;
            const method = isNew ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(isNew ? 'Reply created!' : 'Reply updated!');
                await this.loadReplies();
                await this.loadCategories();
                this.render();
            } else {
                this.showNotification(result.message || 'Error saving reply', 'error');
            }
        } catch (error) {
            console.error('Error saving reply:', error);
            this.showNotification('Error saving reply', 'error');
        }
    }
    
    async deleteReply(id) {
        try {
            const response = await fetch(`${this.apiEndpoint}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Reply deleted');
                await this.loadReplies();
                await this.loadCategories();
                this.render();
            }
        } catch (error) {
            console.error('Error deleting reply:', error);
            this.showNotification('Error deleting reply', 'error');
        }
    }
    
    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

/**
 * Draft Manager
 * Auto-save functionality for message replies
 */
class DraftManager {
    constructor(options = {}) {
        this.textareaId = options.textareaId || 'reply-content';
        this.entityType = options.entityType || 'message';
        this.entityId = options.entityId;
        this.apiEndpoint = '/api/admin/drafts';
        this.saveInterval = options.saveInterval || 5000; // 5 seconds
        
        this.lastSavedContent = '';
        this.autoSaveTimer = null;
        this.statusElement = null;
        
        if (this.entityId) {
            this.init();
        }
    }
    
    async init() {
        // Load existing draft
        await this.loadDraft();
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Create status indicator
        this.createStatusIndicator();
    }
    
    async loadDraft() {
        try {
            const response = await fetch(`${this.apiEndpoint}/${this.entityType}/${this.entityId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const textarea = document.getElementById(this.textareaId);
                    if (textarea && !textarea.value) {
                        textarea.value = data.data.content;
                        this.lastSavedContent = data.data.content;
                        this.showDraftNotification();
                    }
                }
            }
        } catch (error) {
            // Draft not found or error, that's okay
        }
    }
    
    setupAutoSave() {
        const textarea = document.getElementById(this.textareaId);
        if (!textarea) return;
        
        textarea.addEventListener('input', () => {
            this.scheduleAutoSave();
        });
        
        // Save on blur
        textarea.addEventListener('blur', () => {
            if (textarea.value !== this.lastSavedContent) {
                this.saveDraft();
            }
        });
        
        // Save before unload
        window.addEventListener('beforeunload', (e) => {
            if (textarea.value && textarea.value !== this.lastSavedContent) {
                this.saveDraft();
            }
        });
    }
    
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.updateStatus('typing');
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveDraft();
        }, this.saveInterval);
    }
    
    async saveDraft() {
        const textarea = document.getElementById(this.textareaId);
        if (!textarea) return;
        
        const content = textarea.value.trim();
        
        // Don't save empty drafts
        if (!content) {
            return this.deleteDraft();
        }
        
        // Don't save if unchanged
        if (content === this.lastSavedContent) {
            return;
        }
        
        this.updateStatus('saving');
        
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({
                    entityType: this.entityType,
                    entityId: this.entityId,
                    content
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.lastSavedContent = content;
                this.updateStatus('saved');
            } else {
                this.updateStatus('error');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            this.updateStatus('error');
        }
    }
    
    async deleteDraft() {
        try {
            await fetch(`${this.apiEndpoint}/${this.entityType}/${this.entityId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            this.lastSavedContent = '';
            this.updateStatus('cleared');
        } catch (error) {
            // Ignore delete errors
        }
    }
    
    async discardDraft() {
        await this.deleteDraft();
        const textarea = document.getElementById(this.textareaId);
        if (textarea) {
            textarea.value = '';
        }
    }
    
    createStatusIndicator() {
        const textarea = document.getElementById(this.textareaId);
        if (!textarea) return;
        
        const wrapper = textarea.parentElement;
        if (!wrapper) return;
        
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'draft-status';
        this.statusElement.style.display = 'none';
        wrapper.appendChild(this.statusElement);
    }
    
    updateStatus(status) {
        if (!this.statusElement) return;
        
        const statusMessages = {
            typing: '✏️ Typing...',
            saving: '💾 Saving draft...',
            saved: '✅ Draft saved',
            error: '❌ Error saving draft',
            cleared: ''
        };
        
        this.statusElement.textContent = statusMessages[status] || '';
        this.statusElement.style.display = status === 'cleared' ? 'none' : 'block';
        
        // Auto-hide saved status
        if (status === 'saved') {
            setTimeout(() => {
                if (this.statusElement.textContent === statusMessages.saved) {
                    this.statusElement.style.opacity = '0.5';
                }
            }, 3000);
        } else {
            this.statusElement.style.opacity = '1';
        }
    }
    
    showDraftNotification() {
        const notification = document.createElement('div');
        notification.className = 'draft-notification';
        notification.innerHTML = `
            <span>📝 Draft restored</span>
            <button class="discard-draft">Discard</button>
        `;
        
        notification.querySelector('.discard-draft').addEventListener('click', () => {
            if (confirm('Discard this draft?')) {
                this.discardDraft();
                notification.remove();
            }
        });
        
        const textarea = document.getElementById(this.textareaId);
        if (textarea && textarea.parentElement) {
            textarea.parentElement.insertBefore(notification, textarea);
            
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }
    }
}

// Export for use
window.SavedRepliesManager = SavedRepliesManager;
window.DraftManager = DraftManager;
