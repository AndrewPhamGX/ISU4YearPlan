const majors = {
  "Computer Science": [
    "COM S 227", "COM S 228", "COM S 311", "COM S 321", "COM S 309", "MATH 165", "MATH 166"
  ],
  "Software Engineering": [
    "SE 185", "SE 186", "SE 317", "SE 319", "COM S 227", "COM S 228", "MATH 165"
  ],
  "Mechanical Engineering": [
    "ME 170", "ME 270", "ME 325", "ME 231", "CHEM 167", "PHYS 221", "MATH 165"
  ],
  "Civil Engineering": [
    "CE 160", "CE 274", "CE 306", "CE 332", "CHEM 167", "PHYS 221", "MATH 165"
  ]
};

const semesters = [
  "Year 1 - Fall", "Year 1 - Spring",
  "Year 2 - Fall", "Year 2 - Spring",
  "Year 3 - Fall", "Year 3 - Spring",
  "Year 4 - Fall", "Year 4 - Spring"
];

const authSection = document.getElementById("authSection");
const plannerSection = document.getElementById("plannerSection");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const authMessage = document.getElementById("authMessage");
const planMessage = document.getElementById("planMessage");
const welcomeText = document.getElementById("welcomeText");
const majorSelect = document.getElementById("majorSelect");
const courseSelect = document.getElementById("courseSelect");
const semesterSelect = document.getElementById("semesterSelect");
const planGrid = document.getElementById("planGrid");

let currentUser = null;
let currentPlan = null;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function getUsers() {
  return readJson("isu4yp_users", {});
}

function saveUsers(users) {
  localStorage.setItem("isu4yp_users", JSON.stringify(users));
}

function defaultPlan(major) {
  return {
    major,
    schedule: Object.fromEntries(semesters.map((semester) => [semester, []]))
  };
}

function loadUserPlan(username) {
  const parsed = readJson(`isu4yp_plan_${username}`, null);
  if (!parsed) {
    return defaultPlan(Object.keys(majors)[0]);
  }
  const safeSchedule = Object.fromEntries(
    semesters.map((semester) => [semester, Array.isArray(parsed?.schedule?.[semester]) ? parsed.schedule[semester] : []])
  );

  return {
    major: parsed?.major && majors[parsed.major] ? parsed.major : Object.keys(majors)[0],
    schedule: safeSchedule
  };
}

function saveCurrentPlan() {
  if (!currentUser || !currentPlan) {
    return;
  }

  localStorage.setItem(`isu4yp_plan_${currentUser}`, JSON.stringify(currentPlan));
}

function renderCourses() {
  const selectedMajor = majorSelect.value;
  const courses = majors[selectedMajor] || [];
  courseSelect.innerHTML = courses.map((course) => `<option value="${course}">${course}</option>`).join("");
}

function renderPlan() {
  planGrid.innerHTML = semesters.map((semester) => {
    const courses = currentPlan.schedule[semester] || [];
    const list = courses.length
      ? `<ul>${courses.map((course) => `<li>${course}</li>`).join("")}</ul>`
      : "<p>No courses yet.</p>";

    return `<section class="semester"><h3>${semester}</h3>${list}</section>`;
  }).join("");
}

function setPlannerVisible(visible) {
  authSection.classList.toggle("hidden", visible);
  plannerSection.classList.toggle("hidden", !visible);
}

function login(username) {
  currentUser = username;
  currentPlan = loadUserPlan(username);
  majorSelect.value = currentPlan.major;
  welcomeText.textContent = `Welcome, ${username}!`;
  passwordInput.value = "";
  renderCourses();
  renderPlan();
  setPlannerVisible(true);
  planMessage.textContent = "";
}

function initializePlannerOptions() {
  majorSelect.innerHTML = Object.keys(majors)
    .map((major) => `<option value="${major}">${major}</option>`)
    .join("");

  semesterSelect.innerHTML = semesters
    .map((semester) => `<option value="${semester}">${semester}</option>`)
    .join("");
}

async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) {
    let hash = 5381;
    for (let index = 0; index < password.length; index += 1) {
      hash = ((hash << 5) + hash) ^ password.charCodeAt(index);
    }
    return `fallback-${hash >>> 0}`;
  }

  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

document.getElementById("createAccountBtn").addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    authMessage.textContent = "Please enter both username and password.";
    return;
  }

  const users = getUsers();
  if (users[username]) {
    authMessage.textContent = "Username already exists. Please log in.";
    return;
  }

  users[username] = { passwordHash: await hashPassword(password) };
  saveUsers(users);
  authMessage.textContent = "Account created. You are now logged in.";
  login(username);
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const users = getUsers();
  const passwordHash = await hashPassword(password);

  if (!users[username] || users[username].passwordHash !== passwordHash) {
    authMessage.textContent = "Invalid username or password.";
    return;
  }

  authMessage.textContent = "Logged in successfully.";
  login(username);
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  currentPlan = null;
  usernameInput.value = "";
  passwordInput.value = "";
  setPlannerVisible(false);
  authMessage.textContent = "Logged out.";
});

majorSelect.addEventListener("change", () => {
  if (!currentPlan) {
    return;
  }

  currentPlan.major = majorSelect.value;
  renderCourses();
  saveCurrentPlan();
});

document.getElementById("addCourseBtn").addEventListener("click", () => {
  if (!currentPlan) {
    return;
  }

  const semester = semesterSelect.value;
  const course = courseSelect.value;

  if (!semester || !course) {
    planMessage.textContent = "Choose a semester and course first.";
    return;
  }

  currentPlan.schedule[semester].push(course);
  saveCurrentPlan();
  renderPlan();
  planMessage.textContent = `Added ${course} to ${semester}.`;
});

document.getElementById("savePlanBtn").addEventListener("click", () => {
  saveCurrentPlan();
  planMessage.textContent = "Plan saved. You can log back in anytime to continue.";
});

initializePlannerOptions();
setPlannerVisible(false);
