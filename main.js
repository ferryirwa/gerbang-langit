/* main.js — Admin logic (premium)
   - Upload foto dari komputer (disimpan sebagai base64)
   - Testimoni berfungsi penuh
   - Sinkron ke public via localStorage (publik baca key 'paket','fasilitas','testimoni','bookings')
*/

/* ---------------- auth check ---------------- */
if (localStorage.getItem("admin") !== "true") {
  window.location.href = "login.html";
}

/* ---------------- Utilities ---------------- */
const LS = {
  get(k, d) {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; }
    catch (e) { return d; }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  rm(k) { localStorage.removeItem(k); }
};
function q(id){ return document.getElementById(id); }
function fmt(n){ return "Rp " + Number(n || 0).toLocaleString("id-ID"); }
function now(){ return new Date().toISOString(); }
function genId(){ return 'id_' + Math.random().toString(36).slice(2,9); }
function toast(msg, t=3000){
  const box = q('toast');
  if(!box){
    const el = document.createElement('div');
    el.id='toast';
    el.style= 'position:fixed;right:20px;bottom:20px;background:#0c4b91;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999;display:none;';
    document.body.appendChild(el);
  }
  q('toast').innerText = msg;
  q('toast').style.display = 'block';
  setTimeout(()=> q('toast').style.display = 'none', t);
}

/* ---------------- Data init / migration ---------------- */
let paket = LS.get('paket', []);
let fasilitas = LS.get('fasilitas', []);
let bookings = LS.get('bookings', []) || LS.get('pesanan', []) || [];
let riwayat = LS.get('riwayat', []);
// testimoni stored under 'testimoni'
let testimoni = LS.get('testimoni', []);

// migrate old 'pesanan' -> 'bookings'
(function migrate(){
  const p = LS.get('pesanan', null);
  if(p && Array.isArray(p) && p.length && !LS.get('bookings',[]).length){
    bookings = p;
    LS.set('bookings', bookings);
  }
})();




// seed demo if empty
(function seed(){
  if(!paket.length){
    paket = [
      { id: genId(), nama: 'Trip Bromo Sunrise', harga: 550000, deskripsi:'Jeep Offroad • Guide Lokal', gambar: '' },
      { id: genId(), nama: 'Labuan Bajo Live On Board', harga: 3250000, deskripsi:'Kapal Phinisi • Makan 3x', gambar: '' }
    ];
    LS.set('paket', paket);
  }
  if(!fasilitas.length){
    fasilitas = [
      { id: genId(), nama:'Transport AC', ket:'Mobil / Bus sesuai rombongan', icon:'' },
      { id: genId(), nama:'Driver & Guide', ket:'Guide ramah & berpengalaman', icon:'' }
    ];
    LS.set('fasilitas', fasilitas);
  }
  if(!bookings.length){
    bookings = [
      { id: genId(), nama:'Andi', paket:paket[0].nama, jumlah:2, total: paket[0].harga * 2, waktu: new Date().toISOString() }
    ];
    LS.set('bookings', bookings);
  }
  if(!testimoni.length){
    testimoni = [
      { id: genId(), text: 'Sunrise Bromo luar biasa! Pelayanan mantap 👍', foto: '' },
      { id: genId(), text: 'Live on board 3 hari pengalaman tak terlupakan!', foto: '' }
    ];
    LS.set('testimoni', testimoni);
    LS.set('testimoni_public', testimoni);
  }
})();

function persistAll(){
  LS.set('paket', paket);
  LS.set('fasilitas', fasilitas);
  LS.set('bookings', bookings);
  LS.set('riwayat', riwayat);
  LS.set('testimoni', testimoni);
  // make sure public can read same keys
  // (public pages listen to 'paket', 'fasilitas', 'testimoni', 'bookings')
}

/* ----------------- UI / Routing ----------------- */
const app = q('app') || (function(){ const d=document.createElement('div'); d.id='app'; document.body.appendChild(d); return d; })();

function showPage(page){
  document.querySelectorAll('.sidebar a').forEach(a=> a.classList.remove('active'));
  const menu = q('m-'+page);
  if(menu) menu.classList.add('active');
  if(page === 'dashboard') return renderDashboard();
  if(page === 'pesanan') return renderPesanan();
  if(page === 'paket') return renderPaketManager();
  if(page === 'fasilitas') return renderFasilitasManager();
  if(page === 'testimoni') return renderTestimoniManager();
  if(page === 'tools') return renderTools();
  renderDashboard();
}

/* ===== NOTIF BADGE ===== */
function updateNotifBadge(){
  const unread = bookings.filter(b=>!b.read).length;
  const badge = q("notif");
  if(!badge) return;

  if(unread>0){
    badge.textContent = unread;
    badge.style.display="inline-block";
  }else{
    badge.style.display="none";
  }
}

/* ---------------- Dashboard ---------------- */
function renderDashboard(){

  // 🔥 PENTING: reload data terbaru
  bookings = LS.get('bookings', []);
  paket = LS.get('paket', []);

  const totalPesanan = bookings.length;
  const income = bookings.reduce((s,b)=> s + (Number(b.total)||0),0);
  const totalPaket = paket.length;

  app.innerHTML = `

    <!-- HEADER -->
    <div class="dash-header">
      <h2>DASHBOARD</h2>
<div class="notif-icon" style="position:relative;cursor:pointer" onclick="scrollToWeekly()">
  🔔
  <span id="notif" class="notif-badge" style="display:none">0</span>
</div>
    </div>

    <!-- STAT CARDS -->
    <div class="stat-grid">
      <div class="stat-card">
        <span>Total Pesanan</span>
        <strong>${totalPesanan}</strong>
      </div>
      <div class="stat-card">
        <span>Total Pendapatan</span>
        <strong>${fmt(income)}</strong>
      </div>
      <div class="stat-card">
        <span>Jumlah Paket</span>
        <strong>${totalPaket}</strong>
      </div>
      <div class="stat-card">
        <span>Pesanan Minggu Ini</span>
        <strong id="weeklyCount">0</strong>
      </div>
    </div>

    <!-- RINGKASAN -->
    <div class="card">
      <h4>Ringkasan</h4>
      <table id="dashTable" class="simple-table">
        <tr>
          <th>Paket</th>
          <th>Harga</th>
          <th>Terjual</th>
        </tr>
      </table>
    </div>

   <!-- PESANAN MINGGU INI -->
<div class="card">
  <h4>Pesanan Minggu Ini</h4>
  <table class="simple-table" id="weeklyTable">
    <tr>
      <th>Nama</th>
      <th>Paket</th>
      <th>Waktu</th>
    </tr>
  </table>
</div>

  `;

  renderDashTable();
  renderWeeklyCount();
  renderWeeklyTable();
  updateNotifBadge();
}

function renderDashTable(){
  const tbl = q('dashTable');
  if(!tbl) return;

  let html = `
    <tr>
      <th>Paket</th>
      <th>Harga</th>
      <th>Terjual</th>
    </tr>
  `;

  if(!paket.length){
    html += `<tr><td colspan="3" class="small">Belum ada paket</td></tr>`;
    tbl.innerHTML = html;
    return;
  }

  paket.forEach(p=>{
    const terjual = bookings
      .filter(b => b.paket === p.nama)
      .reduce((s,b)=> s + (Number(b.jumlah)||1), 0);

    html += `
      <tr>
        <td>${p.nama}</td>
        <td>${fmt(p.harga)}</td>
        <td>${terjual}</td>
      </tr>
    `;
  });

  tbl.innerHTML = html;
}


/* ---------------- Pesanan ---------------- */
function renderPesanan(){
  app.innerHTML = `
    <div class="topbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>
        <h2>Data Pesanan</h2>
        <div class="small">Pesanan masuk dari publik</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" onclick="markAllDone()">Pindah ke Riwayat</button>
        <button class="btn ghost" onclick="exportCSV()">Export CSV</button>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <table id="tablePesanan" class="responsive-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nama</th>
            <th>Paket</th>
            <th>Jumlah</th>
            <th>Total</th>
            <th>Waktu</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="card" style="margin-top:12px">
      <h4>Riwayat Pesanan</h4>
      <table id="tableRiwayat" class="responsive-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Paket</th>
            <th>Total</th>
            <th>Waktu</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  renderBookingsTable();
  renderRiwayatTable();
}


function renderBookingsTable(){
  const tbl = q('tablePesanan');
  if(!tbl) return;

  let html = `
    <tr>
      <th>#</th>
      <th>Nama</th>
      <th>Paket</th>
      <th>Jumlah</th>
      <th>Total</th>
      <th>Waktu</th>
      <th>Aksi</th>
    </tr>
  `;

  bookings.forEach((b,i)=>{
    html += `
      <tr>
        <td data-label="#">${i+1}</td>
        <td data-label="Nama">${b.nama}</td>
        <td data-label="Paket">${b.paket}</td>
        <td data-label="Jumlah">${b.jumlah || 1}</td>
        <td data-label="Total">${fmt(b.total)}</td>
        <td data-label="Waktu">${new Date(b.waktu).toLocaleString()}</td>
        <td data-label="Aksi">
          <button class="btn" onclick="markDone(${i})">✔</button>
          <button class="btn ghost" onclick="deleteBooking(${i})">🗑</button>
        </td>
      </tr>
    `;
  });

  tbl.innerHTML = html;
}


function renderRiwayatTable(){
  const tbl = q('tableRiwayat');
  if(!tbl) return;
  let html = `<tr><th>Nama</th><th>Paket</th><th>Total</th><th>Waktu</th></tr>`;
  riwayat.forEach(r=>{
    html += `<tr><td>${r.nama}</td><td>${r.paket}</td><td>${fmt(r.total||0)}</td><td>${new Date(r.waktu).toLocaleString()}</td></tr>`;
  });
  tbl.innerHTML = html;
}

function markDone(index){
  const b = bookings[index];
  if(!b) return;
  riwayat.push({...b, selesaiAt: now()});
  bookings.splice(index,1);
  persistAll();
  toast('Pesanan dipindahkan ke riwayat');
  renderPesanan();
  updateNotifBadge();
}
function deleteBooking(index){
  if(!confirm('Hapus pesanan?')) return;
  bookings.splice(index,1);
  persistAll();
  renderBookingsTable();
  updateNotifBadge();
}
function markAllDone(){
  if(!bookings.length){ toast('Tidak ada pesanan'); return; }
  bookings.forEach(b=> riwayat.push({...b, selesaiAt: now()}));
  bookings = [];
  persistAll();
  renderPesanan();
  updateNotifBadge();
  toast('Semua pesanan dipindahkan');
}

/* ---------------- Paket Manager ---------------- */
function renderPaketManager(){
  app.innerHTML = `
    <div class="topbar" style="display:flex;justify-content:space-between;align-items:center">
      <div><h2>Kelola Paket</h2><div class="small">Tambah / edit / hapus paket</div></div>
      <div><button class="btn" onclick="openPaketForm()">Tambah Paket</button></div>
    </div>

    <div id="paketFormArea"></div>

    <div class="card" style="margin-top:12px">
      <table id="tablePaket" style="width:100%;border-collapse:collapse">
        <tr><th>#</th><th>Nama</th><th>Harga</th><th>Gambar</th><th>Aksi</th></tr>
      </table>
    </div>
  `;
  renderPaketTable();
}

function renderPaketTable(){
  const tbl = q('tablePaket');
  if(!tbl) return;
  let html = `<tr><th>#</th><th>Nama</th><th>Harga</th><th>Gambar</th><th>Aksi</th></tr>`;
  paket.forEach((p,i)=>{
    const img = p.gambar ? `<img src="${p.gambar}" style="width:100px;height:60px;object-fit:cover;border-radius:6px">` : '—';
    html += `<tr>
      <td>${i+1}</td>
      <td>${p.nama}</td>
      <td>${fmt(p.harga)}</td>
      <td>${img}</td>
      <td>
        <button class="btn" onclick="openPaketForm(${i})">Edit</button>
        <button class="btn ghost" onclick="deletePaket(${i})">Hapus</button>
      </td>
    </tr>`;
  });
  tbl.innerHTML = html;
}

function openPaketForm(index){
  const area = q('paketFormArea');
  const editing = typeof index === 'number';
  const data = editing ? paket[index] : { nama:'', harga:'', deskripsi:'', gambar:'' };

  area.innerHTML = `
    <div class="card" style="padding:12px">
      <h4>${editing ? 'Edit Paket' : 'Tambah Paket'}</h4>
      <div style="display:grid;gap:8px">
        <input id="p_nama" placeholder="Nama paket" value="${escapeHtml(data.nama)}">
        <input id="p_harga" placeholder="Harga (angka)" value="${data.harga}">
        <input id="p_des" placeholder="Deskripsi singkat" value="${escapeHtml(data.deskripsi||'')}">
        <div style="display:flex;gap:8px;align-items:center">
          <input id="p_gambar_url" placeholder="URL gambar (opsional)" value="${data.gambar||''}" style="flex:1">
          <input id="p_gambar_file" type="file" accept="image/*" style="width:180px">
        </div>
        <div id="p_preview" style="height:120px;border:1px dashed #ddd;display:flex;align-items:center;justify-content:center">${data.gambar ? `<img src="${data.gambar}" style="max-width:100%;max-height:100%;object-fit:cover">` : 'Preview gambar'}</div>
        <div style="display:flex;gap:8px">
          <button class="btn" id="savePaket">${editing ? 'Simpan Perubahan' : 'Tambah Paket'}</button>
          <button class="btn ghost" onclick="q('paketFormArea').innerHTML=''">Batal</button>
        </div>
      </div>
    </div>
  `;

  // file -> base64 with validation
  const fileInput = q('p_gambar_file');
  if(fileInput){
    fileInput.addEventListener('change', async (e)=>{
      const f = e.target.files[0];
      if(!f) return;
      if(!f.type.startsWith('image/')) return alert('File bukan gambar');
      if(f.size > 2_500_000) { // ~2.5MB limit
        if(!confirm('File lebih dari 2.5MB. Tetap lanjut (akan dikompres otomatis bergantung browser)?')) return;
      }
      try {
        const b64 = await fileToBase64(f);
        q('p_preview').innerHTML = `<img src="${b64}" style="max-width:100%;max-height:100%;object-fit:cover">`;
        q('p_gambar_url').value = b64;
      } catch(err){
        console.error(err); alert('Gagal membaca file');
      }
    });
  }

  q('savePaket').onclick = function(){
    const nama = q('p_nama').value.trim();
    const harga = Number(q('p_harga').value) || 0;
    const des = q('p_des').value.trim();
    const gambar = q('p_gambar_url').value.trim();
    if(!nama) return alert('Isi nama paket');
    if(editing){
      paket[index] = { ...paket[index], nama, harga, deskripsi:des, gambar };
      toast('Paket diperbarui');
    } else {
      paket.push({ id: genId(), nama, harga, deskripsi:des, gambar });
      toast('Paket ditambahkan');
    }
    persistAll();
    // ensure public sees latest paket (public reads 'paket' key)
    renderPaketTable();
    openPaketForm(); // clear form area by re-render manager
    renderPaketManager();
    renderDashboard();
  };
}

function deletePaket(i){
  if(!confirm('Hapus paket ini?')) return;
  paket.splice(i,1);
  persistAll();
  renderPaketTable();
  renderDashboard();
  toast('Paket dihapus');
}

/* ---------------- Fasilitas Manager ---------------- */
function renderFasilitasManager(){
  app.innerHTML = `
    <div class="topbar" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <h2>Fasilitas</h2>
        <div class="small">Tambah / edit fasilitas</div>
      </div>
      <div><button class="btn" onclick="openFasForm()">Tambah Fasilitas</button></div>
    </div>

    <div id="fasFormArea"></div>

    <div class="card" style="margin-top:12px">
      <table id="tableFas" style="width:100%;border-collapse:collapse">
        <tr>
          <th>#</th>
          <th>Icon</th>
          <th>Nama</th>
          <th>Keterangan</th>
          <th>Aksi</th>
        </tr>
      </table>
    </div>
  `;
  renderFasilitasTable();
}

function renderFasilitasTable(){
  const tbl = q('tableFas');
  if(!tbl) return;

  let html = `
    <tr>
      <th>#</th>
      <th>Icon</th>
      <th>Nama</th>
      <th>Keterangan</th>
      <th>Aksi</th>
    </tr>
  `;

  fasilitas.forEach((f,i)=>{
    html += `
      <tr>
        <td>${i+1}</td>
        <td>${f.icon ? `<img src="${f.icon}" style="width:35px;height:35px;border-radius:6px;object-fit:cover;">` : '-'}</td>
        <td>${f.nama}</td>
        <td>${f.ket||'-'}</td>
        <td>
          <button class="btn" onclick="openFasForm(${i})">Edit</button>
          <button class="btn ghost" onclick="deleteFas(${i})">Hapus</button>
        </td>
      </tr>
    `;
  });

  tbl.innerHTML = html;
}

function openFasForm(index){
  const editing = typeof index === "number";
  const data = editing ? fasilitas[index] : { nama:'', ket:'', icon:'' };

  q('fasFormArea').innerHTML = `
    <div class="card" style="padding:12px">
      <h4>${editing ? "Edit Fasilitas" : "Tambah Fasilitas"}</h4>

      <input id="f_nama" placeholder="Nama fasilitas" value="${escapeHtml(data.nama)}">
      <input id="f_ket" placeholder="Keterangan" value="${escapeHtml(data.ket||'')}">

      <label style="margin-top:8px;font-weight:bold">Icon Fasilitas (maks 2MB)</label>
      <input id="f_icon" type="file" accept="image/*">

      <div id="f_preview" style="margin-top:10px">
        ${data.icon ? `<img src="${data.icon}" style="width:60px;height:60px;border-radius:6px;object-fit:cover;">` : ''}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" id="saveFas">${editing ? "Simpan" : "Tambah"}</button>
        <button class="btn ghost" onclick="q('fasFormArea').innerHTML=''">Batal</button>
      </div>
    </div>
  `;

  // Preview ketika upload icon baru
  q('f_icon').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;

    if(!f.type.startsWith('image/')){
      alert("File bukan gambar"); return;
    }
    if(f.size > 2 * 1024 * 1024){
      alert("Maksimal 2MB"); return;
    }

    const rd = new FileReader();
    rd.onload = ev=>{
      q('f_preview').innerHTML = `<img src="${ev.target.result}" style="width:60px;height:60px;border-radius:6px;object-fit:cover;">`;
    };
    rd.readAsDataURL(f);
  });

  q('saveFas').onclick = ()=> saveFasilitas(index);
}

function saveFasilitas(index){
  const nama = q('f_nama').value.trim();
  const ket = q('f_ket').value.trim();
  const file = q('f_icon').files[0];

  if(!nama) return alert("Isi nama fasilitas");

  const finish = (iconBase64)=>{
    if(typeof index === "number"){
      fasilitas[index] = { ...fasilitas[index], nama, ket, icon: iconBase64 };
      toast("Fasilitas diperbarui");
    } else {
      fasilitas.push({ id: genId(), nama, ket, icon: iconBase64 });
      toast("Fasilitas ditambahkan");
    }

    persistAll();
    renderFasilitasManager();
    renderDashboard();
  };

  // Jika tidak upload icon baru → pakai icon lama
  if(!file){
    finish(typeof index === "number" ? fasilitas[index].icon : "");
    return;
  }

  if(file.size > 2 * 1024 * 1024){
    alert("Icon maksimal 2MB");
    return;
  }

  const rd = new FileReader();
  rd.onload = e=> finish(e.target.result);
  rd.readAsDataURL(file);
}

function deleteFas(i){
  if(!confirm("Hapus fasilitas?")) return;
  fasilitas.splice(i,1);
  persistAll();
  renderFasilitasTable();
  toast("Fasilitas dihapus");
}

/* ---------------- Testimoni Manager (FIXED NO URL FIELD) ---------------- */

// --- Ambil data ---
function getTestimoni() {
  return JSON.parse(localStorage.getItem("testimoni") || "[]");
}

// --- Simpan data ---
function saveTestimoni(data) {
  localStorage.setItem("testimoni", JSON.stringify(data));
}

// --- Resize & Kompres Foto ---
function resizeImage(file, callback) {
  if (!file.type.startsWith("image/")) {
    alert("File bukan gambar");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const MAX = 300; // Aman untuk localStorage

      let w = img.width;
      let h = img.height;

      if (w > h) {
        if (w > MAX) {
          h *= MAX / w;
          w = MAX;
        }
      } else {
        if (h > MAX) {
          w *= MAX / h;
          h = MAX;
        }
      }

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      const compressed = canvas.toDataURL("image/jpeg", 0.6); 
      callback(compressed);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// --- Render Halaman Testimoni ---
function renderTestimoniManager() {
  let testimoni = getTestimoni();

  app.innerHTML = `
    <div class="topbar" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <h2>Testimoni</h2>
        <div class="small">Kelola foto & nama testimoni</div>
      </div>
      <div><button class="btn" onclick="openTestiForm()">Tambah Testimoni</button></div>
    </div>

    <div id="testiFormArea"></div>

    <div class="card" style="margin-top:12px">
      <table id="tableTesti" style="width:100%;border-collapse:collapse">
        <tr><th>#</th><th>Foto</th><th>Nama</th><th>Aksi</th></tr>
      </table>
    </div>
  `;

  const tbl = document.getElementById("tableTesti");
  let html = `<tr><th>#</th><th>Foto</th><th>Nama</th><th>Aksi</th></tr>`;

  testimoni.forEach((t, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td><img src="${t.foto}" style="width:100px;height:60px;object-fit:cover;border-radius:6px"></td>
        <td>${t.nama}</td>
        <td>
          <button class="btn" onclick="openTestiForm(${i})">Edit</button>
          <button class="btn ghost" onclick="deleteTesti(${i})">Hapus</button>
        </td>
      </tr>`;
  });

  tbl.innerHTML = html;
}

// --- Form Tambah / Edit ---
function openTestiForm(index) {
  const editing = typeof index === "number";
  const arr = getTestimoni();
  const data = editing ? arr[index] : { nama: "", foto: "" };

  document.getElementById("testiFormArea").innerHTML = `
    <div class="card" style="padding:12px">
      <h4>${editing ? "Edit Testimoni" : "Tambah Testimoni"}</h4>

      <input id="ti_nama" placeholder="Nama" value="${data.nama || ""}" style="margin-bottom:8px">

      <input id="ti_file" type="file" accept="image/*">

      <div id="ti_preview"
        style="height:130px;border:1px dashed #ddd;margin-top:8px;display:flex;align-items:center;justify-content:center">
        ${data.foto ? `<img src="${data.foto}" style="max-width:100%;max-height:100%;object-fit:cover">` : "Preview"}
      </div>

      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn" id="saveTesti">${editing ? "Simpan" : "Tambah"}</button>
        <button class="btn ghost" onclick="document.getElementById('testiFormArea').innerHTML=''">Batal</button>
      </div>
    </div>
  `;

  // --- HANDLE FILE UPLOAD ---
  let finalFoto = data.foto || "";

  document.getElementById("ti_file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resizeImage(file, (compressedB64) => {
      finalFoto = compressedB64;

      document.getElementById("ti_preview").innerHTML =
        `<img src="${compressedB64}" style="max-width:100%;max-height:100%;object-fit:cover">`;
    });
  });

  // --- SIMPAN DATA ---
  document.getElementById("saveTesti").onclick = function () {
    const nama = document.getElementById("ti_nama").value.trim();
    if (!nama) return alert("Nama wajib diisi!");
    if (!finalFoto) return alert("Upload foto terlebih dahulu!");

    if (editing) {
      arr[index] = { ...arr[index], nama, foto: finalFoto };
    } else {
      arr.push({ id: Date.now(), nama, foto: finalFoto });
    }

    saveTestimoni(arr);
    renderTestimoniManager();
  };
}

// --- Hapus ---
function deleteTesti(i) {
  let arr = getTestimoni();
  arr.splice(i, 1);
  saveTestimoni(arr);
  renderTestimoniManager();
}

/* ---------------- Tools / Backup / Sync ---------------- */
function renderTools(){
  app.innerHTML = `
    <div class="topbar" style="display:flex;justify-content:space-between;align-items:center">
      <div><h2>Alat & Backup</h2><div class="small">Export / Restore</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
      <div class="card">
        <h4>Backup / Restore</h4>
        <p class="small">Download backup JSON atau restore dari file.</p>
        <div style="display:flex;gap:8px;align-items:center"><button class="btn" onclick="backupData()">Download Backup</button> <input type="file" id="restoreFile"></div>
      </div>

      <div class="card">
        <h4>Sync Publik → Admin</h4>
        <p class="small">Tarik data pesanan dari key publik (bookings/pesanan)</p>
        <button class="btn" onclick="syncFromLocal()">Sync Now</button>
      </div>

      <div class="card">
        <h4>Reset Demo</h4>
        <p class="small">Reset data demo (paket/fasilitas/pesanan/testimoni)</p>
        <button class="btn ghost" onclick="resetDemo()">Reset Demo</button>
      </div>
    </div>
  `;

  const rf = q('restoreFile');
  rf.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      try {
        const obj = JSON.parse(r.result);
        if(obj.paket) paket = obj.paket;
        if(obj.fasilitas) fasilitas = obj.fasilitas;
        if(obj.bookings) bookings = obj.bookings;
        if(obj.riwayat) riwayat = obj.riway;
        if(obj.testimoni) testimoni = obj.testimoni;
        persistAll();
        toast('Restore berhasil');
        showPage('dashboard');
      } catch(err){ alert('File tidak valid'); }
    };
    r.readAsText(f);
  });
}

function exportCSV(){
  const rows = [['type','nama','paket','jumlah','total','waktu']];
  bookings.forEach(b=> rows.push(['booking', b.nama, b.paket, b.jumlah||1, b.total||0, b.waktu]));
  riwayat.forEach(r=> rows.push(['riwayat', r.nama, r.paket, r.jumlah||1, r.total||0, r.waktu]));
  const csv = rows.map(r=> r.map(c=> `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pesanan_export.csv'; a.click();
}

function backupData(){
  const payload = { paket, fasilitas, bookings, riwayat, testimoni, exportedAt: now() };
  const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_gerbanglangit.json'; a.click();
}

function syncFromLocal(){
  const other = LS.get('bookings', null) ?? LS.get('pesanan', null);
  if(!other || !Array.isArray(other)) return toast('Tidak ada data bookings di localStorage publik');
  const existing = new Set(bookings.map(b=> b.id ));
  let added = 0;
  other.forEach(b=>{
    if(!b.id) b.id = genId();
    if(!existing.has(b.id)){ bookings.push(b); existing.add(b.id); added++; }
  });
  if(added){
    persistAll();
    toast(`${added} pesanan baru disinkronkan`);
    updateNotifBadge();
    renderDashboard();
  } else toast('Tidak ada data baru untuk disinkronkan');
}

function resetDemo(){
  if(!confirm('Reset data demo? Semua data saat ini akan hilang.')) return;
  LS.rm('paket'); LS.rm('fasilitas'); LS.rm('bookings'); LS.rm('riwayat'); LS.rm('testimoni');
  location.reload();
}

/* ---------------- Notifications & realtime sync ---------------- */
function playNotif(){
  try {
    const a = new Audio(); a.src = 'data:audio/mp3;base64,//uQZ'; a.play().catch(()=>{});
  } catch(e){}
}
function updateNotifBadge(){
  const n = bookings.length;

  // BADGE
  const badge = q('notif');
  if(badge){
    if(n > 0){
      badge.style.display = 'inline-block';
      badge.textContent = n;
    } else {
      badge.style.display = 'none';
    }
  }

  // LOG DETAIL
  const log = q('notifLog');
  if(!log) return;

  if(!n){
    log.innerHTML = 'Tidak ada pesanan aktif';
    return;
  }

  const latest = bookings
    .slice(-5)
    .reverse()
    .map(b => `
      <div style="padding:6px 0;border-bottom:1px dashed #ddd">
        <strong>${b.nama}</strong><br>
        <span class="small">${b.paket}</span>
      </div>
    `)
    .join('');

  log.innerHTML = latest;
}


// listen storage events (other tab / public page)
window.addEventListener('storage', (ev)=>{
  if(ev.key === 'bookings' || ev.key === 'pesanan' || ev.key === 'bookings_last_update'){
    bookings = LS.get('bookings', []) || LS.get('pesanan', []) || [];
    persistAll();
    updateNotifBadge();
    renderCurrentPage();
    playNotif();
    toast('Pesanan baru diterima');
  }
});

// polling fallback (in case storage event not fired)
let prevCount = bookings.length;
setInterval(()=>{
  const cur = (LS.get('bookings', [])?.length || LS.get('pesanan', [])?.length || 0);
  if(cur > prevCount){
    bookings = LS.get('bookings', []) || LS.get('pesanan', []) || [];
    persistAll();
    updateNotifBadge();
    renderCurrentPage();
    playNotif();
    toast('Pesanan baru terdeteksi');
  }
  prevCount = cur;
}, 2000);

function renderCurrentPage(){
  const active = document.querySelector('.sidebar a.active');
  if(!active) return renderDashboard();
  const id = active.id?.replace('m-','') || 'dashboard';
  showPage(id);
}

/* ---------------- Helpers ---------------- */
function fileToBase64(file){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload = ()=> res(reader.result);
    reader.onerror = ()=> rej(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}
function escapeHtml(s){
  if(!s) return '';
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

/* ---------------- Public integration helper ---------------- */
// public page (index.html) can call addBookingPublic(...) to push booking into admin storage
window.addBookingPublic = function(b){
  // validate
  if(!b || !b.nama || !b.paket) return false;
  b.id = b.id || genId();
  b.waktu = b.waktu || new Date().toISOString();
  b.total = Number(b.total) || 0;
  bookings.push(b);
  persistAll();
  localStorage.setItem('bookings_last_update', new Date().toISOString());
  renderCurrentPage();
  updateNotifBadge();
  playNotif();
  return true;
};

/* ---------------- Init ---------------- */
persistAll();
showPage('dashboard');
console.info('Admin main.js (premium) loaded — upload foto + testimoni ready.');

document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const navbarMenu = document.getElementById("navbarMenu");

    if (!menuToggle || !navbarMenu) return;

    // Buka / tutup menu saat tombol hamburger diklik
    menuToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        navbarMenu.classList.toggle("show");
    });

    // Klik di luar sidebar untuk menutup
    document.addEventListener("click", (e) => {
        if (!navbarMenu.contains(e.target) && !menuToggle.contains(e.target)) {
            navbarMenu.classList.remove("show");
        }
    });

    // Klik menu item otomatis menutup sidebar
    navbarMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navbarMenu.classList.remove("show");
        });
    });

    
});


function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("active");
}



// dahboard tambahan//
function renderWeeklyCount(){
  const cutoff = (()=>{ 
    const d=new Date(); 
    d.setDate(d.getDate()-6); 
    d.setHours(0,0,0,0); 
    return d; 
  })();

  const total = bookings.filter(
    b => new Date(b.waktu) >= cutoff
  ).length;

  const el = q('weeklyCount');
  if(el) el.textContent = total;
}
function renderWeeklyTable(){
  const tbl = q('weeklyTable');
  if(!tbl) return;

  const cutoff = (()=>{ 
    const d=new Date(); 
    d.setDate(d.getDate()-6); 
    d.setHours(0,0,0,0); 
    return d; 
  })();

  const data = bookings
    .filter(b => new Date(b.waktu) >= cutoff)
    .sort((a,b)=> new Date(b.waktu) - new Date(a.waktu));

  let html = `
    <tr>
      <th>Nama</th>
      <th>Paket</th>
      <th>Waktu</th>
    </tr>
  `;

  if(!data.length){
    html += `<tr><td colspan="3" class="small">Belum ada pesanan minggu ini</td></tr>`;
  } else {
    data.forEach(b=>{
      html += `
        <tr>
          <td>${b.nama}</td>
          <td>${b.paket}</td>
          <td>${new Date(b.waktu).toLocaleString()}</td>
        </tr>
      `;
    });
  }

  tbl.innerHTML = html;
}
