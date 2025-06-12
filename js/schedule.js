document.addEventListener("DOMContentLoaded", function () {
  // Инициализация календаря
  const currentMonthElement = document.getElementById("current-month");
  const prevMonthBtn = document.getElementById("prev-month-btn");
  const nextMonthBtn = document.getElementById("next-month-btn");

  let currentDate = new Date();

  const config = {
    schedules: [],
    employees: [],
    isAdmin: false,
  };

  initApplication();

  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const year = parseInt(params.get("year"), 10);
    const month = parseInt(params.get("month"), 10);
    const today = new Date();

    return {
      year: isNaN(year) ? today.getFullYear() : year,
      month: isNaN(month) ? today.getMonth() + 1 : month, // JS: 0–11, но мы хотим 1–12
    };
  }

  function initApplication() {
    checkRole();
    generateHeaderRow();
    loadSchedule();
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

      console.log(response);

      if (!response.ok) {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }

      const userData = await response.json();
      console.log(userData);
      if (userData.user.role === "MANAGER" || userData.user.role === "BOSS") {
        config.isAdmin = true;
      }
    } catch (e) {
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
  }

  function generateHeaderRow() {
    const year = currentDate.getFullYear() || new Date().getFullYear();
    const month = currentDate.getMonth() + 1 || new Date().getMonth() + 1;

    const container = document.querySelector(".schedule-grid");
    container.innerHTML = ""; // Очищаем

    const headerRow = document.createElement("div");
    headerRow.classList.add("schedule-header-row");

    // Первый заголовок — "Сотрудник"
    const firstCell = document.createElement("div");
    firstCell.classList.add("schedule-header-cell");
    firstCell.textContent = "Сотрудник";
    headerRow.appendChild(firstCell);

    const daysInMonth = new Date(year, month, 0).getDate(); // кол-во дней в месяце
    const weekdayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

    for (let day = 1; day <= 31; day++) {
      const cell = document.createElement("div");
      cell.classList.add("schedule-header-cell");

      if (day <= daysInMonth) {
        const date = new Date(year, month - 1, day); // месяц 0-индексный
        const weekday = weekdayNames[date.getDay()];

        if (weekday === "Сб" || weekday === "Вс") {
          cell.classList.add("weekend");
        }

        cell.innerHTML = `${weekday}<br />${day}`;
      } else {
        // Пустая ячейка для недостающих дней
        cell.classList.add("empty-day");
        cell.innerHTML = "&nbsp;";
      }

      headerRow.appendChild(cell);
    }

    container.appendChild(headerRow);
  }

  const calendarDay = document.getElementById("schedule-grid");
  if (calendarDay) {
    calendarDay.addEventListener("click", handleDayClick);
  }

  function handleDayClick(event) {
    console.log(config.isAdmin);
    if (!config.isAdmin) return;
    const dayElement = event.target.closest(".calendar-day");
    console.log(45);
    if (!dayElement) return;

    const dateStr = dayElement.dataset.date;
    if (!dateStr) return;
    const userId = dayElement.dataset.employee;
    if (!userId) return;

    // Показываем список смен на этот день
    showShiftsForDate(dateStr, userId);
  }

  function getShiftsForDate(date, userId) {
    console.log(userId);
    console.log(config.schedules);
    const index = config.schedules.findIndex(
      (emp) => Number(emp.id) === Number(userId)
    );
    let employee;

    if (index !== -1) {
      employee = config.schedules[index];
    }

    console.log(employee.schedules);
    console.log(employee);

    const shift = employee.schedules.filter((shift) =>
      isSameDay(new Date(shift.startTime), date)
    );

    return { employee, shift };
  }

  function isSameDay(date1, date2) {
    console.log(date1, date2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  function showShiftsForDate(dateStr, userId) {
    const date = new Date(dateStr);
    const { employee, shift } = getShiftsForDate(date, userId);
    const dateModal = new Date(dateStr);
    console.log("ff", dateModal.getDay());

    console.log(1, employee, shift);

    const modalContent = document.getElementById("day-shifts-modal-content");
    if (!modalContent) return;

    modalContent.innerHTML = `
        <h3 class="mb-2">${employee.name} - ${date.toLocaleDateString(
      "ru-RU",
      dateModal.getDate()
    )}</h3>
        ${
          shift.length > 0
            ? `
            <form id="edit-shift-form">
              <div class="form-group">
                <label>
                  Время начала:
                  <input
                    id="edit-start-date"
                    type="time"
                    name="start"
                    required
                  />
                </label>
              </div>
              <div class="form-group">
                <label>
                  Время окончания:
                  <input id="edit-end-date" type="time" name="end" required />
                </label>
              </div>
              <div class="form-group">
                <label>
                  Тип смены:
                  <select name="type" id="edit-shift-type" required>
                    <option value="">Выберите тип</option>
                    <option value="DAY">Дневная</option>
                    <option value="NIGHT">Ночная</option>
                    <option value="DAILY">Суточная</option>
                    <option value="PART_TIME">Парт-тайм</option>
                  </select>
                </label>
              </div>
              ${
                employee.paymentType === "HOURLY_RATE"
                  ? `
                  <div
                    id="edit-hourly-rate-group"
                    class="form-group"
                  >
                    <label for="edit-hourly-rate">Ставка (в час)</label>
                    <input
                      type="number"
                      id="edit-hourly-rate"
                      min="0"
                      step="0.01"
                    />
                  </div>`
                  : ""
              }

              <div class="submit-actions">
                <button id="delete-shift-submit" class="btn">Удалить</button>
                <button
                  id="edit-shift-submit"
                  type="submit"
                  class="btn btn--primary"
                >
                  Сохранить
                </button>
              </div>
            </form>`
            : `<p>У сотрудника ${employee.name} на этот день смены нет</p>`
        }
    `;
    const formatTime = (str) =>
      new Date(str).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

    if (shift.length > 0) {
      document.getElementById("edit-start-date").value = formatTime(
        shift[0].startTime
      );
      document.getElementById("edit-end-date").value = formatTime(
        shift[0].endTime
      );
      document.getElementById("edit-shift-type").value = shift[0].type;
      if (employee.paymentType === "HOURLY_RATE") {
        console.log("222");
        document.getElementById("edit-hourly-rate").value = shift[0].hourlyRate;
      }

      const form = document.getElementById("edit-shift-form");
      form.dataset.editId = shift[0].id;
      form.dataset.date = date.toLocaleDateString("ru-RU", dateModal.getDate());
    }

    const employeeDeleteForm = document.getElementById("delete-shift-submit");
    if (employeeDeleteForm) {
      employeeDeleteForm.dataset.id = shift[0].id;
      employeeDeleteForm.addEventListener("click", handleDeleteShift);
    }

    const employeeEditForm = document.getElementById("edit-shift-form");
    if (employeeEditForm) {
      employeeEditForm.addEventListener("submit", handleEditShift);
    }

    // document.querySelectorAll("#edit-shift-submit").forEach((btn) => {
    //   btn.addEventListener("click", handleEditShift);
    // });

    openModal("day-shifts-modal");
  }

  const employeeEditForm = document.getElementById("edit-shift-form");
  if (employeeEditForm) {
    employeeEditForm.addEventListener("submit", handleEditShift);
  }

  async function handleDeleteShift(e) {
    e.preventDefault();

    const submitEditButton = document.getElementById("delete-shift-submit");

    submitEditButton.disabled = true;
    submitEditButton.textContent = "Удаляем...";

    const form = e.target;
    const shiftId = form.dataset.id;

    const token = localStorage.getItem("accessToken");

    // const response = await fetch(`http://localhost:3000/api/shift/${shiftId}`, {
    const response = await fetch(
      `https://api.jettraker.com/api/shift/${shiftId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    submitEditButton.disabled = false;
    submitEditButton.textContent = "Удалить";

    if (!response.ok) {
      showNotification("Не удалось удалить!", "error");
      throw new Error(response.message || "Ошибка регистрации");
    }

    function findSchedule(userId, scheduleId) {
      const user = config.schedules.find((user) => user.id === userId);
      const userIndex = config.schedules.findIndex(
        (user) => user.id === userId
      );

      if (user) {
        const scheduleIndex = config.schedules[userIndex].schedules.findIndex(
          (schedule) => schedule.id === scheduleId
        );

        return {
          userId: userIndex,
          scheduleId: scheduleIndex,
        };
      }
      return null;
    }

    const schedulesData = await response.json();

    if (schedulesData) {
      const ids = findSchedule(schedulesData.userId, schedulesData.id);

      console.log(ids);

      console.log(config.schedules);
      console.log(config.schedules[ids.userId]);

      config.schedules[ids.userId].schedules.splice(ids.scheduleId, 1);
      // config.schedules[ids.userId].schedules[ids.scheduleId] = schedulesData;
    }

    showNotification("Смена успешно удалена!", "success");
    renderScheduleTable();
    closeModal("day-shifts-modal");
    // form.reset();
  }

  async function handleEditShift(e) {
    console.log("1");
    e.preventDefault();

    const submitEditButton = document.getElementById("edit-shift-submit");

    submitEditButton.disabled = true;
    submitEditButton.textContent = "Сохраняем...";

    const form = e.target;
    const shiftId = form.dataset.editId;
    const date = form.dataset.date;

    const parts = date.split(".");
    const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    const startTime = form["edit-start-date"].value;
    const endTime = form["edit-end-date"].value;
    const type = form["edit-shift-type"].value;
    let hourlyRate = 0;
    if (form["edit-hourly-rate"]) {
      hourlyRate = Number(form["edit-hourly-rate"].value);
    }
    console.log(`${formattedDate}T${startTime}`);

    const start = new Date(`${formattedDate}T${startTime}`);
    let end;

    console.log(formattedDate, start);
    console.log(start, startTime);

    if (type === "DAILY") {
      end = new Date(start);
      end.setHours(end.getHours() + 24);
    } else {
      end = new Date(`${formattedDate}T${endTime}`);
      console.log(formattedDate, endTime);
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
    }

    console.log(start.toISOString());
    console.log(end.toISOString());

    const shift = {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type: form["edit-shift-type"].value,
      hourlyRate,
    };

    console.log(JSON.stringify(shift));

    const token = localStorage.getItem("accessToken");

    // const response = await fetch(`http://localhost:3000/api/shift/${shiftId}`, {
    const response = await fetch(
      `https://api.jettraker.com/api/shift/${shiftId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(shift),
      }
    );

    submitEditButton.disabled = false;
    submitEditButton.textContent = "Сохранить";

    if (!response.ok) {
      console.log(response);
      showNotification("Не удалось обновить!", "error");
      throw new Error(response.message || "Ошибка регистрации");
    }

    function findSchedule(userId, scheduleId) {
      const user = config.schedules.find((user) => user.id === userId);
      const userIndex = config.schedules.findIndex(
        (user) => user.id === userId
      );

      if (user) {
        const scheduleIndex = config.schedules[userIndex].schedules.findIndex(
          (schedule) => schedule.id === scheduleId
        );

        return {
          userId: userIndex,
          scheduleId: scheduleIndex,
        };
      }
      return null;
    }

    const schedulesData = await response.json();

    if (schedulesData) {
      const ids = findSchedule(schedulesData.userId, schedulesData.id);

      console.log(ids);

      console.log(config.schedules);
      console.log(config.schedules[ids.userId]);

      config.schedules[ids.userId].schedules[ids.scheduleId] = schedulesData;
    }

    showNotification("Смена успешно изменена!", "success");
    renderScheduleTable();
    closeModal("day-shifts-modal");
    form.reset();
  }

  function updateCalendar() {
    const options = { month: "long", year: "numeric" };
    currentMonthElement.textContent = currentDate.toLocaleDateString(
      "ru-RU",
      options
    );

    // fetchSchedule(currentDate.getMonth() + 1, currentDate.getFullYear());

    // Здесь должна быть логика обновления графика смен
    // Для демонстрации просто обновляем дату
  }

  async function updateTable() {
    const data = await fetchSchedule(
      currentDate.getMonth() + 1,
      currentDate.getFullYear()
    );
    console.log(data);
    renderScheduleTable();
  }

  prevMonthBtn.addEventListener("click", function () {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
    updateTable();
  });

  nextMonthBtn.addEventListener("click", function () {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
    updateTable();
  });

  document
    .getElementById("department-filter")
    .addEventListener("change", async () => {
      const data = await fetchSchedule(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      console.log(data);
      renderScheduleTable();
    });

  document
    .getElementById("employee-filter")
    .addEventListener("change", async () => {
      const data = await fetchSchedule(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      console.log(data);
      renderScheduleTable();
    });

  document
    .getElementById("shift-type-filter")
    .addEventListener("change", async () => {
      const data = await fetchSchedule(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      console.log(data);
      renderScheduleTable();
    });

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function fetchSchedule(month, year) {
    console.log(month, year);

    const grid = document.querySelector(".schedule-grid");
    generateHeaderRow();
    const row = document.createElement("div");
    row.innerHTML = "Загрузка...";
    grid.appendChild(row);

    const token = localStorage.getItem("accessToken");

    const departmentValue = document.getElementById("department-filter").value;
    const employeeValue = document.getElementById("employee-filter").value;
    const shiftTypeValue = document.getElementById("shift-type-filter").value;

    // Собираем query параметры
    const params = new URLSearchParams();

    if (month && year) {
      params.append("month", month);
      params.append("year", year);
    }

    if (departmentValue !== "all") {
      params.append("subunit", departmentValue); // отправляется как ?subunit=sales
    }

    if (employeeValue === "me") {
      params.append("onlyMine", "true");
    }

    if (shiftTypeValue !== "all") {
      let type = "";
      switch (shiftTypeValue) {
        case "day":
          type = "DAY";
          break;
        case "night":
          type = "NIGHT";
          break;
        case "full-day":
          type = "DAILY";
          break;
        case "part-time":
          type = "PART_TIME";
          break;
      }
      params.append("type", type);
    }

    const response = await fetch(
      `https://api.jettraker.com/api/shift?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Ошибка при загрузке данных");
    }

    const schedules = await response.json();
    if (schedules) {
      config.schedules = schedules;
    }

    return schedules;
  }

  async function loadSchedule() {
    try {
      const data = await fetchSchedule();
      console.log(data);
      renderScheduleTable();
    } catch (err) {
      // container.innerHTML = "Ошибка при загрузке данных.";
      console.error(err);
    }
  }

  function formatDateForAPI(date) {
    const localDate = new Date(date);
    localDate.setDate(localDate.getDate() + 1); // Добавляем один день
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    };
    const formattedDate = localDate.toLocaleDateString("en-CA", options); // Формат ГГГГ-ММ-ДД
    return formattedDate;
  }

  const daysInMonth = getDaysInMonth(currentDate);

  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
  function renderScheduleTable() {
    const params = new URLSearchParams(window.location.search);
    const year = currentDate.getFullYear() || new Date().getFullYear();
    const month = currentDate.getMonth() + 1 || new Date().getMonth() + 1;

    const grid = document.querySelector(".schedule-grid");

    const formatTime = (str) =>
      new Date(str).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

    const isDateInRange = (date, start, end) => {
      const d = new Date(date).setHours(0, 0, 0, 0);
      const s = new Date(start).setHours(0, 0, 0, 0);
      const e = new Date(end).setHours(0, 0, 0, 0);
      return d >= s && d <= e;
    };

    generateHeaderRow();

    config.schedules.forEach((employee) => {
      console.log(employee);
      const row = document.createElement("div");
      row.classList.add("schedule-row");

      // 1. Ячейка с информацией о сотруднике
      const empCell = document.createElement("div");
      empCell.classList.add("schedule-employee-cell");
      empCell.innerHTML = `
        <div class="employee-avatar"><img src="${
          employee.avatarUrl || "assets/avatar-placeholder.png"
        }" alt="${employee.name}" /></div>
        <div class="employee-info">
          <div class="employee-name">${employee.name}</div>
          <div class="employee-position">${employee.post}</div>
        </div>`;
      row.appendChild(empCell);

      // 2. Ячейки по дням месяца
      for (let day = 1; day <= 31; day++) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          day
        );
        const cell = document.createElement("div");
        const daysInMonth = getDaysInMonth(currentDate);
        if (day <= daysInMonth) {
          cell.classList.add("calendar-day");
          cell.dataset.date = formatDateForAPI(date);
          cell.dataset.employee = employee.id;
        }
        cell.classList.add("schedule-cell");

        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;
        const shift = employee.schedules.find((s) =>
          s.startTime.startsWith(dateStr)
        );
        if (shift && day <= daysInMonth) {
          cell.textContent = `${formatTime(shift.startTime)}–${formatTime(
            shift.endTime
          )}`;
          cell.classList.add(
            shift.type === "NIGHT" ? "night-shift" : "day-shift"
          );
        } else {
          const isVacation = employee.vacation?.some((vac) =>
            isDateInRange(dateStr, vac.fromDate, vac.toDate)
          );

          cell.classList.add("schedule-cell");

          if (isVacation) {
            cell.textContent = "Отпуск";
            cell.classList.add("vacation");
          }
        }

        row.appendChild(cell);
      }

      grid.appendChild(row);
    });
  }

  async function loadEmployees() {
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch("https://api.jettraker.com/api/employee", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Ошибка авторизации или запроса");
      }

      const employees = await res.json();
      config.employees = employees; // Сохраняем глобально

      const select = document.getElementById("shift-employee");
      if (!select) return;

      select.innerHTML = `<option value="">Выберите имя</option>`;

      employees.forEach((employee) => {
        const option = document.createElement("option");
        option.value = employee.email; // ключ для идентификации
        option.textContent = employee.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error("Ошибка при загрузке сотрудников:", error);
    }
  }

  document.getElementById("shift-employee").addEventListener("change", (e) => {
    const selectedEmail = e.target.value;
    const selectedEmployee = config.employees.find(
      (emp) => emp.email === selectedEmail
    );

    const rateGroup = document.getElementById("hourly-rate-group");

    if (selectedEmployee && selectedEmployee.paymentType === "HOURLY_RATE") {
      rateGroup.style.display = "block";
    } else {
      rateGroup.style.display = "none";
    }
  });

  // Обработка формы добавления смены
  const shiftForm = document.getElementById("new-shift-form");
  if (shiftForm) {
    const typeSelect = shiftForm.querySelector('[name="type"]');
    const endInput = shiftForm.querySelector('[name="end"]');
    const startInput = shiftForm.querySelector('[name="start"]');

    // Обновляем состояние поля endTime
    typeSelect.addEventListener("change", () => {
      if (typeSelect.value === "DAY_AND_NIGHT") {
        endInput.disabled = true;
      } else {
        endInput.disabled = false;
      }
    });

    loadEmployees();

    const submitButton = document.getElementById("add-shift-submit");

    // Отправка формы
    shiftForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      submitButton.disabled = true;
      submitButton.textContent = "Сохраняем...";

      const email = shiftForm["shift-employee"].value;
      const date = shiftForm["shift-date"].value;
      const startTime = startInput.value;
      let endTime = endInput.value;
      const type = typeSelect.value;
      const hourlyRate = Number(shiftForm["hourly-rate"].value);

      if (
        !email ||
        !date ||
        !startTime ||
        !type ||
        (type !== "DAILY" && !endTime)
      ) {
        return alert("Пожалуйста, заполните все поля");
      }

      console.log(`${date}T${startTime}`);

      // Формируем полные даты
      const start = new Date(`${date}T${startTime}`);
      let end;

      console.log(date, startTime);

      if (type === "DAILY") {
        end = new Date(start);
        end.setHours(end.getHours() + 24);
      } else {
        end = new Date(`${date}T${endTime}`);
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
      }

      const payload = {
        email,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        type,
        hourlyRate,
      };

      console.log(payload);

      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch("https://api.jettraker.com/api/shift", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        submitButton.disabled = false;
        submitButton.textContent = "Сохранить";

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Ошибка");

        // document.getElementById("result").textContent =
        //   "Смена успешно добавлена!";
        showNotification("Смена успешно добавлена!", "success");

        shiftForm.reset();
        endInput.disabled = false; // вернуть обратно для следующих смен
        const user = config.schedules.find((u) => u.id === result.userId);
        user.schedules.push(result);
        renderScheduleTable();
        closeModal("shift-modal");
      } catch (err) {
        // document.getElementById("result").textContent =
        //   "Ошибка: " + err.message;
      }

      // Здесь должна быть логика сохранения смены
      // alert("Смена успешно добавлена!");
      // this.reset();
    });
  }

  // Кнопка добавления смены
  const addShiftBtn = document.getElementById("add-shift-btn");
  if (addShiftBtn) {
    addShiftBtn.addEventListener("click", function () {
      openModal("shift-modal");
    });
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

  // Инициализация календаря
  updateCalendar();
});
