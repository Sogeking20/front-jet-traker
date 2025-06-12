document.addEventListener("DOMContentLoaded", function () {
  const config = {
    vacation: [],
  };

  initApplication();

  function initApplication() {
    checkRole();
    loadVacations();
    loadEmployees();
    // rendervacationTable();
    // initFilters();
  }

  const editVacationForm = document.getElementById("edit-vacation-form");
  if (editVacationForm) {
    editVacationForm.addEventListener("submit", editFormSubmit);
  }

  const addVacationForm = document.getElementById("add-vacation-form");
  if (addVacationForm) {
    addVacationForm.addEventListener("submit", addFormSubmit);
  }

  const deleteVacation = document.getElementById("delete-vacation-btn-submit");
  if (deleteVacation) {
    deleteVacation.addEventListener("click", handleDeleteVacation);
  }

  async function handleDeleteVacation(e) {
    e.preventDefault();

    deleteVacation.disabled = true;
    deleteVacation.textContent = "Удаляем...";

    const form = e.target;

    const id = form.dataset.deleteId;

    const token = localStorage.getItem("accessToken");

    const response = await fetch(
      `http://api.jettraker.com/api/vacation/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    deleteVacation.disabled = false;
    deleteVacation.textContent = "Удалить";

    if (!response.ok) {
      showNotification("Не удалось удалить отпуск!", "error");
      throw new Error(response.message || "Ошибка регистрации");
    }

    vacation = await response.json();

    const index = config.vacation.findIndex((emp) => emp.id === vacation.id);

    if (index !== -1) {
      config.vacation.splice(index, 1);
    }

    showNotification("Успешно удалено!", "success");
    renderVacation();
    closeModal("edit-vacation-modal");
  }

  async function loadEmployees() {
    const token = localStorage.getItem("accessToken");

    fetch("https://api.jettraker.com/api/employee", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Ошибка авторизации или запроса");
        }
        return res.json();
      })
      .then((employees) => {
        const select = document.getElementById("employee-position");

        if (!select) return;

        select.innerHTML = `<option value="">Выберите имя</option>`;

        employees.forEach((employee) => {
          const option = document.createElement("option");
          option.value = employee.email;
          option.textContent = employee.name;
          select.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Ошибка при загрузке сотрудников:", error);
      });
  }
  async function checkRole() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        "https://api.jettraker.com/api/user/profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
      const userData = await response.json();
      if (userData.user.role !== "MANAGER" && userData.user.role !== "BOSS") {
        window.location.href = "/dashboard";
      }
    } catch (e) {
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
  }

  async function loadVacations() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch("https://api.jettraker.com/api/vacation", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const savedVacations = await response.json();
      console.log(savedVacations);
      if (savedVacations) {
        config.vacation = savedVacations;
      }

      renderVacation();
    } catch (e) {
      console.error("Error loading vacations:", e);
    }
  }

  function renderVacation(vacation = config.vacation) {
    console.log(vacation);
    const tableBody = document.querySelector("#vacation-list");
    if (!tableBody) return;
    console.log("1", vacation);

    tableBody.innerHTML = "";

    if (vacation.length === 0) {
      const emptyRow = document.createElement("div");
      emptyRow.innerHTML = `<p class="text-center">Отпуски не найдены</p>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    vacation.forEach((vacation) => {
      const type = vacation.type === "PAID" ? "Оплачиваемый" : "Неоплачиваемый";

      const status =
        vacation.status === "APPROVED"
          ? "Одобрено"
          : vacation.status === "REJECTED"
          ? "Отклонено"
          : "На усмотрении";

      const fromDate = new Date(vacation.fromDate);
      const toDate = new Date(vacation.toDate);

      tableBody.insertAdjacentHTML(
        "beforeend",
        `
                      <tr>
                <td>${vacation.user.name}</td>
                <td>${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}</td>
                <td>14</td>
                <td>${type}</td>
                <td><span class="status-badge approved">${status}</span></td>
                <td>
                  <button id="edit-vacation" data-id="${
                    vacation.id
                  }" class="btn btn--sm btn--outline">Изменить</button>
                </td>
              </tr>
            `
      );
    });
    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll("#edit-vacation").forEach((btn) => {
      btn.addEventListener("click", handleEditVacation);
    });
  }

  const submitEditButton = document.getElementById("submit-edit-vacation");
  const submitAddButton = document.getElementById("add-vacation-btn-submit");

  function handleEditVacation(e) {
    const vacationId = parseInt(e.currentTarget.dataset.id);
    const vacation = config.vacation.find((emp) => emp.id === vacationId);

    if (!vacation) {
      showNotification("Сотрудник не найден", "error");
      return;
    }

    // Заполняем форму данными сотрудника
    document.getElementById("edit-vacation-name").value = vacation.user.name;
    // document.getElementById("edit-vacation-type").value = vacation.type;
    flatpickr("#edit-shift-date", {
      mode: "range",
      dateFormat: "Y-m-d",
      defaultDate: [vacation.fromDate, vacation.toDate],
      locale: {
        rangeSeparator: " до ",
        firstDayOfWeek: 1,
        weekdays: {
          shorthand: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
          longhand: [
            "Воскресенье",
            "Понедельник",
            "Вторник",
            "Среда",
            "Четверг",
            "Пятница",
            "Суббота",
          ],
        },
        months: {
          shorthand: [
            "Янв",
            "Фев",
            "Мар",
            "Апр",
            "Май",
            "Июн",
            "Июл",
            "Авг",
            "Сен",
            "Окт",
            "Ноя",
            "Дек",
          ],
          longhand: [
            "Январь",
            "Февраль",
            "Март",
            "Апрель",
            "Май",
            "Июнь",
            "Июль",
            "Август",
            "Сентябрь",
            "Октябрь",
            "Ноябрь",
            "Декабрь",
          ],
        },
      },
    });
    // Обновляем форму для редактирования
    const form = document.getElementById("edit-vacation-form");
    const button = document.getElementById("delete-vacation-btn-submit");
    form.dataset.editId = vacationId;
    button.dataset.deleteId = vacationId;

    openModal("edit-vacation-modal");
  }

  async function addFormSubmit(e) {
    e.preventDefault();

    submitAddButton.disabled = true;
    submitAddButton.textContent = "Сохраняем...";

    const form = e.target;

    const range = form["shift-date"].value; // "2025-05-13 до 2025-05-21"
    let [fromDate, toDate] = "";

    if (range && range.includes(" до ")) {
      [fromDate, toDate] = range.split(" до ");
    }

    const employee = {
      email: form["employee-position"].value,
      fromDate: fromDate,
      toDate: toDate,
      // type: form["vacation-type"].value,
    };

    console.log(JSON.stringify(employee));

    const token = localStorage.getItem("accessToken");

    const response = await fetch(`https://api.jettraker.com/api/vacation`, {
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
      showNotification("Не удалось добавить!", "error");
      throw new Error(response.message || "Ошибка регистрации");
    }

    vacation = await response.json();

    showNotification("Отпуск успешно добавлен!", "success");
    config.vacation.push(vacation);
    renderVacation();
    closeModal("add-vacation-modal");
  }

  async function editFormSubmit(e) {
    e.preventDefault();

    submitEditButton.disabled = true;
    submitEditButton.textContent = "Сохраняем...";

    const form = e.target;

    const range = form["edit-shift-date"].value; // "2025-05-13 до 2025-05-21"
    let [fromDate, toDate] = "";

    if (range && range.includes(" до ")) {
      [fromDate, toDate] = range.split(" до ");
      console.log(fromDate, toDate);
    }

    const employee = {
      fromDate: fromDate,
      toDate: toDate,
      // type: form["edit-vacation-type"].value,
    };

    console.log(JSON.stringify(employee));

    const token = localStorage.getItem("accessToken");

    const id = parseInt(form.dataset.editId);

    const response = await fetch(
      `https://api.jettraker.com/api/vacation/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(employee),
      }
    );

    submitEditButton.disabled = false;
    submitEditButton.textContent = "Обновить";

    if (!response.ok) {
      showNotification("Не удалось обновить сотрудника!", "error");
      throw new Error(response.message || "Ошибка регистрации");
    }

    vacation = await response.json();

    const index = config.vacation.findIndex((emp) => emp.id === vacation.id);

    if (index !== -1) {
      config.vacation[index] = vacation;
    }

    showNotification("Успешно обновлено!", "success");
    renderVacation();
    closeModal("edit-vacation-modal");
  }

  const addVacationBtn = document.getElementById("add-vacation-btn");
  if (addVacationBtn) {
    addVacationBtn.addEventListener("click", function () {
      openModal("add-vacation-modal");
    });
  }

  function showNotification(message, type, container = document.body) {
    const toast = document.createElement("div");
    toast.className = type === "success" ? "success-toast" : "error-toast";
    toast.innerText = message;

    document.body.appendChild(toast);

    // Удалить плашку через 3 секунды
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "block";
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  }
});
