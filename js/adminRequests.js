document.addEventListener("DOMContentLoaded", function () {
  const config = {
    requests: [],
  };

  initApplication();

  function initApplication() {
    checkRole();
    loadRequests();
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
      if (!response.ok) {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
      if (userData.user.role !== "MANAGER" && userData.user.role !== "BOSS") {
        window.location.href = "/dashboard";
      }
    } catch (e) {
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
  }

  async function loadRequests() {
    try {
      const token = localStorage.getItem("accessToken");

      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get("status") || "";
      const upperStatus = status ? status.toUpperCase() : "";
      console.log(upperStatus);

      const response = await fetch(
        `http://localhost:3000/api/request/company?status=${encodeURIComponent(
          upperStatus
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const savedRequests = await response.json();
      console.log(savedRequests);
      if (savedRequests) {
        config.requests = savedRequests;
      }

      renderRequests();
    } catch (e) {
      console.error("Error loading employees:", e);
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
              ${
                request.status === "PENDING"
                  ? `
                <div class="request-actions">
                  <button data-id="${request.id}" id="approved-request" data-status="APPROVED" class="btn btn--sm btn--success">Принять</button>
                  <button data-id="${request.id}" id="rejected-request" data-status="REJECTED" class="btn btn--sm btn--danger">Отклонить</button>
                </div>
                `
                  : ""
              }
              </div>
              `
      );
    });
    // Добавляем обработчики для кнопок редактирования и удаления
    document.querySelectorAll("#approved-request").forEach((btn) => {
      console.log("1");
      btn.addEventListener("click", handleRequest);
    });

    document.querySelectorAll("#rejected-request").forEach((btn) => {
      btn.addEventListener("click", handleRequest);
    });
  }

  async function handleRequest(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    approvedBtn = document.querySelectorAll("#approved-request");
    rejectedBtn = document.querySelectorAll("#rejected-request");

    approvedBtn.forEach((btn) => (btn.disabled = true));
    rejectedBtn.forEach((btn) => (btn.disabled = true));

    console.log(id);
    console.log(status);

    const token = localStorage.getItem("accessToken");

    const response = await fetch(`http://localhost:3000/api/request/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        status: status,
      }),
    });

    approvedBtn.forEach((btn) => (btn.disabled = false));
    rejectedBtn.forEach((btn) => (btn.disabled = false));

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    request = await response.json();

    const index = config.requests.findIndex((req) => req.id === request.id);

    if (index !== -1) {
      config.requests[index].status = status;
    }

    // showNotification("Сотрудник успешно добавлен!", "success");
    // config.requests.push();
    renderRequests();
  }

  const tabs = document.querySelectorAll(".requests-tab");

  function updateURLParameter(param, value) {
    const url = new URL(window.location);

    if (value === "") {
      url.searchParams.delete(param); // удаляем параметр
    } else {
      url.searchParams.set(param, value); // добавляем/обновляем параметр
    }

    window.history.replaceState({}, "", url); // обновляем URL без перезагрузки
  }

  function highlightActiveTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentStatus = urlParams.get("status") || "";

    loadRequests();

    tabs.forEach((tab) => {
      const tabStatus = tab.dataset.tab;
      const isActive = tabStatus === currentStatus;

      tab.classList.toggle("active", isActive);
      tab.disabled = isActive; // блокируем активную кнопку
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const status = tab.dataset.tab;
      updateURLParameter("status", status);
      highlightActiveTab();
    });
  });

  // Подсветка при загрузке страницы
  highlightActiveTab();
});
