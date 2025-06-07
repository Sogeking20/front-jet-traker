document.addEventListener("DOMContentLoaded", function () {
  // Конфигурация модуля
  const config = {
    apiBaseUrl: "http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api",
    pdfGeneratorUrl: "https://pdfgen.yourdomain.com",
    defaultPeriod: "current-month",
    notificationDuration: 5000,
    maxRetryAttempts: 3,
  };

  // DOM элементы
  const elements = {
    periodSelect: document.getElementById("salary-period-select"),
    downloadBtn: document.getElementById("download-payslip-btn"),
    sendBtn: document.getElementById("send-payslip-btn"),
    payslipContainer: document.getElementById("payslip-container"),
    loadingIndicator: document.getElementById("payslip-loading"),
    errorContainer: document.getElementById("payslip-error"),
    retryBtn: document.getElementById("payslip-retry-btn"),
    emailModal: document.getElementById("email-payslip-modal"),
    emailForm: document.getElementById("send-payslip-form"),
    emailConfirm: document.getElementById("email-confirm"),
  };

  // Состояние модуля
  const state = {
    currentPeriod: config.defaultPeriod,
    isLoading: false,
    retryCount: 0,
    currentPayslipId: null,
  };

  // Инициализация модуля
  function init() {
    checkRole();
    setupEventListeners();
    loadInitialData();
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

  function setupEventListeners() {
    // Выбор периода
    if (elements.periodSelect) {
      elements.periodSelect.addEventListener("change", handlePeriodChange);
    }

    // Кнопка скачивания
    if (elements.downloadBtn) {
      elements.downloadBtn.addEventListener("click", handleDownload);
    }

    // Кнопка отправки
    if (elements.sendBtn) {
      elements.sendBtn.addEventListener("click", handleSendClick);
    }

    // Кнопка повтора
    if (elements.retryBtn) {
      elements.retryBtn.addEventListener("click", handleRetry);
    }

    // Форма отправки email
    if (elements.emailForm) {
      elements.emailForm.addEventListener("submit", handleEmailSubmit);
    }
  }

  function loadInitialData() {
    state.currentPeriod = getSavedPeriodPreference() || config.defaultPeriod;

    if (elements.periodSelect) {
      elements.periodSelect.value = state.currentPeriod;
    }

    loadPayslipData(state.currentPeriod);
  }

  // Обработчики событий
  function handlePeriodChange(event) {
    const period = event.target.value;
    state.currentPeriod = period;
    savePeriodPreference(period);
    loadPayslipData(period);
  }

  async function handleDownload() {
    if (!state.currentPayslipId) {
      showNotification("Нет данных для скачивания", "error");
      return;
    }

    try {
      setLoadingState(true, elements.downloadBtn);

      const pdfUrl = await generatePayslipPDF(state.currentPayslipId);
      downloadFile(pdfUrl, `payslip-${state.currentPeriod}.pdf`);

      showNotification("Расчетный лист успешно сформирован", "success");
    } catch (error) {
      console.error("Download error:", error);
      showNotification("Ошибка при формировании PDF", "error");
    } finally {
      setLoadingState(false, elements.downloadBtn);
    }
  }

  function handleSendClick() {
    if (!state.currentPayslipId) {
      showNotification("Нет данных для отправки", "error");
      return;
    }

    if (elements.emailModal) {
      // Проверяем сохраненный email
      const userEmail = getUserEmail();
      if (userEmail) {
        elements.emailConfirm.textContent = `Отправить на ${userEmail}?`;
        elements.emailConfirm.style.display = "block";
        elements.emailForm.querySelector('input[type="email"]').value =
          userEmail;
      } else {
        elements.emailConfirm.style.display = "none";
      }

      openModal(elements.emailModal);
    }
  }

  const currentMonthElement = document.getElementById("current-month");
  const prevMonthBtn = document.getElementById("prev-month-btn");
  const nextMonthBtn = document.getElementById("next-month-btn");

  let currentDate = new Date();

  function updateCalendar() {
    const options = { month: "long", year: "numeric" };
    currentMonthElement.textContent = currentDate.toLocaleDateString(
      "ru-RU",
      options
    );
  }

  updateCalendar();

  async function updateTable() {
    loadPayslipData(currentDate.getMonth() + 1, currentDate.getFullYear());
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

  async function handleRetry() {
    if (state.retryCount >= config.maxRetryAttempts) {
      showNotification("Превышено количество попыток", "error");
      return;
    }

    state.retryCount++;
    loadPayslipData(state.currentPeriod);
  }

  // Основные функции
  async function loadPayslipData(month, year) {
    try {
      setLoadingState(true);
      hideError();

      const data = await fetchPayslipData(month, year);
      state.currentPayslipId = data.id;

      renderPayslip(data);
      showNotification("Данные за период загружены", "success");
    } catch (error) {
      console.error("Failed to load payslip data:", error);
      showError("Ошибка загрузки данных");
    } finally {
      setLoadingState(false);
    }
  }

  async function fetchPayslipData(month, year) {
    const token = localStorage.getItem("accessToken");

    console.log(month, year);

    const response = await fetch(
      `${config.apiBaseUrl}/salary?${
        month && year ? `month=${month}&year=${year}` : ""
      }`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const salary = await response.json();

    console.log(salary);

    return salary;
  }

  async function generatePayslipPDF(payslipId) {
    const response = await fetch(`${config.pdfGeneratorUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ payslipId }),
    });

    if (!response.ok) {
      throw new Error("PDF generation failed");
    }

    const data = await response.json();
    return data.pdfUrl;
  }

  async function sendPayslipByEmail(payslipId, email) {
    const response = await fetch(`${config.apiBaseUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        payslipId,
        email,
        subject: `Ваш расчетный лист за ${formatPeriod(state.currentPeriod)}`,
      }),
    });

    if (!response.ok) {
      throw new Error("Email sending failed");
    }
  }

  function renderPayslip(data) {
    if (!data.shift || !data.shift > 0) return;

    const tableBody = document.querySelector("#salary-card");

    if (!tableBody) return;

    tableBody.innerHTML = "";

        const salaryAll = document.querySelector("#salary-all");
    const salaryDetail = document.querySelector("#card-salary-detail");
    const salaryDay = document.querySelector("#card-salary-day");
    const salaryNight = document.querySelector("#card-salary-night");
    const salaryDaily = document.querySelector("#card-salary-daily");
    const salaryPartTime = document.querySelector("#card-salary-part-time");

    const salaryTaxAll = document.querySelector("#salary-tax-all");
    const salaryTax = document.querySelector("#salary-card-tax");

    const salaryResultAll = document.querySelector("#salary-result-all");
    const salaryResult = document.querySelector("#salary-result");

    const allHaveHourlyRate = data.shift.every(
      (shift) => shift.hourlyRate != null
    );
    const noneHaveHourlyRate = data.shift.every(
      (shift) => shift.hourlyRate == null
    );

    if (data.shift.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `<td colspan="7" class="text-center">Ничего не найдены</td>`;
      tableBody.appendChild(emptyRow);

            salaryAll.innerHTML = `0 <span>₽</span>`;
      salaryDetail.innerHTML = `0 <span>₽</span>`;
      salaryDay.innerHTML = `0 <span>₽</span>`;
      salaryNight.innerHTML = `0 <span>₽</span>`;
      salaryDaily.innerHTML = `0 <span>₽</span>`;
      salaryPartTime.innerHTML = `0 <span>₽</span>`;

      salaryTax.innerHTML = `- 0 <span>₽</span>`;
      salaryTaxAll.innerHTML = `- 0 <span>₽</span>`;

      salaryResult.innerHTML = `0 <span>₽</span>`;
      salaryResultAll.innerHTML = `0 <span>₽</span>`;
      return;
    }

    data.shift.forEach((employee) => {
      const start = new Date(employee.startTime); // ISO-строка начала
      const end = new Date(employee.endTime); // ISO-строка окончания

      // Получаем дату в формате ДД.ММ.ГГГГ
      const date = start.toLocaleDateString("ru-RU");

      // Вычисляем продолжительность в часах
      const durationMs = end - start;
      const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2); // округляем до 2 знаков

      // Ставка и сумма
      const rate = employee.hourlyRate; // например, 500
      const total = rate * durationHours;

      const row = document.createElement("tr");
      row.innerHTML = `
              <tr>
                <td>${date}</td>
                <td>${
                  employee.type === "DAY"
                    ? "Дневная"
                    : employee.type === "NIGHT"
                    ? "Ночная"
                    : employee.type === "DAILY"
                    ? "Суточная"
                    : "Парт-тайм"
                }</td>
                <td>${durationHours}</td>
                <td>${rate ? rate + "₽/ч" : "-"}</td>
                <td>${total ? total.toLocaleString("ru-RU") + "₽" : "-"}</td>
              </tr>
            `;
      tableBody.appendChild(row);
    });

    let totalDay = 0;
    let totalNight = 0;
    let totalDaily = 0;
    let totalPartTime = 0;

    if (salaryDetail && !allHaveHourlyRate) {
      salaryDetail.innerHTML = `${data.salary}<span>₽</span>`;
    }

    if (salaryDay && !noneHaveHourlyRate) {
      totalDay = data.shift
        .filter((shift) => shift.type === "DAY" && shift.hourlyRate != null)
        .map((shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);

          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // разница в миллисекундах → часы

          return hours * shift.hourlyRate;
        })
        .reduce((sum, current) => sum + current, 0);
      salaryDay.innerHTML = `${totalDay}<span>₽</span>`;
    }

    if (salaryNight && !noneHaveHourlyRate) {
      totalNight = data.shift
        .filter((shift) => shift.type === "NIGHT" && shift.hourlyRate != null)
        .map((shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);

          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // разница в миллисекундах → часы

          return hours * shift.hourlyRate;
        })
        .reduce((sum, current) => sum + current, 0);
      salaryNight.innerHTML = `${totalNight}<span>₽</span>`;
    }

    if (salaryDaily && !noneHaveHourlyRate) {
      totalDaily = data.shift
        .filter((shift) => shift.type === "DAILY" && shift.hourlyRate != null)
        .map((shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);

          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // разница в миллисекундах → часы

          return hours * shift.hourlyRate;
        })
        .reduce((sum, current) => sum + current, 0);
      salaryDaily.innerHTML = `${totalDaily}<span>₽</span>`;
    }

    if (salaryPartTime && !noneHaveHourlyRate) {
      totalPartTime = data.shift
        .filter(
          (shift) => shift.type === "PART_TIME" && shift.hourlyRate != null
        )
        .map((shift) => {
          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);

          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // разница в миллисекундах → часы

          return hours * shift.hourlyRate;
        })
        .reduce((sum, current) => sum + current, 0);
      salaryPartTime.innerHTML = `${totalPartTime}<span>₽</span>`;
    }

    if (salaryAll) {
      salaryAll.innerHTML = `${
        data.salary + totalDay + totalDaily + totalNight + totalPartTime
      }<span>₽</span>`;
    }

    const total =
      data.salary + totalDay + totalDaily + totalNight + totalPartTime;

    const tax = (13 / 100) * total;

    const result = total - tax;

    if (salaryTax) {
      salaryTax.innerHTML = `- ${tax} <span>₽</span>`;
    }

    if (salaryTaxAll) {
      salaryTaxAll.innerHTML = `- ${tax} <span>₽</span>`;
    }

    if (salaryResultAll) {
      salaryResultAll.innerHTML = `${result} <span>₽</span>`;
    }

    if (salaryResult) {
      salaryResult.innerHTML = `${result} <span>₽</span>`;
    }
  }

  // Вспомогательные функции
  function setLoadingState(isLoading, element = null) {
    state.isLoading = isLoading;

    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = isLoading ? "block" : "none";
    }

    if (elements.payslipContainer) {
      elements.payslipContainer.style.opacity = isLoading ? "0.5" : "1";
    }

    if (element) {
      element.disabled = isLoading;
      if (isLoading) {
        element.innerHTML = '<span class="spinner"></span>';
      } else {
        element.innerHTML = element.dataset.originalText || element.textContent;
      }
    }
  }

  function showError(message) {
    if (elements.errorContainer) {
      elements.errorContainer.innerHTML = `
                <div class="error-message">${message}</div>
                <button id="payslip-retry-btn" class="btn btn--secondary">Повторить попытку</button>
            `;
      elements.errorContainer.style.display = "block";

      // Обновляем ссылку на кнопку после изменения DOM
      elements.retryBtn = document.getElementById("payslip-retry-btn");
      if (elements.retryBtn) {
        elements.retryBtn.addEventListener("click", handleRetry);
      }
    }
  }

  function hideError() {
    if (elements.errorContainer) {
      elements.errorContainer.style.display = "none";
    }
    state.retryCount = 0;
  }

  function downloadFile(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  function formatPeriod(period) {
    const periods = {
      "current-month": "Текущий месяц",
      "previous-month": "Прошлый месяц",
      quarter: "Квартал",
      year: "Год",
    };
    return periods[period] || period;
  }

  function formatDate(dateString) {
    const options = { day: "numeric", month: "long", year: "numeric" };
    return new Date(dateString).toLocaleDateString("ru-RU", options);
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  function getAuthToken() {
    return localStorage.getItem("auth_token") || "";
  }

  function getUserEmail() {
    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        return JSON.parse(userData).email;
      } catch {
        return null;
      }
    }
    return null;
  }

  function saveUserEmail(email) {
    const userData = localStorage.getItem("user_data");
    if (userData) {
      try {
        const data = JSON.parse(userData);
        data.email = email;
        localStorage.setItem("user_data", JSON.stringify(data));
      } catch {
        // Не удалось сохранить email
      }
    }
  }

  function savePeriodPreference(period) {
    localStorage.setItem("payslip_period", period);
  }

  function getSavedPeriodPreference() {
    return localStorage.getItem("payslip_period");
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

  function openModal(modalElement) {
    modalElement.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  function closeModal(modalElement) {
    modalElement.style.display = "none";
    document.body.style.overflow = "";
  }

  // Инициализация модуля
  init();
});
