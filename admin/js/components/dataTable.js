/**
 * Search, Filters & Pagination Components
 * Reusable UI components for data tables
 */

/**
 * Search Component
 */
class SearchComponent {
    constructor(options = {}) {
        this.container = options.container || '#search-container';
        this.inputId = options.inputId || 'search-input';
        this.placeholder = options.placeholder || 'Search...';
        this.debounceMs = options.debounce || 300;
        this.onSearch = options.onSearch || (() => {});
        this.minChars = options.minChars || 2;
        
        this.debounceTimer = null;
        this.lastSearch = '';
        
        this.init();
    }
    
    init() {
        const input = document.getElementById(this.inputId);
        if (!input) return;
        
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            
            clearTimeout(this.debounceTimer);
            
            if (value.length === 0 || value.length >= this.minChars) {
                this.debounceTimer = setTimeout(() => {
                    if (value !== this.lastSearch) {
                        this.lastSearch = value;
                        this.onSearch(value);
                    }
                }, this.debounceMs);
            }
        });
        
        // Handle clear button if present
        const clearBtn = input.parentElement?.querySelector('.search-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                this.lastSearch = '';
                this.onSearch('');
            });
        }
        
        // Handle form submit (prevent page reload)
        const form = input.closest('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.onSearch(input.value.trim());
            });
        }
    }
    
    clear() {
        const input = document.getElementById(this.inputId);
        if (input) {
            input.value = '';
            this.lastSearch = '';
        }
    }
    
    setValue(value) {
        const input = document.getElementById(this.inputId);
        if (input) {
            input.value = value;
            this.lastSearch = value;
        }
    }
}

/**
 * Filter Component
 */
class FilterComponent {
    constructor(options = {}) {
        this.container = options.container || '#filters-container';
        this.filters = options.filters || [];
        this.onChange = options.onChange || (() => {});
        this.activeFilters = {};
        
        this.init();
    }
    
    init() {
        this.filters.forEach(filter => {
            const element = document.getElementById(filter.id);
            if (!element) return;
            
            element.addEventListener('change', (e) => {
                const value = e.target.value;
                
                if (value) {
                    this.activeFilters[filter.name] = value;
                } else {
                    delete this.activeFilters[filter.name];
                }
                
                this.onChange(this.activeFilters);
            });
        });
    }
    
    getFilters() {
        return { ...this.activeFilters };
    }
    
    setFilters(filters) {
        this.activeFilters = { ...filters };
        
        this.filters.forEach(filter => {
            const element = document.getElementById(filter.id);
            if (element && filters[filter.name] !== undefined) {
                element.value = filters[filter.name];
            }
        });
    }
    
    clearFilters() {
        this.activeFilters = {};
        
        this.filters.forEach(filter => {
            const element = document.getElementById(filter.id);
            if (element) {
                element.value = '';
            }
        });
        
        this.onChange({});
    }
    
    renderActiveFilters() {
        const container = document.querySelector('.active-filters');
        if (!container) return;
        
        const filterCount = Object.keys(this.activeFilters).length;
        
        if (filterCount === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'flex';
        container.innerHTML = `
            <span class="active-filters-label">Filters (${filterCount}):</span>
            ${Object.entries(this.activeFilters).map(([key, value]) => `
                <span class="filter-tag">
                    ${this.formatFilterLabel(key)}: ${value}
                    <button class="filter-tag-remove" data-filter="${key}">×</button>
                </span>
            `).join('')}
            <button class="clear-all-filters">Clear All</button>
        `;
        
        // Bind remove handlers
        container.querySelectorAll('.filter-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterName = e.target.dataset.filter;
                delete this.activeFilters[filterName];
                
                // Update the select element
                const filterConfig = this.filters.find(f => f.name === filterName);
                if (filterConfig) {
                    const element = document.getElementById(filterConfig.id);
                    if (element) element.value = '';
                }
                
                this.renderActiveFilters();
                this.onChange(this.activeFilters);
            });
        });
        
        container.querySelector('.clear-all-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }
    
    formatFilterLabel(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

/**
 * Date Range Filter Component
 */
class DateRangeFilter {
    constructor(options = {}) {
        this.fromId = options.fromId || 'date-from';
        this.toId = options.toId || 'date-to';
        this.onChange = options.onChange || (() => {});
        
        this.init();
    }
    
    init() {
        const fromInput = document.getElementById(this.fromId);
        const toInput = document.getElementById(this.toId);
        
        if (fromInput) {
            fromInput.addEventListener('change', () => this.handleChange());
        }
        if (toInput) {
            toInput.addEventListener('change', () => this.handleChange());
        }
    }
    
    handleChange() {
        const from = document.getElementById(this.fromId)?.value || null;
        const to = document.getElementById(this.toId)?.value || null;
        this.onChange({ from, to });
    }
    
    getRange() {
        return {
            from: document.getElementById(this.fromId)?.value || null,
            to: document.getElementById(this.toId)?.value || null
        };
    }
    
    setRange(from, to) {
        const fromInput = document.getElementById(this.fromId);
        const toInput = document.getElementById(this.toId);
        
        if (fromInput) fromInput.value = from || '';
        if (toInput) toInput.value = to || '';
    }
    
    clear() {
        this.setRange(null, null);
        this.onChange({ from: null, to: null });
    }
}

/**
 * Pagination Component
 */
class PaginationComponent {
    constructor(options = {}) {
        this.container = options.container || '#pagination';
        this.onPageChange = options.onPageChange || (() => {});
        this.maxVisiblePages = options.maxVisiblePages || 5;
        this.showInfo = options.showInfo !== false;
        this.showPerPage = options.showPerPage !== false;
        this.perPageOptions = options.perPageOptions || [10, 20, 50, 100];
        
        this.currentPage = 1;
        this.totalPages = 1;
        this.total = 0;
        this.perPage = 20;
    }
    
    update(pagination) {
        this.currentPage = pagination.page || 1;
        this.totalPages = pagination.totalPages || 1;
        this.total = pagination.total || 0;
        this.perPage = pagination.limit || pagination.perPage || 20;
        this.from = pagination.from || 1;
        this.to = pagination.to || 0;
        
        this.render();
    }
    
    render() {
        const container = document.querySelector(this.container);
        if (!container) return;
        
        if (this.total === 0) {
            container.innerHTML = '';
            return;
        }
        
        const pages = this.getPageNumbers();
        
        container.innerHTML = `
            <div class="pagination-wrapper">
                ${this.showInfo ? `
                    <div class="pagination-info">
                        Showing ${this.from} - ${this.to} of ${this.total}
                    </div>
                ` : ''}
                
                <div class="pagination-controls">
                    <button class="pagination-btn pagination-prev" 
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    
                    ${pages.map(page => {
                        if (page === '...') {
                            return '<span class="pagination-ellipsis">...</span>';
                        }
                        return `
                            <button class="pagination-btn pagination-page ${page === this.currentPage ? 'active' : ''}" 
                                    data-page="${page}">
                                ${page}
                            </button>
                        `;
                    }).join('')}
                    
                    <button class="pagination-btn pagination-next" 
                            ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
                
                ${this.showPerPage ? `
                    <div class="pagination-per-page">
                        <label>Per page:</label>
                        <select id="per-page-select">
                            ${this.perPageOptions.map(opt => `
                                <option value="${opt}" ${opt === this.perPage ? 'selected' : ''}>${opt}</option>
                            `).join('')}
                        </select>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.bindEvents(container);
    }
    
    getPageNumbers() {
        const pages = [];
        const half = Math.floor(this.maxVisiblePages / 2);
        
        let start = Math.max(1, this.currentPage - half);
        let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);
        
        if (end - start + 1 < this.maxVisiblePages) {
            start = Math.max(1, end - this.maxVisiblePages + 1);
        }
        
        // First page
        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }
        
        // Middle pages
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        // Last page
        if (end < this.totalPages) {
            if (end < this.totalPages - 1) pages.push('...');
            pages.push(this.totalPages);
        }
        
        return pages;
    }
    
    bindEvents(container) {
        // Page buttons
        container.querySelectorAll('.pagination-page').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page, 10);
                this.goToPage(page);
            });
        });
        
        // Prev button
        container.querySelector('.pagination-prev')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        });
        
        // Next button
        container.querySelector('.pagination-next')?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.goToPage(this.currentPage + 1);
            }
        });
        
        // Per page select
        container.querySelector('#per-page-select')?.addEventListener('change', (e) => {
            const newPerPage = parseInt(e.target.value, 10);
            this.perPage = newPerPage;
            this.onPageChange({ page: 1, perPage: newPerPage });
        });
    }
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        
        this.currentPage = page;
        this.onPageChange({ page, perPage: this.perPage });
    }
}

/**
 * Data Table Manager
 * Combines search, filters, and pagination for a complete data table solution
 */
class DataTableManager {
    constructor(options = {}) {
        this.tableId = options.tableId || 'data-table';
        this.loadData = options.loadData || (async () => ({ data: [], pagination: {} }));
        this.renderRow = options.renderRow || (() => '<tr><td>No render function</td></tr>');
        this.emptyState = options.emptyState || 'No data found';
        this.loadingState = options.loadingState || 'Loading...';
        
        this.state = {
            page: 1,
            perPage: 20,
            search: '',
            filters: {},
            sort: '-created_at',
            dateRange: { from: null, to: null }
        };
        
        this.components = {};
        this.init(options);
    }
    
    init(options) {
        // Initialize search
        if (options.searchInput) {
            this.components.search = new SearchComponent({
                inputId: options.searchInput,
                onSearch: (term) => {
                    this.state.search = term;
                    this.state.page = 1;
                    this.refresh();
                }
            });
        }
        
        // Initialize filters
        if (options.filters) {
            this.components.filters = new FilterComponent({
                filters: options.filters,
                onChange: (filters) => {
                    this.state.filters = filters;
                    this.state.page = 1;
                    this.refresh();
                }
            });
        }
        
        // Initialize date range
        if (options.dateFrom && options.dateTo) {
            this.components.dateRange = new DateRangeFilter({
                fromId: options.dateFrom,
                toId: options.dateTo,
                onChange: (range) => {
                    this.state.dateRange = range;
                    this.state.page = 1;
                    this.refresh();
                }
            });
        }
        
        // Initialize pagination
        if (options.paginationContainer) {
            this.components.pagination = new PaginationComponent({
                container: options.paginationContainer,
                onPageChange: ({ page, perPage }) => {
                    this.state.page = page;
                    if (perPage) this.state.perPage = perPage;
                    this.refresh();
                }
            });
        }
        
        // Initialize sorting
        this.initSorting();
    }
    
    initSorting() {
        const table = document.getElementById(this.tableId);
        if (!table) return;
        
        table.querySelectorAll('th[data-sort]').forEach(th => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                
                // Toggle direction
                if (this.state.sort === field) {
                    this.state.sort = `-${field}`;
                } else if (this.state.sort === `-${field}`) {
                    this.state.sort = field;
                } else {
                    this.state.sort = `-${field}`;
                }
                
                this.updateSortIndicators();
                this.refresh();
            });
        });
    }
    
    updateSortIndicators() {
        const table = document.getElementById(this.tableId);
        if (!table) return;
        
        const currentField = this.state.sort.replace(/^-/, '');
        const isDesc = this.state.sort.startsWith('-');
        
        table.querySelectorAll('th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.sort === currentField) {
                th.classList.add(isDesc ? 'sort-desc' : 'sort-asc');
            }
        });
    }
    
    async refresh() {
        const tbody = document.querySelector(`#${this.tableId} tbody`);
        if (!tbody) return;
        
        // Show loading state
        tbody.innerHTML = `<tr><td colspan="100" class="text-center">${this.loadingState}</td></tr>`;
        
        try {
            const result = await this.loadData(this.state);
            
            if (!result.data || result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="100" class="text-center">${this.emptyState}</td></tr>`;
            } else {
                tbody.innerHTML = result.data.map(this.renderRow).join('');
            }
            
            // Update pagination
            if (this.components.pagination && result.pagination) {
                this.components.pagination.update(result.pagination);
            }
            
            // Update filters display
            if (this.components.filters) {
                this.components.filters.renderActiveFilters();
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            tbody.innerHTML = `<tr><td colspan="100" class="text-center text-danger">Error loading data</td></tr>`;
        }
    }
    
    getState() {
        return { ...this.state };
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
    }
    
    buildQueryString() {
        const params = new URLSearchParams();
        
        params.set('page', this.state.page);
        params.set('limit', this.state.perPage);
        params.set('sort', this.state.sort);
        
        if (this.state.search) {
            params.set('search', this.state.search);
        }
        
        Object.entries(this.state.filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        
        if (this.state.dateRange.from) {
            params.set('from', this.state.dateRange.from);
        }
        if (this.state.dateRange.to) {
            params.set('to', this.state.dateRange.to);
        }
        
        return params.toString();
    }
}

// Export for use
window.SearchComponent = SearchComponent;
window.FilterComponent = FilterComponent;
window.DateRangeFilter = DateRangeFilter;
window.PaginationComponent = PaginationComponent;
window.DataTableManager = DataTableManager;
