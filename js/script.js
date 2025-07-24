$(document).ready(function () {
    let expenses = [];

    // Add another payer input
    $('#addPayerBtn').on('click', function () {
        $('#payersList').append(`
            <div class="input-group mb-2">
                <input type="text" class="form-control payer-name" placeholder="Name">
                <input type="number" class="form-control payer-amount" placeholder="Amount" min="0" step="0.01">
            </div>
        `);
    });

    // Add expense
    $('#expenseForm').on('submit', function (e) {
        e.preventDefault();
        const item = $('#item').val().trim();
        // Normalize participant names to lowercase and trim
        const participants = $('#participants').val()
            .split(',')
            .map(name => name.trim().toLowerCase())
            .filter(Boolean);

        // Collect payers and amounts, normalize names to lowercase
        let payers = [];
        $('#payersList .input-group').each(function () {
            const name = $(this).find('.payer-name').val().trim().toLowerCase();
            const amt = parseFloat($(this).find('.payer-amount').val());
            if (name && !isNaN(amt) && amt > 0) {
                payers.push({ name, amount: amt });
            }
        });

        const totalAmount = payers.reduce((sum, p) => sum + p.amount, 0);

        if (!item || !participants.length || payers.length === 0 || totalAmount <= 0) {
            alert('Please fill all fields correctly.');
            return;
        }

        expenses.push({ payers, totalAmount, item, participants });
        $('#expenseForm')[0].reset();
        $('#payersList').html(`
            <div class="input-group mb-2">
                <input type="text" class="form-control payer-name" placeholder="Name">
                <input type="number" class="form-control payer-amount" placeholder="Amount" min="0" step="0.01">
            </div>
        `);
        renderExpenses();
    });

    // Render expenses
    function renderExpenses() {
        const $list = $('#expensesList');
        $list.empty();
        expenses.forEach((exp, idx) => {
            let payersStr = exp.payers
                .map(p => `<strong>${capitalize(p.name)}</strong> paid <strong>₹${p.amount.toFixed(2)}</strong>`)
                .join(', ');
            $list.append(`
                <div class="card p-2 mb-2" style="border-left: 6px solid #F5A04E;">
                    <div>
                        ${payersStr} for <strong>${exp.item}</strong>
                        <br><small>For: ${exp.participants.map(capitalize).join(', ')}</small>
                    </div>
                    <button class="btn btn-sm btn-warning mt-2 edit-expense-btn" data-idx="${idx}">Edit</button>
                </div>
            `);
        });
    }

    // Capitalize helper
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Edit button click handler
    $(document).on('click', '.edit-expense-btn', function () {
        const idx = $(this).data('idx');
        const exp = expenses[idx];
        $('#editItem').val(exp.item);
        $('#editParticipants').val(exp.participants.map(capitalize).join(', '));
        // Populate payers
        let payersHtml = '';
        exp.payers.forEach(p => {
            payersHtml += `
                <div class="input-group mb-2">
                    <input type="text" class="form-control edit-payer-name" value="${capitalize(p.name)}">
                    <input type="number" class="form-control edit-payer-amount" value="${p.amount}" min="0" step="0.01">
                </div>
            `;
        });
        $('#editPayersList').html(payersHtml);
        $('#editExpenseModal').modal('show');
        $('#editExpenseForm').data('idx', idx);
    });

    // Add another payer in edit modal
    $('#editAddPayerBtn').on('click', function () {
        $('#editPayersList').append(`
            <div class="input-group mb-2">
                <input type="text" class="form-control edit-payer-name" placeholder="Name">
                <input type="number" class="form-control edit-payer-amount" placeholder="Amount" min="0" step="0.01">
            </div>
        `);
    });

    // Save changes in edit modal
    $('#editExpenseForm').on('submit', function (e) {
        e.preventDefault();
        const idx = $(this).data('idx');
        const item = $('#editItem').val().trim();
        const participants = $('#editParticipants').val()
            .split(',')
            .map(name => name.trim().toLowerCase())
            .filter(Boolean);
        let payers = [];
        $('#editPayersList .input-group').each(function () {
            const name = $(this).find('.edit-payer-name').val().trim().toLowerCase();
            const amt = parseFloat($(this).find('.edit-payer-amount').val());
            if (name && !isNaN(amt) && amt > 0) {
                payers.push({ name, amount: amt });
            }
        });
        if (!item || !participants.length || payers.length === 0) {
            alert('Please fill all fields correctly.');
            return;
        }
        expenses[idx] = { payers, totalAmount: payers.reduce((sum, p) => sum + p.amount, 0), item, participants };
        $('#editExpenseModal').modal('hide');
        renderExpenses();
    });

    // Calculate split logic
    $('#calculateBtn').on('click', function () {
        // Collect all unique people (normalized to lowercase)
        let allPeople = new Set();
        expenses.forEach(exp => {
            exp.payers.forEach(p => allPeople.add(p.name));
            exp.participants.forEach(p => allPeople.add(p));
        });
        allPeople = Array.from(allPeople);

        // Track how much each person paid and owes
        let paid = {}, owes = {};
        allPeople.forEach(p => { paid[p] = 0; owes[p] = 0; });

        expenses.forEach(exp => {
            exp.payers.forEach(p => {
                paid[p.name] += p.amount;
            });
            let share = exp.totalAmount / exp.participants.length;
            exp.participants.forEach(p => {
                owes[p] += share;
            });
        });

        // Calculate net balance for each person
        let net = {};
        allPeople.forEach(p => {
            net[p] = paid[p] - owes[p];
        });

        // Prepare results
        let resultHtml = '<h5 class="text-center">Results</h5>';
        resultHtml += '<ul class="list-group mb-3">';
        allPeople.forEach(p => {
            resultHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${capitalize(p)}</span>
                <span>${net[p] >= 0 ? 'Gets' : 'Owes'} ₹${Math.abs(net[p]).toFixed(2)}</span>
            </li>`;
        });
        resultHtml += '</ul>';

        // Simple settlement logic
        let owesArr = [], getsArr = [];
        allPeople.forEach(p => {
            if (net[p] < 0) owesArr.push({ name: p, amount: -net[p] });
            else if (net[p] > 0) getsArr.push({ name: p, amount: net[p] });
        });

        resultHtml += '<h6>Settlement:</h6>';
        let i = 0, j = 0;
        while (i < owesArr.length && j < getsArr.length) {
            let pay = Math.min(owesArr[i].amount, getsArr[j].amount);
            resultHtml += `<div>${capitalize(owesArr[i].name)} pays ₹${pay.toFixed(2)} to ${capitalize(getsArr[j].name)}</div>`;
            owesArr[i].amount -= pay;
            getsArr[j].amount -= pay;
            if (owesArr[i].amount < 0.01) i++;
            if (getsArr[j].amount < 0.01) j++;
        }

        $('#results').html(resultHtml);
    });
});