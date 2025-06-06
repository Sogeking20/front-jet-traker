const addMemberBtn = document.getElementById("add-member-btn");
if (addMemberBtn) {
  addMemberBtn.addEventListener("click", function () {
    // if (!canAddEmployee()) return;
    openModal("add-member-modal");
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
