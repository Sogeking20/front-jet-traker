document.addEventListener("DOMContentLoaded", function () {
  const config = {
    vacation: [],
  };

  initApplication();

  function initApplication() {
    checkRole();
    loadCompany();
    // rendervacationTable();
    // initFilters();
  }

  const editCompanyForm = document.getElementById("company-settings-form");
  if (editCompanyForm) {
    editCompanyForm.addEventListener("submit", editFormSubmit);
  }

  async function loadCompany() {
    const token = localStorage.getItem("accessToken");

    fetch("http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api/company", {
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
      .then((company) => {
        console.log(company);
        document.getElementById("company-name").value = company.name;
        document.getElementById("company-industry").value = company.industry;
        document.getElementById("company-timezone").value = company.timeZone;
      })
      .catch((error) => {
        console.error("Ошибка при загрузке сотрудников:", error);
      });
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

  async function editFormSubmit(e) {
    e.preventDefault();

    const form = e.target;

    const employee = {
      name: form["company-name"].value,
      industry: form["company-industry"].value,
    };

    console.log(JSON.stringify(employee));

    const token = localStorage.getItem("accessToken");

    const response = await fetch(`http://jettraker-backend-sflk2d-23d059-109-107-189-7.traefik.me//api/company`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(employee),
    });

    if (!response.ok) {
      throw new Error(response.message || "Ошибка регистрации");
      showNotification("Произошла ошибка!", "error");
    }

    showNotification("Вы успешно изменили данные!", "success");

    company = await response.json();
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
});
