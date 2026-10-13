const API = `${API_URL}/api/students`;
let editingId = null;

const $ = (id) => document.getElementById(id);

/* ---------- helpers ---------- */
function showMessage(text, type = "info") {
  const el = $("message");
  el.textContent = text;
  el.className = `message ${type}`;
  clearTimeout(showMessage.t);
  showMessage.t = setTimeout(() => el.classList.add("hidden"), 5000);
}

async function api(path = "", options = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. It may be waking up; try again in a minute.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.errors ? body.errors.join(", ") : body.message || "Request failed");
  }
  return body;
}

function showSection(name) {
  document.querySelectorAll("main section").forEach((s) =>
    s.classList.toggle("hidden", s.id !== name)
  );
  document.querySelectorAll("nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.section === name)
  );
  if (name === "list") loadStudents();
  if (name === "add" && !editingId) resetForm();
}

/* ---------- table rendering (textContent prevents HTML injection) ---------- */
function renderRows(tbody, students) {
  tbody.replaceChildren();
  if (!students.length) {
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = 7;
    td.textContent = "No records found.";
    return;
  }
  students.forEach((s) => {
    const tr = tbody.insertRow();
    [s.studentId, s.name, s.email || "-", s.department, s.semester, s.contact || "-"]
      .forEach((v) => (tr.insertCell().textContent = v));

    const td = tr.insertCell();
    const box = document.createElement("div");
    box.className = "actions";

    const edit = document.createElement("button");
    edit.textContent = "Edit";
    edit.onclick = () => startEdit(s);

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.className = "danger";
    del.onclick = () => deleteStudent(s.studentId);

    box.append(edit, del);
    td.append(box);
  });
}

/* ---------- READ ---------- */
async function loadStudents() {
  try {
    const q = $("filter").value.trim();
    const { data } = await api(q ? `?search=${encodeURIComponent(q)}` : "");
    renderRows($("student-rows"), data);
  } catch (err) {
    showMessage(err.message, "error");
  }
}

async function searchStudent() {
  const id = $("search-id").value.trim();
  if (!id) return showMessage("Enter a Student ID to search.", "error");
  try {
    const { data } = await api(`/${encodeURIComponent(id)}`);
    renderRows($("search-rows"), [data]);
  } catch (err) {
    $("search-rows").replaceChildren();
    showMessage(err.message, "error");
  }
}

/* ---------- CREATE / UPDATE ---------- */
function resetForm() {
  editingId = null;
  $("student-form").reset();
  $("studentId").disabled = false;
  $("form-title").textContent = "Add Student";
  $("submit-btn").textContent = "Add Student";
  $("cancel-btn").classList.add("hidden");
}

function startEdit(s) {
  editingId = s.studentId;
  $("studentId").value = s.studentId;
  $("studentId").disabled = true; // ID cannot be changed
  $("name").value = s.name;
  $("email").value = s.email || "";
  $("department").value = s.department;
  $("semester").value = s.semester;
  $("contact").value = s.contact || "";
  $("form-title").textContent = `Edit Student (${s.studentId})`;
  $("submit-btn").textContent = "Update Student";
  $("cancel-btn").classList.remove("hidden");
  showSection("add");
}

$("student-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const student = {
    studentId: $("studentId").value.trim(),
    name: $("name").value.trim(),
    email: $("email").value.trim(),
    department: $("department").value.trim(),
    semester: Number($("semester").value),
    contact: $("contact").value.trim(),
  };

  // basic client-side validation (the backend validates again)
  if (!student.studentId || !student.name || !student.department || !student.semester) {
    return showMessage("Please fill in all required fields.", "error");
  }

  try {
    if (editingId) {
      await api(`/${encodeURIComponent(editingId)}`, {
        method: "PUT",
        body: JSON.stringify(student),
      });
      showMessage("Student updated successfully.", "success");
      resetForm();
      showSection("list");
    } else {
      await api("", { method: "POST", body: JSON.stringify(student) });
      showMessage("Student added successfully.", "success");
      resetForm();
    }
  } catch (err) {
    showMessage(err.message, "error");
  }
});

/* ---------- DELETE ---------- */
async function deleteStudent(id) {
  if (!confirm(`Delete student ${id}?`)) return;
  try {
    await api(`/${encodeURIComponent(id)}`, { method: "DELETE" });
    showMessage("Student deleted successfully.", "success");
    $("search-rows").replaceChildren();
    loadStudents();
  } catch (err) {
    showMessage(err.message, "error");
  }
}

/* ---------- events ---------- */
document.querySelectorAll("nav button").forEach((b) =>
  b.addEventListener("click", () => showSection(b.dataset.section))
);
$("cancel-btn").addEventListener("click", () => { resetForm(); showSection("list"); });
$("refresh-btn").addEventListener("click", loadStudents);
$("filter").addEventListener("input", () => {
  clearTimeout($("filter").t);
  $("filter").t = setTimeout(loadStudents, 300); // debounce
});
$("search-btn").addEventListener("click", searchStudent);
$("search-id").addEventListener("keydown", (e) => e.key === "Enter" && searchStudent());