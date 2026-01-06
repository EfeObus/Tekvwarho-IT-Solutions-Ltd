/**
 * Query Builder Utility
 * Dynamic SQL query building with search, filters, and pagination
 */

class QueryBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.selectColumns = ['*'];
        this.whereConditions = [];
        this.orderByColumns = [];
        this.params = [];
        this.paramIndex = 1;
        this.limitValue = null;
        this.offsetValue = null;
        this.searchColumns = [];
        this.searchTerm = null;
    }

    /**
     * Specify columns to select
     */
    select(...columns) {
        this.selectColumns = columns.length > 0 ? columns : ['*'];
        return this;
    }

    /**
     * Add a WHERE condition
     */
    where(column, operator, value) {
        if (value === undefined || value === null || value === '') {
            return this;
        }
        
        this.whereConditions.push({
            column,
            operator,
            paramIndex: this.paramIndex
        });
        this.params.push(value);
        this.paramIndex++;
        return this;
    }

    /**
     * Add WHERE column = value
     */
    whereEquals(column, value) {
        return this.where(column, '=', value);
    }

    /**
     * Add WHERE column LIKE value
     */
    whereLike(column, value) {
        if (!value) return this;
        return this.where(column, 'ILIKE', `%${value}%`);
    }

    /**
     * Add WHERE column IN (values)
     */
    whereIn(column, values) {
        if (!values || !Array.isArray(values) || values.length === 0) {
            return this;
        }
        
        const placeholders = values.map((_, i) => `$${this.paramIndex + i}`).join(', ');
        this.whereConditions.push({
            type: 'in',
            column,
            placeholders
        });
        this.params.push(...values);
        this.paramIndex += values.length;
        return this;
    }

    /**
     * Add WHERE column BETWEEN start AND end
     */
    whereBetween(column, start, end) {
        if (!start && !end) return this;
        
        if (start && end) {
            this.whereConditions.push({
                type: 'between',
                column,
                startParam: this.paramIndex,
                endParam: this.paramIndex + 1
            });
            this.params.push(start, end);
            this.paramIndex += 2;
        } else if (start) {
            this.where(column, '>=', start);
        } else if (end) {
            this.where(column, '<=', end);
        }
        return this;
    }

    /**
     * Add date range filter
     */
    whereDateRange(column, from, to) {
        if (from) {
            this.where(column, '>=', from);
        }
        if (to) {
            // Add time to include the entire day
            const endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);
            this.where(column, '<=', endDate.toISOString());
        }
        return this;
    }

    /**
     * Add full-text search across multiple columns
     */
    search(term, columns) {
        if (!term || term.trim() === '') return this;
        
        this.searchTerm = term.trim();
        this.searchColumns = columns;
        return this;
    }

    /**
     * Add ORDER BY clause
     */
    orderBy(column, direction = 'ASC') {
        // Handle sort string like "-created_at" (descending) or "created_at" (ascending)
        if (column.startsWith('-')) {
            column = column.slice(1);
            direction = 'DESC';
        } else if (column.startsWith('+')) {
            column = column.slice(1);
            direction = 'ASC';
        }
        
        // Validate direction
        direction = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        // Prevent SQL injection - only allow alphanumeric and underscore
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
            throw new Error('Invalid column name for ORDER BY');
        }
        
        this.orderByColumns.push({ column, direction });
        return this;
    }

    /**
     * Add LIMIT clause
     */
    limit(count) {
        this.limitValue = parseInt(count, 10);
        return this;
    }

    /**
     * Add OFFSET clause
     */
    offset(count) {
        this.offsetValue = parseInt(count, 10);
        return this;
    }

    /**
     * Add pagination
     */
    paginate(page = 1, perPage = 20) {
        page = Math.max(1, parseInt(page, 10) || 1);
        perPage = Math.min(100, Math.max(1, parseInt(perPage, 10) || 20));
        
        this.limitValue = perPage;
        this.offsetValue = (page - 1) * perPage;
        this._page = page;
        this._perPage = perPage;
        return this;
    }

    /**
     * Build the WHERE clause
     */
    _buildWhereClause() {
        const conditions = [];
        
        // Regular conditions
        for (const cond of this.whereConditions) {
            if (cond.type === 'in') {
                conditions.push(`${cond.column} IN (${cond.placeholders})`);
            } else if (cond.type === 'between') {
                conditions.push(`${cond.column} BETWEEN $${cond.startParam} AND $${cond.endParam}`);
            } else {
                conditions.push(`${cond.column} ${cond.operator} $${cond.paramIndex}`);
            }
        }
        
        // Search conditions
        if (this.searchTerm && this.searchColumns.length > 0) {
            const searchConditions = this.searchColumns.map(col => 
                `${col} ILIKE $${this.paramIndex}`
            ).join(' OR ');
            conditions.push(`(${searchConditions})`);
            this.params.push(`%${this.searchTerm}%`);
            this.paramIndex++;
        }
        
        return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    }

    /**
     * Build the complete SELECT query
     */
    build() {
        const select = `SELECT ${this.selectColumns.join(', ')}`;
        const from = `FROM ${this.tableName}`;
        const where = this._buildWhereClause();
        
        let orderBy = '';
        if (this.orderByColumns.length > 0) {
            orderBy = 'ORDER BY ' + this.orderByColumns
                .map(o => `${o.column} ${o.direction}`)
                .join(', ');
        }
        
        let limit = '';
        if (this.limitValue !== null) {
            limit = `LIMIT ${this.limitValue}`;
        }
        
        let offset = '';
        if (this.offsetValue !== null && this.offsetValue > 0) {
            offset = `OFFSET ${this.offsetValue}`;
        }
        
        const query = [select, from, where, orderBy, limit, offset]
            .filter(Boolean)
            .join(' ');
        
        return {
            query,
            params: this.params,
            pagination: this._page ? { page: this._page, perPage: this._perPage } : null
        };
    }

    /**
     * Build a COUNT query for pagination
     */
    buildCount() {
        const select = `SELECT COUNT(*) as total`;
        const from = `FROM ${this.tableName}`;
        const where = this._buildWhereClause();
        
        const query = [select, from, where].filter(Boolean).join(' ');
        
        return {
            query,
            params: this.params
        };
    }

    /**
     * Static helper to parse query parameters
     */
    static parseQueryParams(query) {
        return {
            page: parseInt(query.page, 10) || 1,
            limit: Math.min(100, parseInt(query.limit, 10) || 20),
            search: query.search || query.q || '',
            sort: query.sort || '-created_at',
            status: query.status || '',
            from: query.from || query.dateFrom || '',
            to: query.to || query.dateTo || '',
            assignedTo: query.assigned_to || query.assignedTo || '',
            service: query.service || '',
            topic: query.topic || ''
        };
    }

    /**
     * Build pagination response
     */
    static buildPaginationResponse(data, total, page, perPage) {
        const totalPages = Math.ceil(total / perPage);
        
        return {
            data,
            pagination: {
                page,
                perPage,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                from: (page - 1) * perPage + 1,
                to: Math.min(page * perPage, total)
            }
        };
    }
}

module.exports = QueryBuilder;
