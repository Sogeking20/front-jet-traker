document.addEventListener("DOMContentLoaded", function () {
  // Инициализация календаря
  const currentMonthElement = document.getElementById("current-month");
  const prevMonthBtn = document.getElementById("prev-month-btn");
  const nextMonthBtn = document.getElementById("next-month-btn");

  let currentDate = new Date();

  const config = {
    schedules: [],
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
    generateHeaderRow();
    loadSchedule();
  }

  function generateHeaderRow() {
    const { year, month } = getQueryParams();

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

  function updateCalendar() {
    const options = { month: "long", year: "numeric" };
    currentMonthElement.textContent = currentDate.toLocaleDateString(
      "ru-RU",
      options
    );

    // Здесь должна быть логика обновления графика смен
    // Для демонстрации просто обновляем дату
  }

  prevMonthBtn.addEventListener("click", function () {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
  });

  nextMonthBtn.addEventListener("click", function () {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
  });

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function fetchSchedule(month, year) {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (year) params.append("year", year);

    const token = localStorage.getItem("accessToken");

    const response = await fetch(
      `http://localhost:3000/api/shift?${params.toString()}`,
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
    const month = getQueryParam("month");
    const year = getQueryParam("year");
    // const container = document.getElementById("scheduleContainer");

    // container.innerHTML = "Загрузка...";

    try {
      const data = await fetchSchedule(month, year);
      console.log(data);
      renderScheduleTable();
    } catch (err) {
      // container.innerHTML = "Ошибка при загрузке данных.";
      console.error(err);
    }
  }

  function renderScheduleTable() {
    const params = new URLSearchParams(window.location.search);
    const year = params.get("year") || new Date().getFullYear();
    const month = params.get("month") || new Date().getMonth() + 1;

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
        const cell = document.createElement("div");
        cell.classList.add("schedule-cell");

        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;
        const shift = employee.schedules.find((s) =>
          s.startTime.startsWith(dateStr)
        );
        if (shift) {
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

  // Инициализация фильтров
  const departmentFilter = document.getElementById("department-filter");
  const employeeFilter = document.getElementById("employee-filter");
  const shiftTypeFilter = document.getElementById("shift-type-filter");

  [departmentFilter, employeeFilter, shiftTypeFilter].forEach((filter) => {
    filter.addEventListener("change", function () {
      // Здесь должна быть логика фильтрации графика
      console.log("Фильтры изменены:", {
        department: departmentFilter.value,
        employee: employeeFilter.value,
        shiftType: shiftTypeFilter.value,
      });
    });
  });

  // Проверка роли пользователя для отображения кнопки добавления смены
  const userRole = localStorage.getItem("jettraker_role");
  if (userRole === "admin" || userRole === "manager") {
    document.getElementById("add-shift-btn").style.display = "block";
  }

  async function loadEmployees() {
    const token = localStorage.getItem("accessToken");

    fetch("http://localhost:3000/api/employee", {
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
        const select = document.getElementById("shift-employee");

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

      if (
        !email ||
        !date ||
        !startTime ||
        !type ||
        (type !== "DAILY" && !endTime)
      ) {
        return alert("Пожалуйста, заполните все поля");
      }

      // Формируем полные даты
      const start = new Date(`${date}T${startTime}`);
      let end;

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
      };

      try {
        const token = localStorage.getItem("accessToken");
        const response = await fetch("http://localhost:3000/api/shift", {
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
        shiftForm.reset();
        endInput.disabled = false; // вернуть обратно для следующих смен
        const user = config.schedules.find((u) => u.id === result.userId);
        console.log(user);
        console.log(user.schedules);
        user.schedules.push(result);
        console.log(result);
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

  // Инициализация календаря
  updateCalendar();
});
