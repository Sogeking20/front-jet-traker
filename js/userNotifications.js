document.addEventListener("DOMContentLoaded", function () {
  const config = {
    notifications: [],
  };

  initApplication();

  function initApplication() {
    checkRole();
    loadNotifications();
    // renderEmployeeTable();
    // initFilters();
  }

  async function checkRole() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch("http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api/user/profile", {
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

  const deleteAllNotificationBtn = document.getElementById(
    "clear-notifications"
  );
  if (deleteAllNotificationBtn) {
    deleteAllNotificationBtn.addEventListener("click", deleteAllNotification);
  }

  async function loadNotifications() {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        "http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api/notification/employee",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const savedNotification = await response.json();
      console.log(savedNotification);
      if (savedNotification) {
        config.notifications = savedNotification;
      }

      renderNotification();
    } catch (e) {
      console.error("Error loading employees:", e);
    }
  }

  function renderNotification(notifications = config.notifications) {
    const tableBody = document.querySelector("#notifications-list");
    if (!tableBody) return;
    console.log("1", notifications);

    tableBody.innerHTML = "";

    if (notifications.length === 0) {
      const emptyRow = document.createElement("div");
      emptyRow.innerHTML = `<p class="text-center">Заявки не найдены</p>`;
      tableBody.appendChild(emptyRow);
      return;
    }

    notifications.forEach((notification) => {
      const date = new Date(notification.createdAt);

      // Форматируем вручную с учётом локального времени
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0"); // Месяцы от 0 до 11
      const year = date.getFullYear();

      const time = `${hours}:${minutes} ${day}.${month}.${year}`;
      tableBody.insertAdjacentHTML(
        "beforeend",
        `
          <div class="notification-item ${notification.read ? "" : "unread"}">
              <div class="notification-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="#4361ee"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12 8V12L15 15"
                    stroke="#4361ee"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div class="notification-content">
                <h3 class="notification-title">${notification.message}</h3>
                <p class="notification-text">
                  ${notification.description || ""}
                </p>
                <p class="notification-time">${time || ""}</p>
              </div>
              <button data-id="${notification.id}" class="notification-action">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#64748b"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
                `
      );
    });
    // Добавляем обработчики для кнопок редактирования и удаления
    document.querySelectorAll(".notification-action").forEach((btn) => {
      console.log("1");
      btn.addEventListener("click", deleteNotification);
    });
  }

  async function deleteNotification(e) {
    const id = e.currentTarget.dataset.id;

    console.log(id);

    const token = localStorage.getItem("accessToken");

    const response = await fetch(
      `http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api/notification/employee/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    notification = await response.json();

    console.log(notification);

    config.notifications = config.notifications.filter(
      (item) => item.id !== notification.id
    );

    console.log(config.notifications);

    // showNotification("Сотрудник успешно добавлен!", "success");
    // config.notifications.push();
    renderNotification();
  }

  async function deleteAllNotification(e) {
    deleteAllNotificationBtn.disabled = true;
    deleteAllNotificationBtn.textContent = "Удаляем...";

    const token = localStorage.getItem("accessToken");

    const response = await fetch(
      `http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api/notification/employee`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    deleteAllNotificationBtn.disabled = false;
    deleteAllNotificationBtn.textContent = "Очистить всё";

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
    }

    notification = await response.json();

    config.notifications = [];

    // showNotification("Сотрудник успешно добавлен!", "success");
    // config.notifications.push();
    renderNotification();
  }
});
