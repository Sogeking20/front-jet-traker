// Общие функции для всего сайта - production ready
(function () {
  "use strict";

  // Конфигурация приложения
  const config = {
    apiBaseUrl: "https://localhost:3000/api",
    authTokenKey: "jettraker_token",
    authRoleKey: "jettraker_role",
    authUserKey: "jettraker_user",
    adminRoles: ["admin", "manager"],
    modalTransitionDuration: 300,
    requestTypes: {
      vacation: "Отпуск",
      sick: "Больничный",
      business: "Командировка",
      remote: "Удалённая работа",
    },
    notificationDuration: 5000,
  };

  // DOM элементы
  const DOM = {
    modals: null,
    authButtons: null,
    headerNav: null,
    logoButton: null,
    userMenus: null,
    adminLinks: null,
    teamLinks: null,
    logoutButtons: null,
    requestForms: null,
    createRequestButtons: null,
    requestTypeSelects: null,
    requestDatePickers: null,
    userName: null,
  };

  // Состояние приложения
  const state = {
    isInitialized: false,
    activeModal: null,
    pendingRequests: 0,
  };

  // Инициализация приложения
  function init() {
    if (state.isInitialized) return;

    try {
      console.log("12");
      cacheDOM();
      setupEventListeners();
      initDatePickers();
      checkAuth();
      state.isInitialized = true;
    } catch (error) {
      console.error("Initialization error:", error);
      // showCriticalError();
    }
  }

  // Кэширование DOM элементов
  function cacheDOM() {
    DOM.modals = document.querySelectorAll(".modal");
    DOM.authButtons = document.querySelectorAll(".auth-buttons");
    DOM.headerNav = document.querySelectorAll(".nav");
    DOM.logoButton = document.querySelectorAll(".logo");
    DOM.userMenus = document.querySelectorAll(".user-menu");
    DOM.userName = document.querySelectorAll(".user-menu__name");
    DOM.adminLinks = document.querySelectorAll(
      "#admin-link, #admin-sidebar-link"
    );
    DOM.userNotificationsLinks = document.querySelectorAll(
      "#dashboard-link, #dashboard-notifications-link"
    );
    DOM.adminNotificationsLinks = document.querySelectorAll(
      "#admin-link, #admin-sidebar-link, #admin-notifications"
    );
    DOM.userNav = document.querySelectorAll(".user-menu__name");
    DOM.teamLinks = document.querySelectorAll("#team-link");
    DOM.logoutButtons = document.querySelectorAll("#logout-btn");
    DOM.requestForms = document.querySelectorAll("#new-request-form");
    DOM.createRequestButtons = document.querySelectorAll("#create-request-btn");
    DOM.requestTypeSelects = document.querySelectorAll("#request-type");
    DOM.requestDatePickers = document.querySelectorAll(".date-picker");
  }

  // Настройка обработчиков событий
  function setupEventListeners() {
    // Модальные окна
    DOM.modals.forEach((modal) => {
      modal.addEventListener("click", handleModalClick);
      modal.addEventListener("transitionend", handleModalTransition);
    });

    // Меню пользователя
    DOM.userMenus.forEach((menu) => {
      menu.addEventListener("click", handleUserMenuClick);
    });

    // Клик по документу
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    // Выход из системы
    DOM.logoutButtons.forEach((button) => {
      button.addEventListener("click", handleLogout);
    });

    // Кнопки создания заявок
    DOM.createRequestButtons.forEach((button) => {
      button.addEventListener("click", handleCreateRequest);
    });

    // Селекты типа заявки
    DOM.requestTypeSelects.forEach((select) => {
      select.addEventListener("change", handleRequestTypeChange);
    });
  }

  // Инициализация date pickers
  function initDatePickers() {
    DOM.requestDatePickers.forEach((picker) => {
      // new Datepicker(picker, {
      //   format: "dd.mm.yyyy",
      //   autohide: true,
      //   separator: " до ",
      //   monthNames: [
      //     "Январь",
      //     "Февраль",
      //     "Март",
      //     "Апрель",
      //     "Май",
      //     "Июнь",
      //     "Июль",
      //     "Август",
      //     "Сентябрь",
      //     "Октябрь",
      //     "Ноябрь",
      //     "Декабрь",
      //   ],
      //   language: "ru",
      // });
    });
  }

  // Обработчики событий
  function handleModalClick(e) {
    const modal = e.currentTarget;
    if (e.target === modal || e.target.classList.contains("modal__close")) {
      closeModal(modal.id);
    }
  }

  function handleModalTransition(e) {
    const modal = e.currentTarget;
    if (!modal.classList.contains("active")) {
      modal.style.display = "none";
      state.activeModal = null;
    }
  }

  function handleUserMenuClick(e) {
    e.stopPropagation();
    const dropdown = this.querySelector(".user-menu__dropdown");
    if (dropdown) {
      const isVisible = dropdown.style.display === "block";
      document.querySelectorAll(".user-menu__dropdown").forEach((d) => {
        d.style.display = "none";
      });
      dropdown.style.display = isVisible ? "none" : "block";
    }
  }

  function handleDocumentClick() {
    document.querySelectorAll(".user-menu__dropdown").forEach((dropdown) => {
      dropdown.style.display = "none";
    });
  }

  function handleKeyDown(e) {
    // Закрытие модального окна по ESC
    if (e.key === "Escape" && state.activeModal) {
      closeModal(state.activeModal);
    }
  }

  function handleLogout(e) {
    e.preventDefault();
    logout();
  }

  function handleCreateRequest() {
    // if (!checkAuthStatus()) {
    //   showNotification(
    //     "Для создания заявки необходимо авторизоваться",
    //     "warning"
    //   );
    //   return;
    // }
    openModal("request-modal");
  }

  function handleRequestTypeChange(e) {
    const type = e.target.value;
    const descriptionField = e.target
      .closest("form")
      .querySelector("#request-description");

    if (type === "sick") {
      descriptionField.placeholder =
        "Укажите симптомы и приложите скан больничного листа";
    } else if (type === "vacation") {
      descriptionField.placeholder = "Укажите причину отпуска (если требуется)";
    } else {
      descriptionField.placeholder = "Опишите детали вашей заявки";
    }
  }

  // Основные функции
  function openModal(modalId) {
    try {
      if (state.pendingRequests > 0) {
        console.warn("Modal opening blocked during pending request");
        return;
      }

      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(`Modal with id ${modalId} not found`);
        return;
      }

      // Закрываем предыдущее модальное окно
      if (state.activeModal) {
        closeModal(state.activeModal);
      }

      modal.style.display = "flex";
      setTimeout(() => {
        modal.classList.add("active");
        state.activeModal = modalId;
      }, 10);

      // Блокировка прокрутки body
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${getScrollbarWidth()}px`;
    } catch (error) {
      console.error("Error opening modal:", error);
      showNotification("Не удалось открыть форму", "error");
    }
  }

  function closeModal(modalId) {
    try {
      const modal = document.getElementById(modalId);
      if (!modal) {
        console.error(`Modal with id ${modalId} not found`);
        return;
      }

      modal.classList.remove("active");
      state.activeModal = null;

      // Разблокировка прокрутки body после анимации
      setTimeout(() => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }, config.modalTransitionDuration);
    } catch (error) {
      console.error("Error closing modal:", error);
      showNotification("Не удалось закрыть форму", "error");
    }
  }

  async function checkAuth() {
    try {
      const token = localStorage.getItem("accessToken");

      console.log(token);

      const response = await fetch("http://localhost:3000/api/user/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // accessToken устарел — пробуем обновить
        await refreshToken();
        return checkAuthStatus(); // повторяем запрос
      }

      const userData = await response.json();

      const isAuthenticated = userData ? true : false;

      console.log(userData);
      // Обновляем UI в зависимости от статуса аутентификации
      updateAuthUI(isAuthenticated, userData);
    } catch (error) {
      console.error("Auth check error:", error);
      // В случае ошибки считаем пользователя неавторизованным
      updateAuthUI(false);
    }
  }

  async function checkAuthStatus() {
    return data;
  }

  function updateAuthUI(isAuthenticated, userData) {
    DOM.authButtons.forEach((btn) => {
      btn.style.display = isAuthenticated ? "none" : "flex";
      btn.classList.toggle("hidden", isAuthenticated);
    });

    DOM.headerNav.forEach((btn) => {
      btn.style.display = isAuthenticated ? "flex" : "none";
    });

    DOM.logoButton.forEach((btn) => {
      btn.classList.toggle("logo-btn", isAuthenticated);
    });

    DOM.userMenus.forEach((menu) => {
      menu.style.display = isAuthenticated ? "flex" : "none";
      menu.classList.toggle("hidden", !isAuthenticated);
    });

    if (isAuthenticated) {
      const userRole = userData.user.role;
      const userNotifications = userData.notifications.filter(
        (n) => n.userId === userData.user.id
      );
      const companyNotifications = userData.notifications.filter(
        (n) => n.companyId === userData.user.companyId
      );
      // const isAdmin = config.adminRoles.includes(userRole);
      const isAdmin = userRole === "MANAGER" || "BOSS" ? true : false;

      DOM.adminLinks.forEach((link) => {
        link.style.display = isAdmin ? "inline" : "none";
        link.classList.toggle("hidden", !isAdmin);
      });

      DOM.adminNotificationsLinks.forEach((link) => {
        link.classList.toggle(
          "notifications",
          isAdmin && companyNotifications.length > 0
        );
      });

      DOM.userNotificationsLinks.forEach((link) => {
        link.classList.toggle("notifications", userNotifications.length > 0);
      });

      DOM.userNav.forEach((link) => {
        link.classList.toggle(
          "notifications",
          userData.notifications.length > 0
        );
      });

      DOM.teamLinks.forEach((link) => {
        link.style.display = isAdmin ? "inline" : "none";
        link.classList.toggle("hidden", !isAdmin);
      });

      // Обновляем данные пользователя в UI
      updateUserProfile(userData);
    } else {
      DOM.adminLinks.forEach((link) => {
        link.style.display = "none";
        link.classList.add("hidden");
      });

      DOM.teamLinks.forEach((link) => {
        link.style.display = "none";
        link.classList.add("hidden");
      });
    }
  }

  function updateUserProfile(userData) {
    try {
      console.log(userData.user.name);
      // const user = JSON.parse(userData);
      DOM.userName.forEach((el) => {
        el.textContent = userData.user.name || "Пользователь";
      });

      document.querySelectorAll(".user-avatar").forEach((el) => {
        if (user.avatar) {
          el.style.backgroundImage = `url(${user.avatar})`;
        }
      });
    } catch (error) {
      console.error("Failed to update user profile:", error);
    }
  }

  async function verifyToken() {
    try {
      const response = await fetch(`${config.apiBaseUrl}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(config.authTokenKey)}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token verification failed");
      }
    } catch (error) {
      console.error("Token verification error:", error);
      logout();
    }
  }

  async function logout() {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include", // важно для передачи cookie
      });

      // Удаляем accessToken с клиента
      localStorage.removeItem("accessToken");

      // Перенаправление на главную с очисткой истории
      window.location.replace(window.location.origin);
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = window.location.origin;
    }
  }

  function validateRequest(requestData) {
    if (!requestData.type || !config.requestTypes[requestData.type]) {
      showNotification("Пожалуйста, выберите тип заявки", "error");
      return false;
    }

    if (!requestData.startDate) {
      showNotification("Пожалуйста, укажите дату начала", "error");
      return false;
    }

    if (!requestData.endDate) {
      showNotification("Пожалуйста, укажите дату окончания", "error");
      return false;
    }

    if (new Date(requestData.startDate) > new Date(requestData.endDate)) {
      showNotification(
        "Дата начала не может быть позже даты окончания",
        "error"
      );
      return false;
    }

    return true;
  }

  // Вспомогательные функции
  function showNotification(message, type = "success") {
    try {
      const toast = document.createElement("div");
      toast.className = "error-toast";
      toast.innerText = message;

      document.body.appendChild(toast);

      // Удалить плашку через 3 секунды
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } catch (error) {
      console.error("Notification error:", error);
      alert(message); // Fallback
    }
  }

  function closeNotification(notification) {
    if (!notification) return;

    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  function getScrollbarWidth() {
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll";
    document.body.appendChild(outer);

    const inner = document.createElement("div");
    outer.appendChild(inner);

    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

    outer.parentNode.removeChild(outer);
    return scrollbarWidth;
  }

  function showCriticalError() {
    document.body.innerHTML = `
            <div class="critical-error">
                <h1>Произошла ошибка</h1>
                <p>Приложение не может быть загружено. Пожалуйста, попробуйте перезагрузить страницу.</p>
                <button onclick="window.location.reload()">Перезагрузить</button>
            </div>
        `;
  }

  // Инициализация приложения после загрузки DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Экспорт публичных функций
  window.app = {
    openModal,
    closeModal,
    showNotification,
    checkAuth,
    logout,
  };

  // Для совместимости со старым кодом
  window.openModal = openModal;
  window.closeModal = closeModal;
})();
