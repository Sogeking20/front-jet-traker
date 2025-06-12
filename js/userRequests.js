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
        `https://api.jettraker.com/api/request/employee?status=${encodeURIComponent(
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
        "afterbegin",
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
