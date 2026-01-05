/**
 * Booking Page JavaScript
 * Handles calendar, time slot selection, and booking form submission
 */

(function() {
    'use strict';

    // State
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTime = null;
    let bookedSlots = [];

    // Time slots configuration (9 AM to 6 PM, 1-hour slots)
    const timeSlots = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
    ];

    // Initialize
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        renderCalendar();
        setupEventListeners();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Calendar navigation
        document.querySelector('.calendar-nav.prev').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        document.querySelector('.calendar-nav.next').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });

        // Back button
        document.getElementById('back-to-calendar').addEventListener('click', () => {
            document.getElementById('booking-form-container').style.display = 'none';
            document.querySelector('.booking-container').style.display = 'grid';
        });

        // Booking form
        document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);

        // Book another button
        document.getElementById('book-another').addEventListener('click', resetBooking);
    }

    // Render calendar
    function renderCalendar() {
        const monthYear = document.getElementById('calendar-month-year');
        const daysContainer = document.getElementById('calendar-days');
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthYear.textContent = `${monthNames[month]} ${year}`;
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Generate days HTML
        let html = '';
        
        // Empty cells for days before first of month
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isPast = date < today;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isSelected = selectedDate && 
                              date.getDate() === selectedDate.getDate() &&
                              date.getMonth() === selectedDate.getMonth() &&
                              date.getFullYear() === selectedDate.getFullYear();
            
            let classes = 'calendar-day';
            if (isPast) classes += ' disabled';
            if (isWeekend) classes += ' weekend';
            if (isSelected) classes += ' selected';
            if (!isPast && !isWeekend) classes += ' available';
            
            const dataAttr = !isPast && !isWeekend ? 
                `data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}"` : '';
            
            html += `<div class="${classes}" ${dataAttr}>${day}</div>`;
        }
        
        daysContainer.innerHTML = html;
        
        // Add click listeners to available days
        document.querySelectorAll('.calendar-day.available').forEach(day => {
            day.addEventListener('click', handleDayClick);
        });
    }

    // Handle day click
    async function handleDayClick(e) {
        const dateStr = e.target.dataset.date;
        if (!dateStr) return;
        
        // Update selection
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });
        e.target.classList.add('selected');
        
        // Parse date
        const [year, month, day] = dateStr.split('-');
        selectedDate = new Date(year, month - 1, day);
        
        // Update display
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('selected-date-display').textContent = 
            selectedDate.toLocaleDateString('en-US', options);
        
        // Fetch available slots
        await fetchAvailableSlots(dateStr);
    }

    // Fetch available slots from API
    async function fetchAvailableSlots(date) {
        const slotsContainer = document.getElementById('time-slots');
        slotsContainer.innerHTML = '<p class="loading">Loading available times...</p>';
        
        try {
            const response = await fetch(`/api/consultation/slots?date=${date}`);
            const data = await response.json();
            
            if (data.success) {
                bookedSlots = data.bookedSlots || [];
                renderTimeSlots();
            } else {
                slotsContainer.innerHTML = '<p class="error">Failed to load time slots. Please try again.</p>';
            }
        } catch (error) {
            console.error('Error fetching slots:', error);
            // Fallback to rendering all slots
            bookedSlots = [];
            renderTimeSlots();
        }
    }

    // Render time slots
    function renderTimeSlots() {
        const slotsContainer = document.getElementById('time-slots');
        
        if (!selectedDate) {
            slotsContainer.innerHTML = '<p class="placeholder">Select a date first</p>';
            return;
        }
        
        let html = '';
        timeSlots.forEach(time => {
            const isBooked = bookedSlots.includes(time);
            const isSelected = selectedTime === time;
            
            let classes = 'time-slot';
            if (isBooked) classes += ' booked';
            if (isSelected) classes += ' selected';
            if (!isBooked) classes += ' available';
            
            html += `
                <button type="button" class="${classes}" 
                        ${isBooked ? 'disabled' : ''} 
                        data-time="${time}">
                    ${time}
                    ${isBooked ? '<span class="booked-label">Booked</span>' : ''}
                </button>
            `;
        });
        
        slotsContainer.innerHTML = html;
        
        // Add click listeners
        document.querySelectorAll('.time-slot.available').forEach(slot => {
            slot.addEventListener('click', handleTimeClick);
        });
    }

    // Handle time slot click
    function handleTimeClick(e) {
        const time = e.target.dataset.time || e.target.closest('.time-slot').dataset.time;
        if (!time) return;
        
        // Update selection
        document.querySelectorAll('.time-slot.selected').forEach(el => {
            el.classList.remove('selected');
        });
        e.target.classList.add('selected');
        
        selectedTime = time;
        
        // Show booking form
        showBookingForm();
    }

    // Show booking form
    function showBookingForm() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        document.getElementById('summary-date').textContent = 
            selectedDate.toLocaleDateString('en-US', options);
        document.getElementById('summary-time').textContent = selectedTime;
        
        document.querySelector('.booking-container').style.display = 'none';
        document.getElementById('booking-form-container').style.display = 'block';
        
        // Scroll to form
        document.getElementById('booking-form-container').scrollIntoView({ behavior: 'smooth' });
    }

    // Handle booking submission
    async function handleBookingSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Booking...';
        
        // Format date for API
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Prepare data
        const data = {
            name: document.getElementById('booking-name').value,
            email: document.getElementById('booking-email').value,
            phone: document.getElementById('booking-phone').value,
            company: document.getElementById('booking-company').value,
            service: document.getElementById('booking-service').value,
            notes: document.getElementById('booking-notes').value,
            booking_date: dateStr,
            booking_time: selectedTime
        };
        
        try {
            const response = await fetch('/api/consultation/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess(data);
            } else {
                alert(result.message || 'Failed to book consultation. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    // Show success message
    function showSuccess(data) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = selectedDate.toLocaleDateString('en-US', options);
        
        document.getElementById('success-details').innerHTML = `
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${selectedTime}</p>
            <p><strong>Service:</strong> ${data.service}</p>
            <p>A confirmation has been sent to <strong>${data.email}</strong></p>
        `;
        
        document.getElementById('booking-form-container').style.display = 'none';
        document.getElementById('booking-success').style.display = 'block';
        
        // Scroll to success message
        document.getElementById('booking-success').scrollIntoView({ behavior: 'smooth' });
    }

    // Reset booking for another
    function resetBooking() {
        selectedDate = null;
        selectedTime = null;
        bookedSlots = [];
        
        // Reset form
        document.getElementById('booking-form').reset();
        
        // Reset displays
        document.getElementById('selected-date-display').textContent = 'Select a date to see available times';
        document.getElementById('time-slots').innerHTML = '';
        
        // Show calendar
        document.getElementById('booking-success').style.display = 'none';
        document.querySelector('.booking-container').style.display = 'grid';
        
        // Re-render calendar
        renderCalendar();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
})();
