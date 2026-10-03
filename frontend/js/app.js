// Expense Tracker - frontend logic

// PHASE 2
// Your backend from Phase 1 is already running, with real expenses in the
// database (from schema.sql). Build this page directly against it with
// fetch and async/await - there is no in-memory or localStorage stage
// this time, and no sample data file.
//
// A possible structure (change it if you have a better idea):
//   - async function getExpenses()          fetch(API_URL), return the JSON
//   - async function addExpense(data)       fetch(API_URL, { method: "POST", ... })
//   - async function updateExpense(id,data) fetch(API_URL + "/" + id, { method: "PUT", ... })
//   - async function deleteExpense(id)      fetch(API_URL + "/" + id, { method: "DELETE" })
//   - async function refresh()              get the list, then call renderTable and renderSummary
//   - renderTable(list)                     build the table rows from the array the API returned
//   - renderSummary(list)                   update the summary cards
//   - applyFilter()                         re-render with the list filtered by category
//
// Don't forget:
//   - Show a Bootstrap spinner while a request is in flight.
//   - Wrap every fetch call in try/catch, and show a Bootstrap alert on failure.
//   - After add, edit, or delete, call refresh() so the page always shows
//     what the server actually saved - never update the table by hand.
//   - The API is at http://localhost:3000/api/expenses (see the Roadmap).



// Base API configuration and global state for local filtering
const API_URL = "http://localhost:3000/api/expenses";
let allExpenses = []; 

// -------------------------------------------------------------
// 1. UI Helpers
// -------------------------------------------------------------

function showSpinner() {
  if (!document.getElementById('loading-spinner')) {
    const spinnerHtml = `
      <div id="loading-spinner" class="position-fixed top-50 start-50 translate-middle" style="z-index: 1055;">
        <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', spinnerHtml);
  }
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.remove();
}

function showAlert(message, type = "danger") {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index: 1060;" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', alertHtml);
  
  // Auto-remove alert after 4 seconds
  setTimeout(() => {
    const alertElement = document.querySelector('.alert');
    if (alertElement) alertElement.remove();
  }, 4000);
}

// -------------------------------------------------------------
// 2. Form Validation
// -------------------------------------------------------------

function validateFormInputs(titleId, amountId, categoryId, dateId) {
  let isValid = true;

  const titleInput = document.getElementById(titleId);
  const amountInput = document.getElementById(amountId);
  const categoryInput = document.getElementById(categoryId);
  const dateInput = document.getElementById(dateId);

  const showError = (input, message) => {
    input.classList.add('is-invalid');
    input.nextElementSibling.textContent = message;
    isValid = false;
  };

  const clearError = (input) => {
    input.classList.remove('is-invalid');
    input.nextElementSibling.textContent = '';
  };

  // Reset UI before validation
  clearError(titleInput);
  clearError(amountInput);
  clearError(categoryInput);
  clearError(dateInput);

  if (!titleInput.value.trim()) showError(titleInput, "Title is required.");
  
  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount <= 0) showError(amountInput, "Amount must be greater than 0.");
  
  if (!categoryInput.value) showError(categoryInput, "Please select a category.");
  
  if (!dateInput.value) showError(dateInput, "Date is required.");

  return isValid; 
}

function clearAllValidationErrors(inputsArray) {
  inputsArray.forEach(id => {
    const input = document.getElementById(id);
    if(input) {
      input.classList.remove('is-invalid');
      if (input.nextElementSibling) input.nextElementSibling.textContent = '';
    }
  });
}

// -------------------------------------------------------------
// 3. API Services (CRUD)
// -------------------------------------------------------------

async function getExpenses() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error("Failed to fetch expenses");
  return await response.json();
}

async function addExpense(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to add expense");
  return await response.json();
}

async function updateExpense(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update expense");
  return await response.json();
}

async function deleteExpense(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete expense");
  return await response.json();
}

// -------------------------------------------------------------
// 4. Core Logic & Rendering
// -------------------------------------------------------------

async function refresh() {
  showSpinner();
  try {
    allExpenses = await getExpenses();
    applyFilter(); 
  } catch (error) {
    showAlert("Error: Could not load data from the server.");
    console.error(error);
  } finally {
    hideSpinner();
  }
}

function applyFilter() {
  const selectedCategory = document.getElementById('filter-category').value;
  let filteredList = allExpenses;
  
  if (selectedCategory !== "All") {
    filteredList = allExpenses.filter(exp => exp.category === selectedCategory);
  }

  renderSummary(filteredList);
  renderTable(filteredList);
}

function renderSummary(list) {
  const total = list.reduce((sum, item) => sum + item.amount, 0);
  const count = list.length;
  
  let highest = 0;
  let highestTitle = "-";
  
  if (list.length > 0) {
    const highestExpenseObj = list.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
    highest = highestExpenseObj.amount;
    highestTitle = highestExpenseObj.title;
  }

  document.getElementById('total-amount').textContent = total.toFixed(2);
  document.getElementById('expenses-count').textContent = count;
  document.getElementById('highest-expense').textContent = highest.toFixed(2);
  document.getElementById('highest-expense-title').textContent = highestTitle;
}

function renderTable(list) {
  const tbody = document.getElementById('expenses-tbody');
  tbody.innerHTML = ""; 

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No expenses found.</td></tr>`;
    return;
  }

  list.forEach(expense => {
    let badgeColor = "bg-secondary";
    if (expense.category === "Food") badgeColor = "bg-success";
    if (expense.category === "Transport") badgeColor = "bg-primary";
    if (expense.category === "Bills") badgeColor = "bg-warning text-dark";
    if (expense.category === "Entertainment") badgeColor = "bg-info text-dark";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${expense.title}</td>
      <td class="fw-bold">${expense.amount.toFixed(2)}</td>
      <td><span class="badge ${badgeColor}">${expense.category}</span></td>
      <td>${expense.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary me-1" onclick="setupEdit(${expense.id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="handleDelete(${expense.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// 5. Event Controllers
// -------------------------------------------------------------

let editModal;

document.addEventListener("DOMContentLoaded", () => {
  editModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
  refresh();
});

document.getElementById('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validateFormInputs('title-input', 'amount-input', 'category-input', 'date-input')) return; 

  const expenseData = { 
    title: document.getElementById('title-input').value, 
    amount: parseFloat(document.getElementById('amount-input').value), 
    category: document.getElementById('category-input').value, 
    date: document.getElementById('date-input').value 
  };

  showSpinner();
  try {
    await addExpense(expenseData);
    showAlert("Expense added successfully!", "success");
    
    document.getElementById('add-form').reset();
    clearAllValidationErrors(['title-input', 'amount-input', 'category-input', 'date-input']);
    
    await refresh(); 
  } catch (error) {
    showAlert(error.message);
  } finally {
    hideSpinner();
  }
});

// Exposed to window for inline HTML onclick attributes
window.setupEdit = (id) => {
  const expense = allExpenses.find(exp => exp.id === id);
  if (!expense) return;

  clearAllValidationErrors(['edit-title', 'edit-amount', 'edit-category', 'edit-date']);

  document.getElementById('edit-id').value = expense.id;
  document.getElementById('edit-title').value = expense.title;
  document.getElementById('edit-amount').value = expense.amount;
  document.getElementById('edit-category').value = expense.category;
  document.getElementById('edit-date').value = expense.date;

  editModal.show();
};

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateFormInputs('edit-title', 'edit-amount', 'edit-category', 'edit-date')) return; 

  const id = document.getElementById('edit-id').value;
  const updatedData = { 
    title: document.getElementById('edit-title').value, 
    amount: parseFloat(document.getElementById('edit-amount').value), 
    category: document.getElementById('edit-category').value, 
    date: document.getElementById('edit-date').value 
  };

  showSpinner();
  try {
    await updateExpense(id, updatedData);
    showAlert("Expense updated successfully!", "success");
    editModal.hide(); 
    await refresh(); 
  } catch (error) {
    showAlert(error.message);
  } finally {
    hideSpinner();
  }
});

// Exposed to window for inline HTML onclick attributes
window.handleDelete = async (id) => {
  if (!confirm("Are you sure you want to delete this expense?")) return;

  showSpinner();
  try {
    await deleteExpense(id);
    showAlert("Expense deleted successfully!", "success");
    await refresh();
  } catch (error) {
    showAlert(error.message);
  } finally {
    hideSpinner();
  }
};

document.getElementById('filter-category').addEventListener('change', applyFilter);

// -------------------------------------------------------------
// 6. Theme Management
// -------------------------------------------------------------

const themeToggleBtn = document.getElementById('theme-toggle');
const htmlElement = document.documentElement; 

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    themeToggleBtn.textContent = "Light Mode";
    htmlElement.setAttribute('data-bs-theme', 'dark');
  } else {
    themeToggleBtn.textContent = "Dark Mode";
  }
});

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = htmlElement.getAttribute('data-bs-theme');
  
  if (currentTheme === 'dark') {
    themeToggleBtn.textContent = "Dark Mode";
    htmlElement.setAttribute('data-bs-theme', 'light');
    localStorage.setItem('theme', 'light'); 
  } else {
    themeToggleBtn.textContent = "Light Mode";
    htmlElement.setAttribute('data-bs-theme', 'dark');
    localStorage.setItem('theme', 'dark'); 
  }
});