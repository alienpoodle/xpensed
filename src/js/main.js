document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables ---
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let selectedDayForDayView = null; // Used for the day view

    // --- DOM Elements ---
    const monthlyBudgetInput = document.getElementById('monthlyBudgetInput');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const displayMonthlyBudget = document.getElementById('displayMonthlyBudget');
    const displayRemainingBudget = document.getElementById('displayRemainingBudget');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');

    const transactionsTableBody = document.getElementById('transactionsTableBody');
    const transactionForm = document.getElementById('transactionForm');
    const transactionIdInput = document.getElementById('transactionId');
    const transactionDateInput = document.getElementById('transactionDate');
    const transactionDescriptionInput = document.getElementById('transactionDescription');
    const transactionAmountInput = document.getElementById('transactionAmount');
    const transactionTypeInput = document.getElementById('transactionType');
    const transactionCategoryInput = document.getElementById('transactionCategory');

    const quarterlySelect = document.getElementById('quarterSelect');
    const quarterlyIncomeSpan = document.getElementById('quarterlyIncome');
    const quarterlyExpensesSpan = document.getElementById('quarterlyExpenses');
    const quarterlySavingsSpan = document.getElementById('quarterlySavings');
    let quarterlyExpenseChart; // Chart.js instance
    let quarterlyTrendChart; // Chart.js instance

    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const currentMonthYearHeader = document.getElementById('currentMonthYear');
    const calendarBody = document.getElementById('calendarBody');

    const selectedDayDisplay = document.getElementById('selectedDayDisplay');
    const daySummary = document.getElementById('daySummary');
    const dayTransactionsTableBody = document.getElementById('dayTransactionsTableBody');

    // --- Get Tab Pane Elements ---
    const monthlyBudgetTabPane = document.getElementById('monthly-budget-section');
    const expensesTabPane = document.getElementById('expenses-section');
    const quarterlyTabPane = document.getElementById('quarterly-section');
    const calendarTabPane = document.getElementById('calendar-section');
    const dayViewTabPane = document.getElementById('day-view-section');


    // --- Helper Functions ---

    function saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function saveMonthlyBudget() {
        localStorage.setItem('monthlyBudget', monthlyBudget.toString());
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function getMonthName(monthIndex) {
        const date = new Date(2000, monthIndex);
        return date.toLocaleDateString('en-US', { month: 'long' });
    }

    // --- Monthly Budget Functions ---

    function updateMonthlyBudgetDisplay() {
        displayMonthlyBudget.textContent = monthlyBudget.toFixed(2);
        const currentMonthExpenses = transactions.filter(t =>
            new Date(t.date).getMonth() === currentMonth &&
            new Date(t.date).getFullYear() === currentYear &&
            t.type === 'expense'
        ).reduce((sum, t) => sum + t.amount, 0);

        const remainingBudget = monthlyBudget - currentMonthExpenses;
        displayRemainingBudget.textContent = remainingBudget.toFixed(2);
        currentMonthDisplay.value = `${getMonthName(currentMonth)} ${currentYear}`;
    }

    setBudgetBtn.addEventListener('click', () => {
        const newBudget = parseFloat(monthlyBudgetInput.value);
        if (!isNaN(newBudget) && newBudget >= 0) {
            monthlyBudget = newBudget;
            saveMonthlyBudget();
            updateMonthlyBudgetDisplay();
            monthlyBudgetInput.value = ''; // Clear input
            // Re-render transactions/calendar if budget affects their display (e.g., color coding)
            // renderTransactions(); // Not strictly needed here unless transactions list uses budget info
            // renderCalendar(); // Not strictly needed here unless calendar uses budget info
        } else {
            alert('Please enter a valid budget amount.');
        }
    });

    // --- Transaction Management Functions ---

    function addOrUpdateTransaction(event) {
        event.preventDefault();

        const id = transactionIdInput.value;
        const date = transactionDateInput.value;
        const description = transactionDescriptionInput.value;
        const amount = parseFloat(transactionAmountInput.value);
        const type = transactionTypeInput.value;
        const category = transactionCategoryInput.value;

        if (!date || !description || isNaN(amount) || amount <= 0 || !type) {
            alert('Please fill in all required fields with valid values.');
            return;
        }

        const newTransaction = {
            id: id || Date.now().toString(), // Use existing ID or generate new one
            date,
            description,
            amount,
            type,
            category
        };

        if (id) {
            // Update existing transaction
            const index = transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                transactions[index] = newTransaction;
            }
        } else {
            // Add new transaction
            transactions.push(newTransaction);
        }

        saveTransactions();
        // IMPORTANT: Re-render all relevant sections after adding/updating a transaction
        // This ensures data is fresh across all views.
        updateMonthlyBudgetDisplay(); // Might affect remaining budget
        renderTransactions(); // Updates transactions list
        renderCalendar(); // Updates calendar if new transactions affect a day
        if (quarterlyTabPane && quarterlyTabPane.classList.contains('show')) { // Only update if quarterly tab is active
             updateQuarterlyReport(); // Re-render quarterly charts
        }
        if (dayViewTabPane && dayViewTabPane.classList.contains('show') && selectedDayForDayView) { // Only update if day view is active
            renderDayView(selectedDayForDayView); // Re-render day view
        }

        transactionForm.reset();
        // Correct way to hide a modal programmatically in Bootstrap 5
        const modalElement = document.getElementById('addExpenseIncomeModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        }
    }

    function deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveTransactions();
            // IMPORTANT: Re-render all relevant sections after deleting a transaction
            updateMonthlyBudgetDisplay();
            renderTransactions();
            renderCalendar();
            if (quarterlyTabPane && quarterlyTabPane.classList.contains('show')) {
                updateQuarterlyReport();
            }
            if (dayViewTabPane && dayViewTabPane.classList.contains('show') && selectedDayForDayView) {
                renderDayView(selectedDayForDayView);
            }
        }
    }

    function editTransaction(id) {
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            transactionIdInput.value = transaction.id;
            transactionDateInput.value = transaction.date;
            transactionDescriptionInput.value = transaction.description;
            transactionAmountInput.value = transaction.amount;
            transactionTypeInput.value = transaction.type;
            transactionCategoryInput.value = transaction.category;
            // Correct way to show a modal programmatically in Bootstrap 5
            const modalElement = document.getElementById('addExpenseIncomeModal');
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    // --- Rendering Functions ---

    function renderTransactions() {
        transactionsTableBody.innerHTML = ''; // Clear existing rows
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedTransactions.length === 0) {
            const row = transactionsTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = 'No transactions recorded yet.';
            cell.classList.add('text-center', 'text-muted', 'py-3');
            return;
        }

        sortedTransactions.forEach(t => {
            const row = transactionsTableBody.insertRow();
            row.insertCell().textContent = formatDate(t.date);
            row.insertCell().textContent = t.description;
            row.insertCell().textContent = `$${t.amount.toFixed(2)}`;
            row.insertCell().textContent = t.type.charAt(0).toUpperCase() + t.type.slice(1);
            row.insertCell().textContent = t.category || '-';

            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.classList.add('btn', 'btn-sm', 'btn-info', 'me-2');
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => editTransaction(t.id);
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteTransaction(t.id);
            actionsCell.appendChild(deleteBtn);
        });
    }

    // --- Quarterly Report Functions ---

    function populateQuarterSelect() {
        const yearsInTransactions = transactions.map(t => new Date(t.date).getFullYear());
        const uniqueYears = [...new Set(yearsInTransactions)].sort((a, b) => a - b); // Sort years ascending

        let startYear = new Date().getFullYear();
        let endYear = new Date().getFullYear();

        if (uniqueYears.length > 0) {
            startYear = Math.min(...uniqueYears);
            endYear = Math.max(...uniqueYears);
        } else { // If no transactions, still show current year's quarters
            startYear = new Date().getFullYear();
            endYear = new Date().getFullYear();
        }
        
        quarterlySelect.innerHTML = '';
        for (let year = startYear; year <= endYear; year++) {
            for (let q = 1; q <= 4; q++) {
                const option = document.createElement('option');
                option.value = `${year}-Q${q}`;
                option.textContent = `${year} Q${q}`;
                quarterlySelect.appendChild(option);
            }
        }
        // Select current quarter by default
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
        const defaultQuarterValue = `${new Date().getFullYear()}-Q${currentQuarter}`;
        if (quarterlySelect.querySelector(`option[value="${defaultQuarterValue}"]`)) {
            quarterlySelect.value = defaultQuarterValue;
        } else if (quarterlySelect.options.length > 0) {
            // Fallback to the first available quarter if current quarter doesn't exist (e.g., no transactions for current year yet)
            quarterlySelect.value = quarterlySelect.options[0].value;
        }

        updateQuarterlyReport(); // Initial update when select is populated
    }

    function updateQuarterlyReport() {
        const selectedValue = quarterlySelect.value;
        if (!selectedValue) {
            // Clear displays if no quarter is selected (e.g., no transactions ever)
            quarterlyIncomeSpan.textContent = (0.00).toFixed(2);
            quarterlyExpensesSpan.textContent = (0.00).toFixed(2);
            quarterlySavingsSpan.textContent = (0.00).toFixed(2);
            renderQuarterlyCharts([], null, null); // Render empty charts
            return;
        }

        const [yearStr, quarterStr] = selectedValue.split('-');
        const year = parseInt(yearStr);
        const quarter = parseInt(quarterStr.replace('Q', ''));

        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 2; // Inclusive

        const quarterTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === year &&
                   date.getMonth() >= startMonth &&
                   date.getMonth() <= endMonth;
        });

        const totalIncome = quarterTransactions.filter(t => t.type === 'income')
                                               .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = quarterTransactions.filter(t => t.type === 'expense')
                                                 .reduce((sum, t) => sum + t.amount, 0);
        const netSavings = totalIncome - totalExpenses;

        quarterlyIncomeSpan.textContent = totalIncome.toFixed(2);
        quarterlyExpensesSpan.textContent = totalExpenses.toFixed(2);
        quarterlySavingsSpan.textContent = netSavings.toFixed(2);

        renderQuarterlyCharts(quarterTransactions, year, quarter);
    }

    function renderQuarterlyCharts(data, year, quarter) {
        // Chart 1: Expense Distribution by Category
        const expenseCategories = {};
        data.filter(t => t.type === 'expense').forEach(t => {
            const category = t.category || 'Uncategorized';
            expenseCategories[category] = (expenseCategories[category] || 0) + t.amount;
        });

        const expenseChartCtx = document.getElementById('quarterlyExpenseChart').getContext('2d');
        if (quarterlyExpenseChart) {
            quarterlyExpenseChart.destroy();
        }
        quarterlyExpenseChart = new Chart(expenseChartCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(expenseCategories),
                datasets: [{
                    data: Object.values(expenseCategories),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9900', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: year && quarter ? `Expense Distribution for ${year} Q${quarter}` : 'Expense Distribution'
                    }
                }
            }
        });

        // Chart 2: Income vs. Expense Trend (Monthly within the quarter)
        const trendData = {};
        if (year && quarter) {
            for (let i = 0; i < 3; i++) {
                const monthIndex = ((quarter - 1) * 3) + i;
                const tempDate = new Date(2000, monthIndex); // Use fixed year for month name consistency
                const monthName = tempDate.toLocaleDateString('en-US', { month: 'long' });
                trendData[monthName] = { income: 0, expense: 0 };
            }
        }


        data.forEach(t => {
            const date = new Date(t.date);
            const tempDate = new Date(2000, date.getMonth()); // Use fixed year for month name consistency
            const monthName = tempDate.toLocaleDateString('en-US', { month: 'long' });
            if (trendData[monthName]) { // Ensure it falls within the selected quarter's months
                if (t.type === 'income') {
                    trendData[monthName].income += t.amount;
                } else {
                    trendData[monthName].expense += t.amount;
                }
            }
        });

        const trendChartCtx = document.getElementById('quarterlyTrendChart').getContext('2d');
        if (quarterlyTrendChart) {
            quarterlyTrendChart.destroy();
        }
        quarterlyTrendChart = new Chart(trendChartCtx, {
            type: 'line',
            data: {
                labels: Object.keys(trendData),
                datasets: [
                    {
                        label: 'Income',
                        data: Object.values(trendData).map(d => d.income),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Expenses',
                        data: Object.values(trendData).map(d => d.expense),
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: year && quarter ? `Income vs. Expense Trend for ${year} Q${quarter}` : 'Income vs. Expense Trend'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    quarterlySelect.addEventListener('change', updateQuarterlyReport);


    // --- Calendar View Functions ---

    function renderCalendar() {
        calendarBody.innerHTML = '';
        currentMonthYearHeader.textContent = `${getMonthName(currentMonth)} ${currentYear}`;

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); // Last day of current month

        let date = 1;
        for (let i = 0; i < 6; i++) { // Max 6 weeks in a month view
            const row = calendarBody.insertRow();
            for (let j = 0; j < 7; j++) {
                const cell = row.insertCell();

                if (i === 0 && j < firstDayOfMonth) {
                    // Empty cells before the first day of the month
                    cell.classList.add('bg-light');
                } else if (date > daysInMonth) {
                    // Empty cells after the last day of the month
                    cell.classList.add('bg-light');
                } else {
                    const fullDate = new Date(currentYear, currentMonth, date);
                    const formattedDate = fullDate.toISOString().split('T')[0]; // YYYY-MM-DD

                    cell.innerHTML = `<span class="calendar-day-number">${date}</span><div class="calendar-day-content"></div>`;
                    cell.dataset.date = formattedDate;
                    cell.classList.add('calendar-day');

                    // Highlight today
                    const today = new Date();
                    if (fullDate.getDate() === today.getDate() &&
                        fullDate.getMonth() === today.getMonth() &&
                        fullDate.getFullYear() === today.getFullYear()) {
                        cell.classList.add('today');
                    }

                    // Add click listener for day view
                    cell.addEventListener('click', () => showDayView(formattedDate));

                    // Add transaction summaries
                    const dayTransactions = transactions.filter(t => t.date === formattedDate);
                    const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                    const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

                    const contentDiv = cell.querySelector('.calendar-day-content');
                    if (dayTransactions.length > 0) {
                        contentDiv.innerHTML += `<div class="income">In: $${dayIncome.toFixed(2)}</div>`;
                        contentDiv.innerHTML += `<div class="expense">Exp: $${dayExpense.toFixed(2)}</div>`;
                        cell.classList.add('has-transactions');
                    }

                    date++;
                }
            }
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    // --- Day View Functions ---

    function showDayView(dateString) {
        selectedDayForDayView = dateString;
        selectedDayDisplay.textContent = formatDate(dateString);
        renderDayView(dateString);

        // Programmatically switch to Day View tab by triggering a click
        const dayViewTabElement = document.getElementById('day-view-tab');
        if (dayViewTabElement) {
            dayViewTabElement.click(); // Simulate a click on the tab link
        } else {
            console.error("Day View Tab element not found! Cannot switch to Day View.");
        }
    }

    function renderDayView(dateString) {
        dayTransactionsTableBody.innerHTML = '';
        const dayTransactions = transactions.filter(t => t.date === dateString);

        const totalDayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalDayExpenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        daySummary.textContent = `Total Income: $${totalDayIncome.toFixed(2)} | Total Expenses: $${totalDayExpenses.toFixed(2)}`;

        if (dayTransactions.length === 0) {
            const row = dayTransactionsTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = 'No transactions for this day.';
            cell.classList.add('text-center', 'text-muted', 'py-3');
            return;
        }

        dayTransactions.forEach(t => {
            const row = dayTransactionsTableBody.insertRow();
            row.insertCell().textContent = new Date(t.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // Use hour12: false for 24-hour
            row.insertCell().textContent = t.description;
            row.insertCell().textContent = `$${t.amount.toFixed(2)}`;
            row.insertCell().textContent = t.type.charAt(0).toUpperCase() + t.type.slice(1);
            row.insertCell().textContent = t.category || '-';

            const actionsCell = row.insertCell();
            const editBtn = document.createElement('button');
            editBtn.classList.add('btn', 'btn-sm', 'btn-info', 'me-2');
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => {
                editTransaction(t.id);
            };
            actionsCell.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteTransaction(t.id);
            actionsCell.appendChild(deleteBtn);
        });
    }


    // --- Event Listeners for Tab Switching (The Key Fix) ---

    // Monthly Budget Tab
    if (monthlyBudgetTabPane) {
        monthlyBudgetTabPane.addEventListener('shown.bs.tab', () => {
            console.log('Monthly Budget tab shown. Updating display...');
            updateMonthlyBudgetDisplay();
        });
    }

    // Expenses Tab
    if (expensesTabPane) {
        expensesTabPane.addEventListener('shown.bs.tab', () => {
            console.log('Expenses tab shown. Rendering transactions...');
            renderTransactions();
        });
    }

    // Quarterly Report Tab
    if (quarterlyTabPane) {
        quarterlyTabPane.addEventListener('shown.bs.tab', () => {
            console.log('Quarterly Report tab shown. Populating select and updating report...');
            populateQuarterSelect(); // This will also call updateQuarterlyReport()
        });
    }

    // Calendar View Tab
    if (calendarTabPane) {
        calendarTabPane.addEventListener('shown.bs.tab', () => {
            console.log('Calendar View tab shown. Rendering calendar...');
            renderCalendar();
        });
    }

    // Day View Tab (only needs to render if a day has been selected)
    if (dayViewTabPane) {
        dayViewTabPane.addEventListener('shown.bs.tab', () => {
            console.log('Day View tab shown.');
            if (selectedDayForDayView) {
                renderDayView(selectedDayForDayView);
            } else {
                // If no day is selected yet, maybe default to today or show a message
                selectedDayForDayView = new Date().toISOString().split('T')[0]; // Default to today
                selectedDayDisplay.textContent = formatDate(selectedDayForDayView);
                renderDayView(selectedDayForDayView);
            }
        });
    }


    // --- Other Event Listeners and Initial Load ---
    transactionForm.addEventListener('submit', addOrUpdateTransaction);

    // Initial render calls for the *default active tab* and global elements
    // Only call rendering for the tab that is active on page load
    updateMonthlyBudgetDisplay(); // Always update this as it's global budget info
    renderTransactions(); // Call for initial "Expenses & Income" tab if it were default.
                          // It's not default, so it will be called by 'shown.bs.tab'

    // Since 'Monthly Budget' is the initial active tab:
    // Its content (updateMonthlyBudgetDisplay) is already handled by the initial `updateMonthlyBudgetDisplay()`
    // and its `shown.bs.tab` listener will ensure it's updated on subsequent visits.
    // No explicit call needed here for the other tabs, as their `shown.bs.tab` listeners will handle them.

    // Set today's date as default for transaction date input on initial load
    transactionDateInput.valueAsDate = new
