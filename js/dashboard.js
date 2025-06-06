document.addEventListener("DOMContentLoaded", function () {
  initApplication();

  const config = {
    profile: {},
  };

  function initApplication() {
    checkRole();
    loadProfile();
    // renderEmployeeTable();
    // initFilters();
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
      console.log(userData);
      if (userData.user.role === "EMPLOYEE" && userData.user.companyId) {
        document.getElementById("#create-request-btn").style.display = "inline";
        document
          .getElementById("#create-request-btn")
          .classList.toggle("hidden");
      }
      if (!userData.user.companyId) {
        document.getElementById("#create-company-btn").style.display = "inline";
      }
    } catch (e) {
      // window.location.href = "/";
    }
  }

  const addCompanyBtn = document.getElementById("create-company-btn");
  if (addCompanyBtn) {
    addCompanyBtn.addEventListener("click", function () {
      openModal("company-modal");
    });
  }

  const submitRequestButton = document.getElementById(
    "send-request-btn-submit"
  );
  const submitCompanyButton = document.getElementById(
    "create-company-btn-submit"
  );

  const requestForm = document.getElementById("new-request-form");
  if (requestForm) {
    requestForm.addEventListener("submit", handleFormSubmit);
  }

  const companyForm = document.getElementById("new-company-form");
  if (companyForm) {
    companyForm.addEventListener("submit", handleFormCompanySubmit);
  }

  async function handleFormCompanySubmit(e) {
    e.preventDefault();

    submitCompanyButton.disabled = true;
    submitCompanyButton.textContent = "Создаём...";

    const form = e.target;
    const company = {
      name: form["company-name"].value,
      industry: form["company-industry"].value,
    };

    console.log(JSON.stringify(company));

    const token = localStorage.getItem("accessToken");

    const response = await fetch("http://localhost:3000/api/company", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(company),
    });

    submitCompanyButton.disabled = false;
    submitCompanyButton.textContent = "Создать";

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    // showNotification("Сотрудник успешно добавлен!", "success");
    window.location.href = "/dashboard";
    closeModal("company-modal");
    form.reset();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    submitRequestButton.disabled = true;
    submitRequestButton.textContent = "Отправляем...";

    const form = e.target;
    const request = {
      type: form["request-type"].value.trim(),
      fromDate: form["request-start-date"].value,
      toDate: form["request-end-date"].value,
      reason: form["request-comment"].value,
    };

    console.log(JSON.stringify(request));

    const token = localStorage.getItem("accessToken");

    const response = await fetch("http://localhost:3000/api/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(request),
    });

    submitRequestButton.disabled = false;
    submitRequestButton.textContent = "Отправить";

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    // showNotification("Сотрудник успешно добавлен!", "success");
    closeModal("request-modal");
    form.reset();
  }

  async function loadProfile() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        "http://localhost:3000/api/user/profile/full",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log(data);
      if (data) {
        config.profile = data;
      }

      renderProfile();
    } catch (e) {
      console.error("Error loading employees:", e);
    }
  }

  function renderProfile(profile = config.profile) {
    // Заполнение имени и почты
    document.getElementById("user-name").textContent = profile.user.name;
    document.getElementById("user-position").textContent =
      profile.user.position;
    document.getElementById("user-subunit").textContent = profile.user.subunit;

    const shiftList = document.getElementById("upcoming-shifts");
    shiftList.innerHTML = ""; // очистка

    if (profile.upcomingShifts.length > 0) {
      profile.upcomingShifts.forEach((shift) => {
        const li = document.createElement("li");
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);

        const weekday = start.toLocaleDateString("ru-RU", {
          weekday: "short",
        });
        const dayAndMonth = start.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
        });
        const timeStart = start.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const timeEnd = end.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        shiftList.insertAdjacentHTML(
          "beforeend",
          `
            <div class="upcoming-shift">
              <div class="upcoming-shift__date">${weekday}, ${dayAndMonth}</div>
              <div class="upcoming-shift__type day-shift">Дневная</div>
              <div class="upcoming-shift__time">${timeStart} - ${timeEnd}</div>
            </div>
          `
        );
      });
    } else {
      shiftList.innerHTML = "<li>Нет запланированных смен</li>";
    }

    // Последние заявки
    const requestsContainer = document.getElementById("user-requests");
    requestsContainer.innerHTML = ""; // очистка перед отрисовкой

    if (profile.lastRequests.length > 0) {
      profile.lastRequests.forEach((req) => {
        const from = new Date(req.fromDate).toLocaleDateString();
        const to = new Date(req.toDate).toLocaleDateString();
        requestsContainer.insertAdjacentHTML(
          "beforeend",
          `
            <div class="user-request">
            ${
              req.type === "VACATION"
                ? '<div class="user-request__type vacation">Отпуск</div>'
                : '<div class="user-request__type day-off">Отгул</div>'
            }
              
              <div class="user-request__dates">
                ${from} - ${to}
              </div>
                          ${
                            req.status === "PENDING"
                              ? '<div class="user-request__status pending">На усмотрении</div>'
                              : req.status === "APPROVED"
                              ? '<div class="user-request__status approved">Утверждено</div>'
                              : '<div class="user-request__status approved">Отклонено</div>'
                          }
            </div>
          `
        );
      });
    } else {
      requestsContainer.innerHTML = "<p>Заявки отсутствуют</p>";
    }

    // Статистика
    document.getElementById(
      "hours-worked"
    ).textContent = `${profile.statistics.totalHoursWorked}`;

    const shiftTypes = profile.statistics.shiftTypeCounts;

    if (shiftTypes.DAY) {
      document.getElementById("day-shift").textContent = `${shiftTypes.DAY}`;
    }
    if (shiftTypes.NIGHT) {
      document.getElementById(
        "night-shift"
      ).textContent = `${shiftTypes.NIGHT}`;
    }
    if (shiftTypes.DAILY) {
      document.getElementById(
        "daily-shift"
      ).textContent = `${shiftTypes.DAILY}`;
    }
  }

  function renderRequests(requests = config.requests) {
    const tableBody = document.querySelector("#requests-list");
    if (!tableBody) return;
    console.log("1", requests);

    tableBody.innerHTML = "";

    if (requests.length === 0) {
      const emptyRow = document.createElement("div");
      emptyRow.innerHTML = `<p class="text-center">Заявки не найдены</p>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    requests.forEach((request) => {
      const type =
        request.type === "VACATION"
          ? "Отпуск"
          : request.type === "SICK_LEAVE"
          ? "Больничный"
          : "Выходной";

      const status =
        request.status === "APPROVED"
          ? "Одобрено"
          : request.status === "REJECTED"
          ? "Отклонено"
          : "На усмотрении";

      const fromDate = new Date(request.fromDate);
      const toDate = new Date(request.toDate);

      tableBody.insertAdjacentHTML(
        "beforeend",
        `
              <div class="request-item pending">
                <div class="request-type vacation mb-1">
                  <svg><!-- Иконка отпуска --></svg>
                  ${type}
                </div>
                <div class="request-info mb-1">
                  <h3 class="request-employee">${request.user.name}</h3>
                  <p class="request-dates mb-1">${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}</p>
                  <p class="request-comment">${
                    request.reason || "Комментарий не добавлен"
                  }</p>
                </div>
                <div class="request-status pending mb-1">${status}</div>
              </div>
                `
      );
    });
  }

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
