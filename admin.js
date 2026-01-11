// ================= CEK LOGIN =================
if (localStorage.getItem("admin") != "true") location.href = "login.html";

function logout() {
  localStorage.removeItem("admin");
  location.href = "login.html";
}

// ================= ROUTER =================
function loadPage(page) {
  if (page === "dashboard") return dashboard();
  if (page === "pesanan") return pesanan();
  if (page === "paket") return paket();
  if (page === "fasilitas") return fasilitas();
  if (page === "testimoni") return testimoni();
}




// ================= GETTERS =================
function getPaket() {
  return JSON.parse(localStorage.getItem("paket") || "[]");
}

function getFasilitas() {
  return JSON.parse(localStorage.getItem("fasilitas") || "[]");
}

function getTestimoni() {
  return JSON.parse(localStorage.getItem("testimoni") || "[]");
}

// ================= DASHBOARD =================
function dashboard() {
  let db = JSON.parse(localStorage.getItem("bookings") || "[]");

  app.innerHTML = `
    <h2>Dashboard Admin</h2>

    <div class="stats">
      <div class="stat-card">Total Pesanan <br><b>${db.length}</b></div>
      <div class="stat-card">Total Paket <br><b>${getPaket().length}</b></div>
      <div class="stat-card">Total Fasilitas <br><b>${getFasilitas().length}</b></div>
      <div class="stat-card">Total Testimoni <br><b>${getTestimoni().length}</b></div>
    </div>

    <div id="notif"></div>
  `;
}

// =======================================================
// ====================== PESANAN ========================
// =======================================================

function pesanan() {
  let db = JSON.parse(localStorage.getItem("bookings") || "[]");

  app.innerHTML = `
    <h2>Pesanan Masuk</h2>

    <button onclick="exportExcel()" class="btn">Export Excel</button>

    <div class="grid">
      ${db
        .map(
          (p) => `
        <div class="card">
          <h4>${p.nama}</h4>
          <p>${p.hp}</p>
          <p>${p.tanggal}</p>
          <p>Paket: ${p.paket}</p>
          <p>Jumlah: ${p.jumlah}</p>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

// EXPORT EXCEL
function exportExcel() {
  let data = localStorage.getItem("bookings");
  let blob = new Blob([data], { type: "application/vnd.ms-excel" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pesanan.xls";
  a.click();
}

// =======================================================
// ===================== CRUD PAKET ======================
// =======================================================

function paket() {
  let db = getPaket();

  app.innerHTML = `
    <h2>Kelola Paket Wisata</h2>

    <input id="paketNama" placeholder="Nama Paket">
    <input id="paketHarga" placeholder="Harga Paket (Rp)">
    <input id="paketFotoFile" type="file" accept="image/*">
    <button onclick="addPaket()">Tambah Paket</button>

    <h3>List Paket</h3>

    <div class="grid" id="paketList">
      ${db
        .map(
          (p) => `
          <div class="paket-card">
            <img src="${p.foto}">
            <h4>${p.nama}</h4>
            <p>Rp ${p.harga}</p>
            <button onclick="deletePaket(${p.id})" class="danger">Hapus</button>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

function addPaket() {
  let nama = paketNama.value.trim();
  let harga = paketHarga.value.trim();
  let file = paketFotoFile.files[0];

  if (!nama || !harga || !file) return alert("Lengkapi semua data!");

  if (file.size > 2 * 1024 * 1024)
    return alert("Foto maksimal 2 MB!");

  let reader = new FileReader();

  reader.onload = (e) => {
    let db = getPaket();

    db.push({
      id: Date.now(),
      nama,
      harga,
      foto: e.target.result,
    });

    localStorage.setItem("paket", JSON.stringify(db));
    paket();
  };

  reader.readAsDataURL(file);
}

function deletePaket(id) {
  let db = getPaket().filter((p) => p.id != id);
  localStorage.setItem("paket", JSON.stringify(db));
  paket();
}

// =======================================================
// ================== CRUD FASILITAS =====================
// =======================================================

function fasilitas() {
  let db = getFasilitas();

  app.innerHTML = `
    <h2>Kelola Fasilitas</h2>

    <input id="fasNama" placeholder="Nama fasilitas">
    <input id="fasFoto" type="file" accept="image/*">
    <button onclick="addFas()">Tambah Fasilitas</button>

    <h3>List Fasilitas</h3>

    <div class="grid">
      ${db
        .map(
          (f, i) => `
        <div class="card">
          <img src="${f.foto}">
          <h4>${f.nama}</h4>
          <button onclick="deleteFas(${i})" class="danger">Hapus</button>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function addFas() {
  let nama = fasNama.value.trim();
  let file = fasFoto.files[0];

  if (!nama || !file) return alert("Isi nama & pilih foto!");

  if (file.size > 2 * 1024 * 1024)
    return alert("Foto maksimal 2 MB!");

  let reader = new FileReader();

  reader.onload = (e) => {
    let db = getFasilitas();

    db.push({
      id: Date.now(),
      nama,
      foto: e.target.result,
    });

    localStorage.setItem("fasilitas", JSON.stringify(db));
    fasilitas();
  };

  reader.readAsDataURL(file);
}

function deleteFas(i) {
  let db = getFasilitas();
  db.splice(i, 1);
  localStorage.setItem("fasilitas", JSON.stringify(db));
  fasilitas();
}
// =======================================================
// ===============   CRUD TESTIMONI (FIXED)   ==============
// =======================================================

// Ambil data
function getTestimoni() {
  return JSON.parse(localStorage.getItem("testimoni") || "[]");
}

// Simpan
function saveTestimoni(data) {
  localStorage.setItem("testimoni", JSON.stringify(data));
}

// ========== Fungsi Resize Foto ==========
async function resizeImage(file, maxWidth = 900) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => (img.src = e.target.result);
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = maxWidth / img.width;

      canvas.width = img.width > maxWidth ? maxWidth : img.width;
      canvas.height = img.height * (img.width > maxWidth ? scale : 1);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", 0.8)); // kualitas 80%
    };
  });
}

// Render halaman
function renderTestimoniManager() {
  let data = getTestimoni();

  app.innerHTML = `
    <div class="topbar">
      <h2>Testimoni Foto</h2>
      <button class="btn" onclick="openTestiForm()">Tambah</button>
    </div>

    <div id="testiFormArea"></div>

    <div class="grid">
      ${data
        .map(
          (t, i) => `
          <div class="card">
            <img src="${t.foto}" style="width:100%;height:140px;object-fit:cover;border-radius:8px">
            <div>${t.nama}</div>
            <button class="danger" onclick="deleteTesti(${i})">Hapus</button>
          </div>`
        )
        .join("")}
    </div>
  `;
}

// Form tambah/edit
function openTestiForm(index = null) {
  const editing = index !== null;
  const data = editing ? getTestimoni()[index] : { nama: "", foto: "" };

  document.getElementById("testiFormArea").innerHTML = `
    <div class="card" style="padding:12px">
      <h3>${editing ? "Edit Testimoni" : "Tambah Testimoni"}</h3>

      <input id="ti_nama" placeholder="Nama" value="${data.nama}" style="margin-bottom:10px">
      <input id="ti_file" type="file" accept="image/*" style="margin-bottom:10px">

      <div id="ti_preview" style="height:140px;border:1px dashed #aaa;display:flex;align-items:center;justify-content:center;border-radius:8px">
        ${
          data.foto
            ? `<img src="${data.foto}" style="max-width:100%;max-height:100%">`
            : "Preview Foto"
        }
      </div>

      <button class="btn" id="saveTesti">${editing ? "Simpan" : "Tambah"}</button>
      <button class="btn ghost" onclick="document.getElementById('testiFormArea').innerHTML=''">Batal</button>
    </div>
  `;

  // preview + resize
  document.getElementById("ti_file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const resized = await resizeImage(file);

    document.getElementById("ti_preview").innerHTML =
      `<img src="${resized}" style="max-width:100%;max-height:100%">`;

    data.foto = resized; // simpan hasil resize
  });

  // Simpan
  document.getElementById("saveTesti").onclick = () => {
    const nama = document.getElementById("ti_nama").value.trim();
    if (!nama) return alert("Nama wajib diisi!");
    if (!data.foto) return alert("Foto belum dipilih!");

    let list = getTestimoni();

    if (editing) list[index] = data;
    else list.push(data);

    saveTestimoni(list);
    renderTestimoniManager();
  };
}

// Hapus
function deleteTesti(i) {
  let list = getTestimoni();
  list.splice(i, 1);
  saveTestimoni(list);
  renderTestimoniManager();
}


// =======================================================
// ================= NOTIFIKASI REALTIME =================
// =======================================================

setInterval(() => {
  let last = parseInt(localStorage.getItem("lastCount") || "0");
  let now = JSON.parse(localStorage.getItem("bookings") || "[]").length;

  if (now > last) {
    if (document.getElementById("notif")) {
      document.getElementById("notif").innerHTML =
        "🔔 Pesanan baru masuk!";
    }
  }

  localStorage.setItem("lastCount", now);
}, 1500);



function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("active");
}
