/**
 * Pagination Middleware
 * Parses and validates pagination parameters from query string
 */

/**
 * Default pagination options
 */
const defaults = {
    page: 1,
    limit: 20,
    maxLimit: 100,
    sortField: 'created_at',
    sortOrder: 'DESC'
};

/**
 * Pagination middleware
 * Attaches parsed pagination params to req.pagination
 */
const paginationMiddleware = (options = {}) => {
    const config = { ...defaults, ...options };
    
    return (req, res, next) => {
        // Parse page
        let page = parseInt(req.query.page, 10);
        if (isNaN(page) || page < 1) {
            page = config.page;
        }
        
        // Parse limit (perPage)
        let limit = parseInt(req.query.limit || req.query.per_page || req.query.perPage, 10);
        if (isNaN(limit) || limit < 1) {
            limit = config.limit;
        }
        limit = Math.min(limit, config.maxLimit);
        
        // Parse sort
        let sortField = req.query.sort || req.query.order_by || req.query.orderBy || config.sortField;
        let sortOrder = config.sortOrder;
        
        // Handle "-created_at" format (minus means DESC)
        if (sortField.startsWith('-')) {
            sortField = sortField.slice(1);
            sortOrder = 'DESC';
        } else if (sortField.startsWith('+')) {
            sortField = sortField.slice(1);
            sortOrder = 'ASC';
        }
        
        // Also check for separate order parameter
        if (req.query.order) {
            sortOrder = req.query.order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        }
        
        // Validate sort field (basic SQL injection prevention)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sortField)) {
            sortField = config.sortField;
        }
        
        // Parse search
        const search = (req.query.search || req.query.q || '').trim();
        
        // Parse filters
        const filters = {};
        const filterableFields = options.filterableFields || ['status', 'assigned_to', 'service', 'topic', 'type'];
        
        for (const field of filterableFields) {
            const snakeCase = field;
            const camelCase = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            
            if (req.query[snakeCase] !== undefined) {
                filters[field] = req.query[snakeCase];
            } else if (req.query[camelCase] !== undefined) {
                filters[field] = req.query[camelCase];
            }
        }
        
        // Parse date range
        const dateRange = {
            from: req.query.from || req.query.date_from || req.query.dateFrom || null,
            to: req.query.to || req.query.date_to || req.query.dateTo || null
        };
        
        // Calculate offset
        const offset = (page - 1) * limit;
        
        // Attach to request
        req.pagination = {
            page,
            limit,
            offset,
            sortField,
            sortOrder,
            search,
            filters,
            dateRange,
            
            // Helper methods
            toSQL: () => ({
                limit: `LIMIT ${limit}`,
                offset: offset > 0 ? `OFFSET ${offset}` : '',
                orderBy: `ORDER BY ${sortField} ${sortOrder}`
            }),
            
            // Build response with pagination info
            buildResponse: (data, total) => ({
                success: true,
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1,
                    from: offset + 1,
                    to: Math.min(offset + limit, total)
                },
                filters: Object.keys(filters).length > 0 ? filters : undefined,
                search: search || undefined,
                sort: `${sortOrder === 'DESC' ? '-' : ''}${sortField}`
            })
        };
        
        next();
    };
};

/**
 * Helper to add pagination headers to response
 */
const setPaginationHeaders = (res, pagination) => {
    res.set({
        'X-Total-Count': pagination.total,
        'X-Page': pagination.page,
        'X-Per-Page': pagination.limit,
        'X-Total-Pages': pagination.totalPages
    });
    
    // Build Link header for API discoverability
    const links = [];
    const baseUrl = '';
    
    if (pagination.hasNext) {
        links.push(`<${baseUrl}?page=${pagination.page + 1}>; rel="next"`);
        links.push(`<${baseUrl}?page=${pagination.totalPages}>; rel="last"`);
    }
    if (pagination.hasPrev) {
        links.push(`<${baseUrl}?page=${pagination.page - 1}>; rel="prev"`);
        links.push(`<${baseUrl}?page=1>; rel="first"`);
    }
    
    if (links.length > 0) {
        res.set('Link', links.join(', '));
    }
};

module.exports = {
    paginationMiddleware,
    setPaginationHeaders,
    defaults
};
