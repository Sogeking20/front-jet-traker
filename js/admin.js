document.addEventListener("DOMContentLoaded", function () {
  // Конфигурация приложения
  const config = {
    currentPlan: getCurrentPlan(), // Получаем текущий тариф
    employees: [], // Массив сотрудников
    // departments: ["IT", "HR", "Finance", "Marketing", "Operations"], // Отделы
    // positions: ["full-time", "part-time", "contractor"], // Типы позиций
    // roles: ["user", "manager", "admin"], // Роли
  };

  // Инициализация приложения
  initApplication();

  // Кнопка добавления сотрудника
  const addEmployeeBtn = document.getElementById("add-employee-btn");
  if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener("click", function () {
      if (!canAddEmployee()) return;
      openModal("employee-modal");
    });
  }

  // Инициализация фильтров
  const departmentFilter = document.getElementById(
    "employee-department-filter"
  );
  const positionFilter = document.getElementById("employee-position-filter");
  const searchInput = document.getElementById("employee-search");

  [departmentFilter, positionFilter, searchInput].forEach((filter) => {
    filter.addEventListener("change", function () {
      filterEmployees();
    });
  });

  searchInput.addEventListener(
    "input",
    debounce(function () {
      filterEmployees();
    }, 300)
  );

  // Обработка формы добавления сотрудника
  const employeeForm = document.getElementById("new-employee-form");
  if (employeeForm) {
    employeeForm.addEventListener("submit", handleFormSubmit);
  }

  const employeeEditForm = document.getElementById("edit-employee-form");
  if (employeeEditForm) {
    employeeEditForm.addEventListener("submit", handleFormEditSubmit);
  }

  const employeeDeleteForm = document.getElementById("delete-employee-form");
  if (employeeDeleteForm) {
    employeeDeleteForm.addEventListener("submit", handleFormDeleteSubmit);
  }

  const paymentAddTypeSelect = document.getElementById(
    "employee-add-payment-type"
  );
  const monthlyAddSalaryGroup = document.getElementById(
    "monthly-salary-add-group"
  );
  const hourlyAddRateGroup = document.getElementById("hourly-rate-add-group");
  const monthlyAddSalaryInput = document.getElementById(
    "employee-add-monthly-salary"
  );
  const hourlyAddRateInput = document.getElementById(
    "employee-add-hourly-rate"
  );

  function updateAddVisibility() {
    const selected = paymentAddTypeSelect.value;

    if (selected === "FLAT_RATE") {
      monthlyAddSalaryGroup.style.display = "block";
      hourlyAddRateGroup.style.display = "none";

      monthlyAddSalaryInput.required = true;
      hourlyAddRateInput.required = false;
      hourlyAddRateInput.value = "";
    } else if (selected === "HOURLY_RATE") {
      hourlyAddRateGroup.style.display = "block";
      monthlyAddSalaryGroup.style.display = "none";

      hourlyAddRateInput.required = true;
      monthlyAddSalaryInput.required = false;
      monthlyAddSalaryInput.value = "";
    }
  }

  paymentAddTypeSelect.addEventListener("change", updateAddVisibility);

  const paymentTypeSelect = document.getElementById(
    "employee-edit-payment-type"
  );
  const monthlySalaryGroup = document.getElementById("monthly-salary-group");
  const hourlyRateGroup = document.getElementById("hourly-rate-group");
  const monthlySalaryInput = document.getElementById(
    "employee-edit-monthly-salary"
  );
  const hourlyRateInput = document.getElementById("employee-edit-hourly-rate");

  function updateVisibility() {
    const selected = paymentTypeSelect.value;

    if (selected === "FLAT_RATE") {
      monthlySalaryGroup.style.display = "block";
      hourlyRateGroup.style.display = "none";

      monthlySalaryInput.required = true;
      hourlyRateInput.required = false;
      hourlyRateInput.value = "";
    } else if (selected === "HOURLY_RATE") {
      hourlyRateGroup.style.display = "block";
      monthlySalaryGroup.style.display = "none";

      hourlyRateInput.required = true;
      monthlySalaryInput.required = false;
      monthlySalaryInput.value = "";
    }
  }

  paymentTypeSelect.addEventListener("change", updateVisibility);

  // // Инициализация при загрузке
  // window.addEventListener("DOMContentLoaded", updateVisibility);
  window.addEventListener("DOMContentLoaded", updateAddVisibility);
  // Функции приложения
  function initApplication() {
    checkRole();
    loadEmployees();
    // renderEmployeeTable();
    initFilters();
  }

  async function checkRole() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch("http://localhost:3000/api/user/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userData = await response.json();
      if (userData.user.role !== "MANAGER" && userData.user.role !== "BOSS") {
        window.location.href = "/dashboard";
      }
    } catch (e) {
      window.location.href = "/dashboard";
    }
  }

  async function loadEmployees() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch("http://localhost:3000/api/employee", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const savedEmployees = await response.json();
      console.log(savedEmployees);
      if (savedEmployees) {
        config.employees = savedEmployees;
      }

      renderEmployeeTable();
    } catch (e) {
      console.error("Error loading employees:", e);
    }
  }

  function saveEmployees() {
    try {
      localStorage.setItem("employees", JSON.stringify(config.employees));
    } catch (e) {
      console.error("Error saving employees:", e);
    }
  }

  function getCurrentPlan() {
    // В реальном приложении это могло бы приходить с сервера
    return {
      name: "basic",
      limit: 10,
      features: [],
    };
  }

  function getEmployeeCount() {
    return config.employees.length;
  }

  function canAddEmployee() {
    if (getEmployeeCount() >= config.currentPlan.limit) {
      showLimitModal();
      return false;
    }
    return true;
  }

  function showLimitModal() {
    const modal = document.createElement("div");
    modal.className = "upgrade-modal";
    modal.innerHTML = `
            <div class="upgrade-modal-content">
                <h3>Достигнут лимит сотрудников</h3>
                <p>Ваш текущий тариф позволяет иметь только ${config.currentPlan.limit} сотрудников.</p>
                <p>Перейдите на более высокий тариф, чтобы добавить больше сотрудников.</p>
                <div class="modal-actions">
                    <a href="subscription.html" class="btn btn--primary">Перейти к подписке</a>
                    <button class="btn btn--outline close-modal">Отмена</button>
                </div>
            </div>
        `;

    modal.querySelector(".close-modal").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    document.body.appendChild(modal);
  }

  function initFilters() {
    // Заполняем фильтры отделами
    // populateSelect(departmentFilter, config.departments);
    // Заполняем фильтры позициями
    // populateSelect(positionFilter, config.positions);
  }

  function populateSelect(selectElement, options) {
    selectElement.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Все";
    selectElement.appendChild(allOption);

    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option;
      optElement.textContent = option;
      selectElement.appendChild(optElement);
    });
  }

  function initFormFields() {
    const positionSelect = document.getElementById("employee-position");
    const hourlyRateField = document.getElementById("employee-hourly-rate");
    const monthlySalaryField = document.getElementById(
      "employee-monthly-salary"
    );
    const departmentSelect = document.getElementById("employee-department");
    const roleSelect = document.getElementById("employee-role");

    // Заполняем поля формы
    // populateSelect(departmentSelect, config.departments);
    // populateSelect(roleSelect, config.roles);

    positionSelect.addEventListener("change", function () {
      if (this.value === "part-time") {
        hourlyRateField.closest(".form-group").style.display = "block";
        monthlySalaryField.closest(".form-group").style.display = "none";
      } else {
        hourlyRateField.closest(".form-group").style.display = "none";
        monthlySalaryField.closest(".form-group").style.display = "block";
      }
    });

    // Инициализация полей зарплаты
    positionSelect.dispatchEvent(new Event("change"));
  }

  const submitAddButton = document.getElementById("submit-add-employee");
  const submitEditButton = document.getElementById("submit-edit-employee");
  const submitDeleteButton = document.getElementById("submit-delete-employee");

  async function handleFormSubmit(e) {
    e.preventDefault();

    submitAddButton.disabled = true;
    submitAddButton.textContent = "Добавляем...";

    const form = e.target;
    const formData = new FormData(form);
    const paymentType = form["employee-add-payment-type"].value;

    const employee = {
      email: form["employee-email"].value.trim(),
      post: form["employee-position"].value,
      subunit: form["employee-department"].value,
      role: form["employee-role"].value,
      paymentType,
    };

    if (paymentType === "FLAT_RATE") {
      employee.salary = Number(form["employee-add-monthly-salary"].value);
    } else if (paymentType === "HOURLY_RATE") {
      employee.hourlyRate = Number(form["employee-add-hourly-rate"].value);
    }

    console.log(JSON.stringify(employee));

    const token = localStorage.getItem("accessToken");

    const response = await fetch("http://localhost:3000/api/employee", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(employee),
    });

    submitAddButton.disabled = false;
    submitAddButton.textContent = "Добавить";
    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    const employeeData = await response.json();

    console.log(employeeData);

    showNotification("Сотрудник успешно добавлен!", "success");
    config.employees.push(employeeData);
    renderEmployeeTable();
    closeModal("employee-modal");
    form.reset();
  }

  async function handleFormEditSubmit(e) {
    console.log("1");
    e.preventDefault();

    submitEditButton.disabled = true;
    submitEditButton.textContent = "Сохраняем...";

    const form = e.target;
    const formData = new FormData(form);
    const paymentType = form["employee-edit-payment-type"].value;
    const employee = {
      email: form["employee-edit-email"].value.trim(),
      post: form["employee-edit-position"].value,
      subunit: form["employee-edit-department"].value,
      role: form["employee-edit-role"].value,
      paymentType,
    };

    if (paymentType === "FLAT_RATE") {
      employee.salary = Number(form["employee-edit-monthly-salary"].value);
    } else if (paymentType === "HOURLY_RATE") {
      employee.hourlyRate = Number(form["employee-edit-hourly-rate"].value);
    }

    console.log(JSON.stringify(employee));

    const token = localStorage.getItem("accessToken");

    const response = await fetch("http://localhost:3000/api/employee", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(employee),
    });

    submitAddButton.disabled = false;
    submitAddButton.textContent = "Обновить";

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    console.log("kaif");

    const index = config.employees.findIndex(
      (emp) => emp.email === employee.email
    );

    if (index !== -1) {
      config.employees[index] = employee;
    }
    showNotification("Сотрудник успешно изменён!", "success");
    renderEmployeeTable();
    closeModal("employee-edit-modal");
    form.reset();
  }

  async function handleFormDeleteSubmit(e) {
    e.preventDefault();

    submitDeleteButton.disabled = true;
    submitDeleteButton.textContent = "Удаляем...";

    const form = e.target;
    const employee = {
      email: form["employee-delete-email"].value.trim(),
    };

    console.log(JSON.stringify(employee));

    const token = localStorage.getItem("accessToken");

    const response = await fetch("http://localhost:3000/api/employee", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(employee),
    });

    submitDeleteButton.disabled = false;
    submitDeleteButton.textContent = "Удалить";

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    config.employees = config.employees.filter(
      (emp) => emp.email !== employee.email
    );

    showNotification("Сотрудник успешно удален!", "success");
    renderEmployeeTable();
    closeModal("employee-delete-modal");
    form.reset();
  }

  function validateEmployee(employee) {
    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employee.email)) {
      showNotification("Пожалуйста, введите корректный email", "error");
      return false;
    }

    // Проверка обязательных полей
    if (!employee.name || !employee.department || !employee.position) {
      showNotification("Пожалуйста, заполните все обязательные поля", "error");
      return false;
    }

    // Проверка зарплаты в зависимости от типа позиции
    if (employee.position === "part-time" && !employee.hourlyRate) {
      showNotification("Пожалуйста, укажите почасовую ставку", "error");
      return false;
    }

    if (employee.position !== "part-time" && !employee.monthlySalary) {
      showNotification("Пожалуйста, укажите месячную зарплату", "error");
      return false;
    }

    return true;
  }

  function filterEmployees() {
    const department = departmentFilter.value;
    const position = positionFilter.value;
    const searchQuery = searchInput.value.toLowerCase();

    const filtered = config.employees.filter((employee) => {
      // Фильтрация по отделу
      if (department && employee.department !== department) return false;

      // Фильтрация по позиции
      if (position && employee.position !== position) return false;

      // Поиск по имени или email
      if (
        searchQuery &&
        !employee.name.toLowerCase().includes(searchQuery) &&
        !employee.email.toLowerCase().includes(searchQuery)
      ) {
        return false;
      }

      return true;
    });

    renderEmployeeTable(filtered);
  }

  function renderEmployeeTable(employees = config.employees) {
    const tableBody = document.querySelector("#employees-table");
    if (!tableBody) return;
    console.log("1", employees);

    tableBody.innerHTML = "";

    if (employees.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `<td colspan="7" class="text-center">Сотрудники не найдены</td>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    employees.forEach((employee) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>
                  <div class="employee-cell">
                    <img
                      src="assets/avatar-placeholder.png"
                      alt="${employee.name}"
                      class="employee-avatar"
                    />
                    <span>${employee.name}</span>
                  </div>
                </td>
                <td>${employee.post}</td>
                <td>${employee.subunit}</td>
                <td>${employee.role}</td>
                <td>${employee.salary}</td>
                <td class="btn-block">
                  <button data-id="${employee.id}" id="edit-employee" class="btn btn--sm btn--outline">
                    Редактировать
                  </button>
                  <button data-id="${employee.id}" id="delete-employee" class="btn btn--sm btn--danger">Удалить</button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    // Добавляем обработчики для кнопок редактирования и удаления
    document.querySelectorAll("#edit-employee").forEach((btn) => {
      btn.addEventListener("click", handleEditEmployee);
    });

    document.querySelectorAll("#delete-employee").forEach((btn) => {
      btn.addEventListener("click", handleDeleteEmployee);
    });
  }

  function handleEditEmployee(e) {
    const employeeId = parseInt(e.currentTarget.dataset.id);
    const employee = config.employees.find((emp) => emp.id === employeeId);

    if (!employee) {
      showNotification("Сотрудник не найден", "error");
      return;
    }

    // Заполняем форму данными сотрудника
    document.getElementById("employee-edit-email").value = employee.email;
    document.getElementById("employee-edit-position").value = employee.post;
    document.getElementById("employee-edit-department").value =
      employee.subunit;
    document.getElementById("employee-edit-role").value = employee.role;
    document.getElementById("employee-edit-payment-type").value =
      employee.paymentType;
    updateVisibility();
    document.getElementById("employee-edit-monthly-salary").value =
      employee.salary;
    document.getElementById("employee-edit-hourly-rate").value =
      employee.hourlyRate;

    // if (employee.position === "part-time") {
    //   document.getElementById("employee-hourly-rate").value =
    //     employee.hourlyRate;
    // } else {
    //   document.getElementById("employee-monthly-salary").value =
    //     employee.monthlySalary;
    // }

    // Обновляем форму для редактирования
    const form = document.getElementById("edit-employee-form");
    form.dataset.editId = employeeId;

    openModal("employee-edit-modal");
  }

  function handleDeleteEmployee(e) {
    const employeeId = parseInt(e.currentTarget.dataset.id);
    const employee = config.employees.find((emp) => emp.id === employeeId);

    if (!employee) {
      showNotification("Сотрудник не найден", "error");
      return;
    }

    // Заполняем форму данными сотрудника
    document.getElementById("employee-delete-email").value = employee.email;

    const form = document.getElementById("edit-employee-form");
    form.dataset.editId = employeeId;
    openModal("employee-delete-modal");

    // const employeeId = parseInt(e.currentTarget.dataset.id);
    // config.employees = config.employees.filter((emp) => emp.id !== employeeId);
    // saveEmployees();
    // renderEmployeeTable();

    // showNotification("Сотрудник успешно удален", "success");
  }

  // Вспомогательные функции
  function formatPosition(position) {
    const positionsMap = {
      "full-time": "Полная занятость",
      "part-time": "Частичная занятость",
      contractor: "Подрядчик",
    };
    return positionsMap[position] || position;
  }

  function formatSalary(employee) {
    if (employee.position === "part-time") {
      return `${employee.hourlyRate} ₽/час`;
    }
    return `${employee.monthlySalary} ₽/мес`;
  }

  function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  }

  function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("notification--fade-out");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  // Функции для работы с модальными окнами (должны быть определены в другом месте)
  function openModal(id) {
    // Реализация открытия модального окна
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = "block";
      modal.classList.add("active");
    }
  }

  function closeModal(id) {
    // Реализация закрытия модального окна
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");
    }
  }
});
