document.addEventListener("DOMContentLoaded", function () {
  // Конфигурация приложения
  const config = {
    apiBaseUrl: "http://localhost:3000/api",
    minPasswordLength: 8,
    tokenKey: "jettraker_token",
    roleKey: "jettraker_role",
    companyKey: "jettraker_company",
  };

  // Инициализация приложения
  init();
  initAuth();

   function init() {
    checkRole();
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

      console.log(response)
      if (response.ok) {
          window.location.href = "/dashboard";
      }
    } catch (e) {
          window.location.href = "/";
    }
  }

  // Переключение между вкладками входа и регистрации
  const authTabs = document.querySelectorAll(".auth-tab");
  const authForms = document.querySelectorAll(".auth-form");

  authTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");

      // Удаляем активный класс у всех вкладок и форм
      authTabs.forEach((t) => t.classList.remove("active"));
      authForms.forEach((f) => f.classList.remove("active"));

      // Добавляем активный класс текущей вкладке и форме
      this.classList.add("active");
      document.getElementById(`${tabName}-form`).classList.add("active");

      // Обновляем URL без перезагрузки страницы
      const url = new URL(window.location.href);
      url.searchParams.set("action", tabName);
      window.history.pushState({}, "", url);
    });
  });

  // Проверка параметров URL для установки активной вкладки
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get("action");

  if (action === "register") {
    document.querySelector('[data-tab="register"]').click();
  } else {
    document.querySelector('[data-tab="login"]').click();
  }

  // Обработка формы входа
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value;

      // Валидация
      if (!validateEmail(email)) {
        showError("login-email", "Пожалуйста, введите корректный email");
        return;
      }

      if (!password) {
        showError("login-password", "Пожалуйста, введите пароль");
        return;
      }

      // Показываем индикатор загрузки
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Вход...';

      try {
        // Аутентификация на сервере
        const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Ошибка входа");
        }

        console.log(data);

        localStorage.setItem("accessToken", data.accessToken);

        // Перенаправляем в зависимости от роли
        redirectAfterLogin();
      } catch (error) {
        showNotification(error.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Войти";
      }
    });
  }

  // Обработка формы регистрации
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      console.log("12");
      e.preventDefault();

      const name = document.getElementById("register-name").value.trim();
      const surname = document.getElementById("register-surname").value.trim();
      const email = document.getElementById("register-email").value.trim();
      const password = document.getElementById("register-password").value;
      const confirmPassword = document.getElementById(
        "register-confirm-password"
      ).value;

      // Валидация
      if (!name) {
        showError("register-name", "Пожалуйста, введите ваше имя");
        return;
      }

      if (!surname) {
        showError("register-name", "Пожалуйста, введите ваше имя");
        return;
      }

      if (!validateEmail(email)) {
        showError("register-email", "Пожалуйста, введите корректный email");
        return;
      }

      if (password.length < config.minPasswordLength) {
        showError(
          "register-password",
          `Пароль должен содержать минимум ${config.minPasswordLength} символов`
        );
        return;
      }

      if (password !== confirmPassword) {
        showError("register-confirm-password", "Пароли не совпадают");
        return;
      }

      const fullName = `${name} ${surname}`;

      try {
        // Отправляем данные регистрации на сервер
        const response = await fetch(`${config.apiBaseUrl}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: fullName,
            email: email,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Ошибка регистрации");
        }

        localStorage.setItem("accessToken", data.accessToken);

        redirectAfterLogin();
      } catch (error) {
        showNotification(error.message, "error");
      } finally {
        // submitBtn.disabled = false;
        // submitBtn.textContent = "Создать компанию";
      }
      // Показываем форму создания компании
      // this.style.display = "none";
      // document.getElementById("register-company-form").style.display = "block";
    });
  }

  // Обработка формы создания компании
  const companyForm = document.getElementById("register-company-form");
  if (companyForm) {
    companyForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const companyName = document.getElementById("company-name").value.trim();
      const industry = document.getElementById("company-industry").value;
      const timezone = document.getElementById("company-timezone").value;

      // Валидация
      // if (!companyName) {
      //   showError("company-name", "Пожалуйста, введите название компании");
      //   return;
      // }

      // if (!industry) {
      //   showError("company-industry", "Пожалуйста, выберите отрасль");
      //   return;
      // }

      // if (!timezone) {
      //   showError("company-timezone", "Пожалуйста, выберите часовой пояс");
      //   return;
      // }

      // Получаем данные пользователя из sessionStorage
      const userData = JSON.parse(sessionStorage.getItem("registration_data"));
      if (!userData) {
        showNotification(
          "Ошибка регистрации. Пожалуйста, попробуйте снова.",
          "error"
        );
        window.location.reload();
        return;
      }

      // Показываем индикатор загрузки
      const submitBtn = companyForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Регистрация...';

      try {
        // Отправляем данные регистрации на сервер
        const response = await fetch(`${config.apiBaseUrl}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            company: {
              name: companyName,
              industry,
              timezone,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Ошибка регистрации");
        }

        // Сохраняем токен и данные пользователя
        localStorage.setItem(config.tokenKey, data.token);
        localStorage.setItem(config.roleKey, data.user.role);
        localStorage.setItem(config.companyKey, JSON.stringify(data.company));
        localStorage.setItem("jettraker_user", JSON.stringify(data.user));

        // Очищаем временные данные
        sessionStorage.removeItem("registration_data");

        // Перенаправляем в админ-панель
        window.location.href = "/admin";
      } catch (error) {
        showNotification(error.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Создать компанию";
      }
    });
  }

  // Функции приложения
  function initAuth() {
    // Проверяем, авторизован ли пользователь
    if (localStorage.getItem(config.tokenKey)) {
      redirectAfterLogin(localStorage.getItem(config.roleKey));
    }

    // Инициализация полей формы
    initFormFields();
  }

  function initFormFields() {
    // Инициализация выбора часовых поясов
    const timezoneSelect = document.getElementById("company-timezone");
    if (timezoneSelect) {
      const timezones = Intl.supportedValuesOf("timeZone");
      timezones.forEach((tz) => {
        const option = document.createElement("option");
        option.value = tz;
        option.textContent = tz;
        timezoneSelect.appendChild(option);
      });
    }

    // Инициализация выбора отрасли
    const industrySelect = document.getElementById("company-industry");
    if (industrySelect) {
      const industries = [
        "IT",
        "Финансы",
        "Здравоохранение",
        "Образование",
        "Ритейл",
        "Производство",
        "Недвижимость",
        "Другое",
      ];

      industries.forEach((ind) => {
        const option = document.createElement("option");
        option.value = ind;
        option.textContent = ind;
        industrySelect.appendChild(option);
      });
    }
  }

  function redirectAfterLogin(role) {
    switch (role) {
      case "admin":
        window.location.href = "/admin";
        break;
      case "manager":
        window.location.href = "manager.html";
        break;
      default:
        window.location.href = "dashboard";
    }
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.textContent = message;

    // Удаляем предыдущее сообщение об ошибке
    const existingError = field.parentElement.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }

    field.parentElement.appendChild(errorElement);
    field.focus();
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
    }, 5000);
  }

  // Вспомогательные функции для работы с API
  async function makeRequest(url, method, data = null) {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem(config.tokenKey)}`,
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${config.apiBaseUrl}${url}`, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Ошибка запроса");
    }

    return response.json();
  }
});
