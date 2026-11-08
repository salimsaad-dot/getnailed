// Getnailed Beauty Lounge
const WHATSAPP_NUMBER = "233502850772"; // international format, no "+" or leading 0
const TIMEZONE = "Africa/Accra";

// Opening hours by day (0 = Sunday ... 6 = Saturday). null = closed. Hours in 24h.
const HOURS = {
  0: [14, 20], // Sunday 2pm - 8pm
  1: null,     // Monday closed
  2: [8, 20],
  3: [8, 20],
  4: [8, 20],
  5: [8, 20],
  6: [8, 20],
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fmtHour = (h) => {
  const suffix = h >= 12 ? "pm" : "am";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${suffix}`;
};

// Current day + time in Ghana, whatever the visitor's own timezone is
function nowInGhana() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE, weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
}

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  /* ---------- Header + mobile menu ---------- */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const setMenu = (open) => {
    body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Live "Open now" status + today's row ---------- */
  const status = document.getElementById("status");
  const statusText = document.getElementById("statusText");

  function updateStatus() {
    const { day, minutes } = nowInGhana();
    const today = HOURS[day];

    document.querySelectorAll("#week tr").forEach((tr) => tr.classList.toggle("today", Number(tr.dataset.day) === day));

    if (today && minutes >= today[0] * 60 && minutes < today[1] * 60) {
      status.className = "status reveal in open";
      statusText.textContent = `Open now · closes ${fmtHour(today[1])}`;
      return;
    }

    // Find the next opening time
    let label = "";
    if (today && minutes < today[0] * 60) {
      label = `opens today at ${fmtHour(today[0])}`;
    } else {
      for (let i = 1; i <= 7; i++) {
        const d = (day + i) % 7;
        if (HOURS[d]) {
          label = `opens ${i === 1 ? "tomorrow" : DAY_NAMES[d]} at ${fmtHour(HOURS[d][0])}`;
          break;
        }
      }
    }
    status.className = "status reveal in closed";
    statusText.textContent = `Closed now · ${label}`;
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  /* ---------- Booking form → WhatsApp ---------- */
  const form = document.getElementById("bookForm");
  const service = document.getElementById("service");
  const dateInput = document.getElementById("date");
  const timeSel = document.getElementById("time");
  const hairField = document.getElementById("hairField");
  const err = document.getElementById("err");

  // Earliest bookable day = today (Ghana time)
  const todayGh = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date()); // YYYY-MM-DD
  dateInput.min = todayGh;

  // Service "Book" buttons pre-select the service
  document.querySelectorAll("[data-service]").forEach((btn) =>
    btn.addEventListener("click", () => { service.value = btn.dataset.service; toggleHair(); })
  );

  // Hair question only matters for braids & installs
  function toggleHair() {
    hairField.hidden = service.value === "Hair";
  }
  service.addEventListener("change", toggleHair);

  // Build time slots for the chosen day
  dateInput.addEventListener("change", () => {
    err.textContent = "";
    dateInput.classList.remove("invalid");
    timeSel.innerHTML = "";

    if (!dateInput.value) {
      timeSel.disabled = true;
      timeSel.append(new Option("Pick a day first", ""));
      return;
    }

    const day = new Date(dateInput.value + "T12:00").getDay();
    const hrs = HOURS[day];

    if (!hrs) {
      timeSel.disabled = true;
      timeSel.append(new Option("Closed that day", ""));
      dateInput.classList.add("invalid");
      err.textContent = `Sorry, we're closed on ${DAY_NAMES[day]}s. Please pick another day.`;
      return;
    }

    // If booking for today, hide slots that have passed
    const { minutes } = nowInGhana();
    const isToday = dateInput.value === todayGh;

    timeSel.append(new Option("Choose a time…", ""));
    let any = false;
    for (let h = hrs[0]; h < hrs[1]; h++) {
      if (isToday && h * 60 <= minutes) continue;
      timeSel.append(new Option(fmtHour(h), fmtHour(h)));
      any = true;
    }
    timeSel.disabled = !any;
    if (!any) {
      timeSel.innerHTML = "";
      timeSel.append(new Option("No more slots today", ""));
      err.textContent = "No slots left today. Please choose another day.";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    err.textContent = "";
    form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));

    const missing = [service, dateInput, timeSel, document.getElementById("name")].filter((el) => !el.value.trim());
    if (missing.length) {
      missing.forEach((el) => el.classList.add("invalid"));
      (missing[0].disabled ? dateInput : missing[0]).focus();
      err.textContent = "Please fill in the highlighted fields.";
      return;
    }

    const d = new Date(dateInput.value + "T12:00");
    const niceDate = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const style = document.getElementById("style").value.trim();
    const notes = document.getElementById("notes").value.trim();

    const lines = [
      "Hello Getnailed! I'd like to book an appointment.",
      "",
      `*Service:* ${service.value}${style ? ` (${style})` : ""}`,
      `*Day:* ${niceDate}`,
      `*Time:* ${timeSel.value}`,
    ];
    if (!hairField.hidden) lines.push(`*Hair:* ${form.hair.value}`);
    lines.push(`*Name:* ${document.getElementById("name").value.trim()}`);
    if (notes) lines.push(`*Notes:* ${notes}`);

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
  });

  document.getElementById("year").textContent = new Date().getFullYear();
});
