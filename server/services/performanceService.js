/**
 * Staff Performance Service
 * Tracks and calculates staff performance metrics
 */

const db = require('../config/database');

const PerformanceService = {
    /**
     * Get comprehensive performance metrics for a staff member
     */
    async getStaffMetrics(staffId, startDate, endDate) {
        const [
            messageMetrics,
            consultationMetrics,
            chatMetrics,
            responseTimeMetrics,
            activityMetrics
        ] = await Promise.all([
            this.getMessageMetrics(staffId, startDate, endDate),
            this.getConsultationMetrics(staffId, startDate, endDate),
            this.getChatMetrics(staffId, startDate, endDate),
            this.getAverageResponseTime(staffId, startDate, endDate),
            this.getActivityMetrics(staffId, startDate, endDate)
        ]);

        // Calculate performance score (0-100)
        const performanceScore = this.calculatePerformanceScore({
            messageMetrics,
            consultationMetrics,
            chatMetrics,
            responseTimeMetrics,
            activityMetrics
        });

        return {
            staffId,
            period: { startDate, endDate },
            messages: messageMetrics,
            consultations: consultationMetrics,
            chats: chatMetrics,
            responseTime: responseTimeMetrics,
            activity: activityMetrics,
            performanceScore
        };
    },

    /**
     * Get message handling metrics
     */
    async getMessageMetrics(staffId, startDate, endDate) {
        const result = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE assigned_to = $1) as assigned,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status = 'converted') as converted,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status = 'archived') as archived,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status IN ('new', 'in_progress')) as pending
            FROM messages
            WHERE created_at >= $2 AND created_at <= $3::date + interval '1 day'
        `, [staffId, startDate, endDate]);

        const row = result.rows[0];
        const assigned = parseInt(row.assigned) || 0;
        const converted = parseInt(row.converted) || 0;
        
        return {
            assigned,
            converted,
            archived: parseInt(row.archived) || 0,
            pending: parseInt(row.pending) || 0,
            conversionRate: assigned > 0 ? Math.round((converted / assigned) * 100) : 0
        };
    },

    /**
     * Get consultation handling metrics
     */
    async getConsultationMetrics(staffId, startDate, endDate) {
        const result = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE assigned_to = $1) as assigned,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status = 'completed') as completed,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status = 'confirmed') as confirmed,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE assigned_to = $1 AND status = 'pending') as pending
            FROM consultations
            WHERE created_at >= $2 AND created_at <= $3::date + interval '1 day'
        `, [staffId, startDate, endDate]);

        const row = result.rows[0];
        const assigned = parseInt(row.assigned) || 0;
        const completed = parseInt(row.completed) || 0;

        return {
            assigned,
            completed,
            confirmed: parseInt(row.confirmed) || 0,
            cancelled: parseInt(row.cancelled) || 0,
            pending: parseInt(row.pending) || 0,
            completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0
        };
    },

    /**
     * Get chat handling metrics
     */
    async getChatMetrics(staffId, startDate, endDate) {
        const result = await db.query(`
            SELECT 
                COUNT(DISTINCT cs.id) FILTER (WHERE cs.assigned_to = $1) as sessions_handled,
                COUNT(cm.id) FILTER (WHERE cm.sender_id = $1 AND cm.sender_type = 'staff') as messages_sent,
                COUNT(DISTINCT cs.id) FILTER (WHERE cs.assigned_to = $1 AND cs.status = 'closed') as sessions_closed
            FROM chat_sessions cs
            LEFT JOIN chat_messages cm ON cs.id = cm.session_id
            WHERE cs.started_at >= $2 AND cs.started_at <= $3::date + interval '1 day'
        `, [staffId, startDate, endDate]);

        const row = result.rows[0];
        return {
            sessionsHandled: parseInt(row.sessions_handled) || 0,
            messagesSent: parseInt(row.messages_sent) || 0,
            sessionsClosed: parseInt(row.sessions_closed) || 0
        };
    },

    /**
     * Calculate average response time for messages
     */
    async getAverageResponseTime(staffId, startDate, endDate) {
        // Get time between message creation and first reply
        const result = await db.query(`
            SELECT 
                AVG(
                    EXTRACT(EPOCH FROM (mr.created_at - m.created_at)) / 60
                ) as avg_response_minutes
            FROM messages m
            INNER JOIN message_replies mr ON m.id = mr.message_id
            WHERE mr.staff_id = $1
                AND mr.created_at >= $2 
                AND mr.created_at <= $3::date + interval '1 day'
                AND mr.id = (
                    SELECT id FROM message_replies 
                    WHERE message_id = m.id AND staff_id = $1
                    ORDER BY created_at ASC 
                    LIMIT 1
                )
        `, [staffId, startDate, endDate]);

        const avgMinutes = parseFloat(result.rows[0]?.avg_response_minutes) || 0;
        
        return {
            averageMinutes: Math.round(avgMinutes * 10) / 10,
            averageFormatted: this.formatDuration(avgMinutes)
        };
    },

    /**
     * Get general activity metrics from audit logs
     */
    async getActivityMetrics(staffId, startDate, endDate) {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_actions,
                COUNT(*) FILTER (WHERE action = 'login') as logins,
                COUNT(*) FILTER (WHERE action = 'reply') as replies,
                COUNT(*) FILTER (WHERE action = 'chat_response') as chat_responses,
                COUNT(*) FILTER (WHERE action = 'update_status') as status_updates,
                COUNT(*) FILTER (WHERE action = 'assign') as assignments,
                COUNT(DISTINCT DATE(created_at)) as active_days
            FROM audit_logs
            WHERE staff_id = $1
                AND created_at >= $2 
                AND created_at <= $3::date + interval '1 day'
        `, [staffId, startDate, endDate]);

        const row = result.rows[0];
        return {
            totalActions: parseInt(row.total_actions) || 0,
            logins: parseInt(row.logins) || 0,
            replies: parseInt(row.replies) || 0,
            chatResponses: parseInt(row.chat_responses) || 0,
            statusUpdates: parseInt(row.status_updates) || 0,
            assignments: parseInt(row.assignments) || 0,
            activeDays: parseInt(row.active_days) || 0
        };
    },

    /**
     * Get all staff performance summary for comparison
     */
    async getAllStaffPerformance(startDate, endDate) {
        const result = await db.query(`
            SELECT 
                s.id,
                s.name,
                s.email,
                s.role,
                s.department,
                -- Message metrics
                COALESCE(COUNT(DISTINCT m.id) FILTER (WHERE m.assigned_to = s.id), 0) as messages_assigned,
                COALESCE(COUNT(DISTINCT m.id) FILTER (WHERE m.assigned_to = s.id AND m.status = 'converted'), 0) as messages_converted,
                -- Consultation metrics
                COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_to = s.id), 0) as consultations_assigned,
                COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_to = s.id AND c.status = 'completed'), 0) as consultations_completed,
                -- Chat metrics
                COALESCE(COUNT(DISTINCT cs.id) FILTER (WHERE cs.assigned_to = s.id), 0) as chats_handled,
                -- Activity metrics
                COALESCE(COUNT(al.id), 0) as total_actions
            FROM staff s
            LEFT JOIN messages m ON m.assigned_to = s.id 
                AND m.created_at >= $1 AND m.created_at <= $2::date + interval '1 day'
            LEFT JOIN consultations c ON c.assigned_to = s.id
                AND c.created_at >= $1 AND c.created_at <= $2::date + interval '1 day'
            LEFT JOIN chat_sessions cs ON cs.assigned_to = s.id
                AND cs.started_at >= $1 AND cs.started_at <= $2::date + interval '1 day'
            LEFT JOIN audit_logs al ON al.staff_id = s.id
                AND al.created_at >= $1 AND al.created_at <= $2::date + interval '1 day'
            WHERE s.is_active = true
            GROUP BY s.id, s.name, s.email, s.role, s.department
            ORDER BY total_actions DESC
        `, [startDate, endDate]);

        return result.rows.map(row => ({
            ...row,
            messages_assigned: parseInt(row.messages_assigned),
            messages_converted: parseInt(row.messages_converted),
            consultations_assigned: parseInt(row.consultations_assigned),
            consultations_completed: parseInt(row.consultations_completed),
            chats_handled: parseInt(row.chats_handled),
            total_actions: parseInt(row.total_actions),
            message_conversion_rate: row.messages_assigned > 0 
                ? Math.round((row.messages_converted / row.messages_assigned) * 100) 
                : 0,
            consultation_completion_rate: row.consultations_assigned > 0
                ? Math.round((row.consultations_completed / row.consultations_assigned) * 100)
                : 0
        }));
    },

    /**
     * Calculate overall performance score (0-100)
     */
    calculatePerformanceScore({ messageMetrics, consultationMetrics, chatMetrics, responseTimeMetrics, activityMetrics }) {
        let score = 50; // Base score
        
        // Message conversion rate (up to 20 points)
        score += Math.min(messageMetrics.conversionRate * 0.2, 20);
        
        // Consultation completion rate (up to 15 points)
        score += Math.min(consultationMetrics.completionRate * 0.15, 15);
        
        // Response time (up to 15 points - faster is better)
        if (responseTimeMetrics.averageMinutes > 0) {
            // Under 30 min = full points, over 240 min = no points
            const responseScore = Math.max(0, 15 - (responseTimeMetrics.averageMinutes / 16));
            score += responseScore;
        }
        
        // Activity level (up to 10 points based on active days)
        const expectedDays = 22; // Average work days in a month
        const activityScore = Math.min((activityMetrics.activeDays / expectedDays) * 10, 10);
        score += activityScore;

        return Math.min(Math.round(score), 100);
    },

    /**
     * Format minutes to human readable duration
     */
    formatDuration(minutes) {
        if (minutes < 1) return 'Under 1 min';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    },

    /**
     * Get leaderboard for gamification
     */
    async getLeaderboard(period = 'month') {
        const startDate = this.getPeriodStart(period);
        const endDate = new Date().toISOString().split('T')[0];
        
        const staff = await this.getAllStaffPerformance(startDate, endDate);
        
        // Calculate scores for each staff
        const leaderboard = await Promise.all(
            staff.map(async (s) => {
                const metrics = await this.getStaffMetrics(s.id, startDate, endDate);
                return {
                    id: s.id,
                    name: s.name,
                    role: s.role,
                    totalActions: s.total_actions,
                    messagesConverted: s.messages_converted,
                    consultationsCompleted: s.consultations_completed,
                    chatsHandled: s.chats_handled,
                    performanceScore: metrics.performanceScore
                };
            })
        );
        
        return leaderboard.sort((a, b) => b.performanceScore - a.performanceScore);
    },

    /**
     * Get period start date
     */
    getPeriodStart(period) {
        const now = new Date();
        switch (period) {
            case 'week':
                now.setDate(now.getDate() - 7);
                break;
            case 'month':
                now.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                now.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                now.setFullYear(now.getFullYear() - 1);
                break;
            default:
                now.setMonth(now.getMonth() - 1);
        }
        return now.toISOString().split('T')[0];
    }
};

module.exports = PerformanceService;
