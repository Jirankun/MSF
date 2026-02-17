// ============================================
// KONFIGURASI - LANGSUNG PAKAI IP TETAP
// ============================================
const API_KEY = '679635afb206ddeda18f1022c0d9c00c87d499731d2f88e2444f76b370fb95f1';
const BASE_URL = 'https://192.168.100.13:8000';

console.log('MobSF API Key:', API_KEY);
console.log('MobSF Base URL:', BASE_URL);

// ============================================
// FUNGSI KEEP AWAKE - MENJAGA LAYAR TETAP HIDUP
// ============================================

// Fungsi untuk menjaga layar tetap menyala
function keepAwake() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.insomnia) {
        // Gunakan plugin insomnia untuk menjaga layar tetap menyala
        cordova.plugins.insomnia.keepAwake();
        console.log('Keep awake diaktifkan');
    } else {
        console.warn('Plugin insomnia tidak tersedia. Fungsi keepAwake tidak akan berfungsi.');
    }
}

// Fungsi untuk mengembalikan perilaku normal layar (memungkinkan layar mati)
function allowSleep() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.insomnia) {
        // Kembalikan ke perilaku normal
        cordova.plugins.insomnia.allowSleepAgain();
        console.log('Allow sleep diaktifkan');
    } else {
        console.warn('Plugin insomnia tidak tersedia. Fungsi allowSleep tidak akan berfungsi.');
    }
}

// ============================================
// FUNGSI PENGECEKAN KONEKSI AWAL
// ============================================

// Variabel untuk pengecekan koneksi
let retryCount = 5;
let connectionCheckInterval;

// Fungsi untuk mengecek koneksi internet
function checkInternetConnection() {
    // Gunakan navigator.onLine untuk mengecek koneksi internet
    if (navigator.onLine) {
        // Koneksi internet tersedia, sembunyikan loading screen dan tampilkan app
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        // Hentikan interval
        clearInterval(connectionCheckInterval);
    } else {
        // Koneksi internet tidak tersedia, perbarui tampilan
        document.getElementById('initialProgressText').textContent = 'Tidak ada koneksi internet';
        document.getElementById('retryCount').textContent = retryCount;

        retryCount += 5; // Tambah waktu retry
    }
}

// Mulai pengecekan koneksi
document.addEventListener('DOMContentLoaded', function () {
    // Update progress bar secara bertahap
    let progress = 0;
    const progressBar = document.getElementById('initialProgressBar');
    const progressInterval = setInterval(() => {
        progress += 2;
        progressBar.style.width = progress + '%';

        if (progress >= 100) {
            clearInterval(progressInterval);
        }
    }, 100);

    // Coba koneksi setiap 5 detik
    connectionCheckInterval = setInterval(checkInternetConnection, 5000);

    // Lakukan pengecekan pertama setelah 1 detik
    setTimeout(checkInternetConnection, 1000);
    
    // Aktifkan keep awake saat DOM selesai dimuat
    setTimeout(keepAwake, 1000);
});

// Event listener untuk device siap (jika menggunakan Cordova)
document.addEventListener('deviceready', function() {
    // Aktifkan keep awake saat perangkat siap
    keepAwake();
}, false);

// Tambahkan event listener untuk tombol unggah dan scan
document.addEventListener('DOMContentLoaded', function () {
    const uploadButton = document.querySelector('button[onclick="uploadFile()"]');
    if (uploadButton) {
        uploadButton.addEventListener('click', function (event) {
            uploadFile(event);
        });
    }

    const scanButton = document.querySelector('button[onclick="startScan()"]');
    if (scanButton) {
        scanButton.addEventListener('click', function (event) {
            startScan(event);
        });
    }
});

// ============================================
// FUNGSI UPLOAD - SEDERHANA & LANGSUNG
// ============================================

async function uploadFile(event) { // Menambahkan parameter event
    const fileInput = document.getElementById('apkFile');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('uploadMessage', '⚠️ Silakan pilih file terlebih dahulu', 'warning');
        return;
    }

    // Validasi ekstensi file
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.apk')) {
        showMessage('uploadMessage', '⚠️ Hanya file APK yang diperbolehkan', 'warning');
        return;
    }

    // Validasi ukuran file (misalnya maksimal 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB dalam bytes
    if (file.size > maxSize) {
        showMessage('uploadMessage', `⚠️ Ukuran file terlalu besar. Maksimal ${maxSize / (1024 * 1024)}MB`, 'warning');
        return;
    }

    const button = event.target;
    button.disabled = true;
    button.textContent = '📤 Mengunggah...';

    // Tampilkan progress bar
    const progressContainer = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';

    showMessage('uploadMessage', '📤 Sedang mengunggah file...', 'info');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Update progress
        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = Math.round(percentComplete) + '%';
            }
        };

        xhr.onload = function () {
            // Sembunyikan progress bar setelah selesai
            progressContainer.style.display = 'none';

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    console.log('Upload result:', result);

                    if (result.hash) {
                        // Simpan hash
                        document.getElementById('scanHash').value = result.hash;

                        // Tampilkan section scan
                        document.getElementById('scanSection').style.display = 'block';

                        showMessage('uploadMessage', `✅ Upload berhasil! File APK: ${result.file_name || file.name}<br>Hash: ${result.hash}`, 'success');

                        // Scroll ke section scan
                        document.getElementById('scanSection').scrollIntoView({ behavior: 'smooth', block: 'center' });

                        button.disabled = false;
                        button.textContent = 'Unggah APK';

                        resolve(result);
                    } else {
                        throw new Error('Hash tidak ditemukan dalam response');
                    }
                } catch (error) {
                    console.error('Parse error:', error);

                    // Menangani error parsing JSON
                    button.disabled = false;
                    button.textContent = 'Unggah APK';

                    showMessage('uploadMessage', `❌ Gagal menguraikan respons: ${error.message}<br><small>Cek konsol browser untuk detail error</small>`, 'error');
                    reject(error);
                }
            } else {
                // Tangani error HTTP
                let errorMessage = `Upload gagal: ${xhr.status}`;
                if (xhr.status === 401) {
                    errorMessage = 'Upload gagal: Unauthorized - API Key salah atau tidak valid';
                } else if (xhr.status === 403) {
                    errorMessage = 'Upload gagal: Forbidden - Akses ditolak';
                } else if (xhr.status === 413) {
                    errorMessage = 'Upload gagal: Payload Too Large - File terlalu besar';
                } else if (xhr.status === 429) {
                    errorMessage = 'Upload gagal: Too Many Requests - Terlalu banyak permintaan';
                } else if (xhr.status >= 500) {
                    errorMessage = 'Upload gagal: Server Error - Kesalahan pada server MobSF';
                }

                button.disabled = false;
                button.textContent = 'Unggah APK';

                showMessage('uploadMessage', `❌ ${errorMessage}<br><small>Status: ${xhr.status}</small>`, 'error');
                reject(new Error(errorMessage));
            }
        };

        xhr.onerror = function () {
            // Sembunyikan progress bar saat error
            progressContainer.style.display = 'none';

            // Menangani error jaringan
            button.disabled = false;
            button.textContent = 'Unggah APK';

            showMessage('uploadMessage', `❌ Gagal menghubungi server. Pastikan server MobSF aktif dan alamat IP benar.<br><small>Cek konsol browser untuk detail error</small>`, 'error');
            reject(new Error('Network error'));
        };

        // Siapkan request
        xhr.open('POST', `${BASE_URL}/api/v1/upload`);
        xhr.setRequestHeader('X-Mobsf-Api-Key', API_KEY);

        // Kirim file
        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
    });
}

// ============================================
// FUNGSI SCAN
// ============================================

async function startScan(event) {
    const hash = document.getElementById('scanHash').value;
    const reScan = document.getElementById('reScanCheckbox').checked ? 1 : 0;

    if (!hash) {
        showMessage('scanMessage', '⚠️ Hash tidak valid', 'warning');
        return;
    }

    const button = event.target;
    button.disabled = true;
    button.textContent = '🔍 Memindai...';

    showMessage('scanMessage', '🔍 Memulai pemindaian keamanan...', 'info');

    try {
        // Tampilkan loading bar
        const loadingBox = document.getElementById('loadingBox');
        loadingBox.style.display = 'flex';

        // Tambahkan loading bar efek pulse untuk scan
        let pulseDirection = 1;
        let currentHeight = 20;
        const loadingBar = loadingBox.querySelector('.loading-bar');
        const pulseInterval = setInterval(() => {
            currentHeight += 2 * pulseDirection;
            if (currentHeight > 32) {
                pulseDirection = -1;
                currentHeight = 32;
            } else if (currentHeight < 12) {
                pulseDirection = 1;
                currentHeight = 12;
            }
            if (loadingBar) {
                loadingBar.style.height = `${currentHeight}px`;
                loadingBar.style.transform = `translateY(${(32 - currentHeight) / 2}px)`;
            }
        }, 100);

        // Request scan
        const response = await fetch(`${BASE_URL}/api/v1/scan`, {
            method: 'POST',
            headers: {
                'X-Mobsf-Api-Key': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `hash=${hash}&re_scan=${reScan}`
        });

        // Hentikan pulse interval
        clearInterval(pulseInterval);

        console.log('Scan response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Scan error response:', errorText);

            // Menangani berbagai jenis error HTTP
            let errorMessage = `Scan gagal: ${response.status}`;
            if (response.status === 401) {
                errorMessage = 'Scan gagal: Unauthorized - API Key salah atau tidak valid';
            } else if (response.status === 403) {
                errorMessage = 'Scan gagal: Forbidden - Akses ditolak';
            } else if (response.status === 404) {
                errorMessage = 'Scan gagal: Not Found - File tidak ditemukan di server';
            } else if (response.status === 429) {
                errorMessage = 'Scan gagal: Too Many Requests - Terlalu banyak permintaan';
            } else if (response.status >= 500) {
                errorMessage = 'Scan gagal: Server Error - Kesalahan pada server MobSF';
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('Scan result:', result);

        if (result.error) {
            throw new Error(result.error);
        }

        // Tampilkan hasil
        document.getElementById('resultOutput').textContent = JSON.stringify(result, null, 2);
        document.getElementById('resultSection').style.display = 'block';

        // Simpan hasil ke localStorage
        const fileName = document.getElementById('apkFile').files[0]?.name || 'Unknown';
        saveScanResult(hash, fileName, result);

        // Reset ke tab JSON setelah scan selesai
        switchToTab('jsonView', 'jsonTabBtn');

        showMessage('scanMessage', '✅ Pemindaian selesai! Hasil ditampilkan di bawah.', 'success');

        // Scroll ke hasil
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Pindah ke halaman history setelah scan selesai (opsional - bisa diaktifkan jika diinginkan)
        // switchToHistory();

    } catch (error) {
        console.error('Scan error:', error);

        // Menangani error jaringan atau error lainnya
        let errorMessage = error.message;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Gagal menghubungi server. Pastikan server MobSF aktif dan alamat IP benar.';
        }

        showMessage('scanMessage', `❌ Gagal memindai: ${errorMessage}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Jalankan Pemindaian';
        document.getElementById('loadingBox').style.display = 'none';
    }
}

// ============================================
// FUNGSI DOWNLOAD
// ============================================

async function downloadPDF(event) {
    const hash = document.getElementById('scanHash').value;
    if (!hash) return;

    const button = event.target;
    button.disabled = true;
    button.textContent = '📥 Mengunduh...';

    try {
        const response = await fetch(`${BASE_URL}/api/v1/download_pdf`, {
            method: 'POST',
            headers: {
                'X-Mobsf-Api-Key': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `hash=${hash}`
        });

        if (!response.ok) {
            // Menangani berbagai jenis error HTTP
            let errorMessage = `Download gagal: ${response.status}`;
            if (response.status === 401) {
                errorMessage = 'Download gagal: Unauthorized - API Key salah atau tidak valid';
            } else if (response.status === 403) {
                errorMessage = 'Download gagal: Forbidden - Akses ditolak';
            } else if (response.status === 404) {
                errorMessage = 'Download gagal: Not Found - Laporan tidak ditemukan';
            } else if (response.status === 429) {
                errorMessage = 'Download gagal: Too Many Requests - Terlalu banyak permintaan';
            } else if (response.status >= 500) {
                errorMessage = 'Download gagal: Server Error - Kesalahan pada server MobSF';
            }

            throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mobsf_report_${hash.substring(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Download PDF error:', error);
        alert(`Gagal download PDF: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = '📄 Download PDF';
    }
}

async function downloadJSON(event) {
    const hash = document.getElementById('scanHash').value;
    if (!hash) return;

    const button = event.target;
    button.disabled = true;
    button.textContent = '📥 Mengunduh...';

    try {
        const response = await fetch(`${BASE_URL}/api/v1/report_json`, {
            method: 'POST',
            headers: {
                'X-Mobsf-Api-Key': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `hash=${hash}`
        });

        if (!response.ok) {
            // Menangani berbagai jenis error HTTP
            let errorMessage = `Download gagal: ${response.status}`;
            if (response.status === 401) {
                errorMessage = 'Download gagal: Unauthorized - API Key salah atau tidak valid';
            } else if (response.status === 403) {
                errorMessage = 'Download gagal: Forbidden - Akses ditolak';
            } else if (response.status === 404) {
                errorMessage = 'Download gagal: Not Found - Laporan tidak ditemukan';
            } else if (response.status === 429) {
                errorMessage = 'Download gagal: Too Many Requests - Terlalu banyak permintaan';
            } else if (response.status >= 500) {
                errorMessage = 'Download gagal: Server Error - Kesalahan pada server MobSF';
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `mobsf_report_${hash.substring(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } catch (error) {
        console.error('Download JSON error:', error);
        alert(`Gagal download JSON: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = '💾 Download JSON';
    }
}

// Tambahkan event listener untuk tab setelah event listener sebelumnya
document.addEventListener('DOMContentLoaded', function () {
    const jsonTabBtn = document.getElementById('jsonTabBtn');
    const tableTabBtn = document.getElementById('tableTabBtn');

    if (jsonTabBtn && tableTabBtn) {
        jsonTabBtn.addEventListener('click', function () {
            switchToTab('jsonView', 'jsonTabBtn');
        });

        tableTabBtn.addEventListener('click', function () {
            switchToTab('tableView', 'tableTabBtn');
        });
    }
});

function switchToTab(viewId, btnId) {
    // Sembunyikan semua tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Hapus kelas aktif dari semua tombol tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-muted)';
        btn.style.borderBottom = '2px solid transparent';
    });

    // Tampilkan tab yang dipilih
    document.getElementById(viewId).style.display = 'block';

    // Aktifkan tombol tab yang dipilih
    const activeBtn = document.getElementById(btnId);
    activeBtn.classList.add('active');
    activeBtn.style.color = 'var(--text)';
    activeBtn.style.borderBottom = '2px solid var(--primary)';

    // Jika beralih ke tabel dan belum ada data tabel, buat tabel
    if (viewId === 'tableView') {
        const resultData = document.getElementById('resultOutput').textContent;
        if (resultData) {
            populateTableResult(JSON.parse(resultData));
        }
    }
}

// Fungsi untuk mengisi tampilan tabel
function populateTableResult(data) {
    const tableResultDiv = document.getElementById('tableResult');

    // Buat tabel untuk informasi utama APK
    let tableHTML = `
        <div class="table-section" style="margin-bottom: 2rem;">
          <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Informasi Utama APK</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: rgba(40, 40, 53, 0.8);">
                  <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 250px; width: 30%;">Parameter</th>
                  <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 400px; width: 70%;">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Nama Aplikasi</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.app_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Nama File</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.file_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Jenis File</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.app_type || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Ukuran</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.size || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">MD5 Hash</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.md5 || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">SHA1 Hash</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.sha1 || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">SHA256 Hash</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.sha256 || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Package Name</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.package_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Main Activity</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.main_activity || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Target SDK</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.target_sdk || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Min SDK</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.min_sdk || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Versi Nama</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.version_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Versi Kode</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.version_code || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

    // Tambahkan tabel untuk permissions jika ada
    if (data.permissions && Object.keys(data.permissions).length > 0) {
        tableHTML += `
          <div class="table-section" style="margin-bottom: 2rem;">
            <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Daftar Permissions</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(40, 40, 53, 0.8);">
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 200px; width: 35%;">Permission</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 100px; width: 15%;">Status</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 200px; width: 50%;">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const [permission, details] of Object.entries(data.permissions)) {
            const status = details.status || '-';
            const description = details.description || '-';
            const info = details.info || '-';

            tableHTML += `
            <tr>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${permission}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${status}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${description}</td>
            </tr>
          `;
        }

        tableHTML += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    // Tambahkan tabel untuk temuan keamanan jika ada
    if (data.appsec && data.appsec.high && data.appsec.high.length > 0) {
        tableHTML += `
          <div class="table-section" style="margin-bottom: 2rem;">
            <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Temuan Keamanan (High Risk)</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(40, 40, 53, 0.8);">
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 150px; width: 25%;">Judul</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 250px; width: 50%;">Deskripsi</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 100px; width: 25%;">Bagian</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const finding of data.appsec.high) {
            const title = finding.title || '-';
            const description = finding.description || '-';
            const section = finding.section || '-';

            tableHTML += `
            <tr>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${title}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${description}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${section}</td>
            </tr>
          `;
        }

        tableHTML += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    // Tambahkan tabel untuk temuan keamanan warning jika ada
    if (data.appsec && data.appsec.warning && data.appsec.warning.length > 0) {
        tableHTML += `
          <div class="table-section" style="margin-bottom: 2rem;">
            <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Temuan Keamanan (Warning)</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(40, 40, 53, 0.8);">
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 150px; width: 25%;">Judul</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 250px; width: 50%;">Deskripsi</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 100px; width: 25%;">Bagian</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const finding of data.appsec.warning) {
            const title = finding.title || '-';
            const description = finding.description || '-';
            const section = finding.section || '-';

            tableHTML += `
            <tr>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${title}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${description}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${section}</td>
            </tr>
          `;
        }

        tableHTML += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    tableResultDiv.innerHTML = tableHTML;
}

// ============================================
// FUNGSI HELPER
// ============================================

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="status-message ${type}">${message}</div>`;
}

// Fungsi untuk beralih ke halaman Home
function switchToHome() {
    document.getElementById('homeSection').style.display = 'block';
    document.getElementById('historySection').style.display = 'none';

    // Update active state pada bottom nav
    document.getElementById('homeNavBtn').classList.add('active');
    document.getElementById('homeNavBtn').style.color = 'var(--primary)';
    document.getElementById('historyNavBtn').classList.remove('active');
    document.getElementById('historyNavBtn').style.color = 'var(--text-muted)';
}

// Fungsi untuk beralih ke halaman History
function switchToHistory() {
    document.getElementById('homeSection').style.display = 'none';
    document.getElementById('historySection').style.display = 'block';

    // Update active state pada bottom nav
    document.getElementById('historyNavBtn').classList.add('active');
    document.getElementById('historyNavBtn').style.color = 'var(--primary)';
    document.getElementById('homeNavBtn').classList.remove('active');
    document.getElementById('homeNavBtn').style.color = 'var(--text-muted)';

    // Tampilkan history scan
    displayScanHistory();
}

// Fungsi untuk menyimpan hasil scan ke localStorage
function saveScanResult(hash, fileName, result) {
    // Ambil history dari localStorage atau buat array kosong jika belum ada
    let history = JSON.parse(localStorage.getItem('scanHistory')) || [];

    // Tambahkan data scan baru
    const scanData = {
        hash: hash,
        fileName: fileName,
        timestamp: new Date().toLocaleString('id-ID'),
        result: result
    };

    // Tambahkan ke awal array (terbaru di atas)
    history.unshift(scanData);

    // Batasi jumlah history (misalnya hanya simpan 20 scan terbaru)
    if (history.length > 20) {
        history = history.slice(0, 20);
    }

    // Simpan kembali ke localStorage
    localStorage.setItem('scanHistory', JSON.stringify(history));
}

// Fungsi untuk menampilkan history scan
function displayScanHistory() {
    const historyList = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('scanHistory')) || [];

    if (history.length === 0) {
        historyList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Belum ada riwayat scan</div>';
        return;
    }

    let historyHTML = '<div style="max-height: 400px; overflow-y: auto;">';

    history.forEach((scan, index) => {
        historyHTML += `
          <div class="history-item-container" style="position: relative; margin-bottom: 0.5rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;">
            <div class="history-item" style="padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; flex: 1;">
                  <div class="kebab-menu" style="position: relative; margin-right: 0.5rem;">
                    <button onclick="toggleKebabMenu(${index})" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.2rem;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    <div id="kebab-menu-${index}" class="kebab-dropdown" style="position: absolute; top: 100%; left: 0; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; z-index: 100; display: none; min-width: 120px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-top: 0.2rem;">
                      <button onclick="deleteHistoryItem(${index}); hideKebabMenu(${index})" style="display: block; width: 100%; padding: 0.6rem; text-align: left; background: none; border: none; color: #f87171; cursor: pointer; border-bottom: 1px solid var(--border); border-radius: 8px 8px 0 0;">Hapus</button>
                    </div>
                  </div>
                  <div style="flex: 1;" onclick="toggleScanResult(${index})">
                    <div style="font-weight: 600; color: var(--text);">${scan.fileName}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${scan.timestamp}</div>
                    <div style="font-size: 0.8rem; color: var(--primary); margin-top: 0.2rem;">Hash: ${scan.hash.substring(0, 16)}...</div>
                  </div>
                </div>
                <div id="arrow-${index}" style="color: var(--primary); transition: transform 0.3s; cursor: pointer;" onclick="toggleScanResult(${index})">▶</div>
              </div>
              <div id="result-${index}" class="scan-result-dropdown" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(25, 25, 35, 0.7); border-radius: 8px; border: 1px solid var(--border); max-height: 50vh; overflow-y: auto;">
                <div style="margin-bottom: 1rem;">
                  <h4 style="color: var(--text); margin: 0;">Detail Hasil Scan</h4>
                </div>
                <div id="table-view-${index}" class="tab-content" style="display:block;">
                  <div id="table-result-${index}"></div>
                </div>
              </div>
            </div>
          </div>
        `;
    });

    historyHTML += '</div>';
    historyList.innerHTML = historyHTML;

    // Populate table views for each scan result
    history.forEach((scan, index) => {
        setTimeout(() => {
            populateTableResultForHistory(scan.result, index);
        }, 10);
    });
}


// Fungsi untuk men-toggle menu kebab
function toggleKebabMenu(index) {
    const menu = document.getElementById(`kebab-menu-${index}`);
    // Sembunyikan semua menu kebab lainnya
    document.querySelectorAll('.kebab-dropdown').forEach(dropdown => {
        if (dropdown.id !== `kebab-menu-${index}`) {
            dropdown.style.display = 'none';
        }
    });
    // Toggle menu saat ini
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
}

// Fungsi untuk menyembunyikan menu kebab
function hideKebabMenu(index) {
    const menu = document.getElementById(`kebab-menu-${index}`);
    menu.style.display = 'none';
}

// Fungsi untuk men-toggle tampilan hasil scan
function toggleScanResult(index) {
    const resultDiv = document.getElementById(`result-${index}`);
    const arrow = document.getElementById(`arrow-${index}`);

    if (resultDiv.style.display === 'none') {
        resultDiv.style.display = 'block';
        arrow.style.transform = 'rotate(90deg)';
    } else {
        resultDiv.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Fungsi untuk menutup semua menu kebab saat klik di luar
document.addEventListener('click', function (event) {
    if (!event.target.closest('.kebab-menu')) {
        document.querySelectorAll('.kebab-dropdown').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
});


// Fungsi untuk mengisi tampilan tabel dalam history
function populateTableResultForHistory(data, index) {
    const tableResultDiv = document.getElementById(`table-result-${index}`);

    if (!tableResultDiv) {
        console.error(`Element table-result-${index} tidak ditemukan`);
        return;
    }

    // Buat tabel untuk informasi utama APK
    let tableHTML = `
        <div class="table-section" style="margin-bottom: 2rem;">
          <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Informasi Utama APK</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: rgba(40, 40, 53, 0.8);">
                  <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 250px; width: 30%;">Parameter</th>
                  <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 400px; width: 70%;">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Nama Aplikasi</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.app_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Nama File</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.file_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Jenis File</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.app_type || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Ukuran</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.size || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">MD5 Hash</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.md5 || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">SHA1 Hash</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.sha1 || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">SHA256 Hash</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.sha256 || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Package Name</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.package_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Main Activity</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.main_activity || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Target SDK</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.target_sdk || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Min SDK</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.min_sdk || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Versi Nama</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.version_name || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">Versi Kode</td>
                  <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${data.version_code || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

    // Tambahkan tabel untuk permissions jika ada
    if (data.permissions && Object.keys(data.permissions).length > 0) {
        tableHTML += `
          <div class="table-section" style="margin-bottom: 2rem;">
            <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Daftar Permissions</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(40, 40, 53, 0.8);">
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 200px; width: 35%;">Permission</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 100px; width: 15%;">Status</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 200px; width: 50%;">Deskripsi</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const [permission, details] of Object.entries(data.permissions)) {
            const status = details.status || '-';
            const description = details.description || '-';
            const info = details.info || '-';

            tableHTML += `
            <tr>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${permission}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${status}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${description}</td>
            </tr>
          `;
        }

        tableHTML += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    // Tambahkan tabel untuk temuan keamanan jika ada
    if (data.appsec && data.appsec.high && data.appsec.high.length > 0) {
        tableHTML += `
          <div class="table-section" style="margin-bottom: 2rem;">
            <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Temuan Keamanan (High Risk)</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(40, 40, 53, 0.8);">
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 150px; width: 25%;">Judul</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 250px; width: 50%;">Deskripsi</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 100px; width: 25%;">Bagian</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const finding of data.appsec.high) {
            const title = finding.title || '-';
            const description = finding.description || '-';
            const section = finding.section || '-';

            tableHTML += `
            <tr>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${title}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${description}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${section}</td>
            </tr>
          `;
        }

        tableHTML += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    // Tambahkan tabel untuk temuan keamanan warning jika ada
    if (data.appsec && data.appsec.warning && data.appsec.warning.length > 0) {
        tableHTML += `
          <div class="table-section" style="margin-bottom: 2rem;">
            <h3 style="color: var(--text); margin-bottom: 1rem; font-size: 1.1rem;">Temuan Keamanan (Warning)</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(25, 25, 35, 0.7); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(40, 40, 53, 0.8);">
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 150px; width: 25%;">Judul</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 250px; width: 50%;">Deskripsi</th>
                    <th style="padding: 0.8rem; text-align: left; border-bottom: 1px solid var(--border); min-width: 100px; width: 25%;">Bagian</th>
                  </tr>
                </thead>
                <tbody>
        `;

        for (const finding of data.appsec.warning) {
            const title = finding.title || '-';
            const description = finding.description || '-';
            const section = finding.section || '-';

            tableHTML += `
            <tr>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${title}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${description}</td>
              <td style="padding: 0.8rem; border-bottom: 1px solid var(--border); word-break: break-word;">${section}</td>
            </tr>
          `;
        }

        tableHTML += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    tableResultDiv.innerHTML = tableHTML;
}

// Variabel untuk menyimpan informasi swipe
let touchStartX = 0;
let touchStartY = 0;
let elementBeingSwiped = null;
let startX = 0;
let isSwiping = false;

// Fungsi untuk menangani awal sentuhan
function handleTouchStart(event, index) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    elementBeingSwiped = document.querySelector(`#result-${index}`).previousElementSibling; // history-item
    startX = elementBeingSwiped.offsetLeft || 0;
    isSwiping = false;
}

// Fungsi untuk menangani pergerakan sentuhan
function handleTouchMove(event, index) {
    if (!elementBeingSwiped) return;

    const touchX = event.touches[0].clientX;
    const touchY = event.touches[0].clientY;
    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;

    // Cegah scroll saat swipe horizontal
    if (Math.abs(diffX) > Math.abs(diffY)) {
        event.preventDefault();
    }

    // Hanya swipe horizontal yang dihitung
    if (Math.abs(diffX) > 5) {
        isSwiping = true;
        const maxSwipe = 80; // Lebar tombol hapus
        const newTransform = Math.max(Math.min(diffX, maxSwipe), -maxSwipe);
        elementBeingSwiped.style.transform = `translateX(${newTransform}px)`;
    }
}

// Fungsi untuk menangani akhir sentuhan
function handleTouchEnd(event, index) {
    if (!elementBeingSwiped) return;

    const touchX = event.changedTouches[0].clientX;
    const diffX = touchX - touchStartX;

    // Jika swipe cukup jauh ke kiri, tampilkan tombol hapus
    if (diffX < -30 && isSwiping) {
        elementBeingSwiped.style.transform = 'translateX(-80px)';
        // Tampilkan tombol hapus
        const deleteBtn = elementBeingSwiped.parentElement.querySelector('.delete-btn');
        deleteBtn.style.right = '0px';
    } else if (isSwiping) {
        // Kembalikan posisi
        elementBeingSwiped.style.transform = 'translateX(0px)';
    }

    elementBeingSwiped = null;
    isSwiping = false;
}

// Fungsi untuk menangani awal klik mouse
function handleMouseDown(event, index) {
    touchStartX = event.clientX;
    touchStartY = event.clientY;
    elementBeingSwiped = document.querySelector(`#result-${index}`).previousElementSibling; // history-item
    startX = elementBeingSwiped.offsetLeft || 0;
    isSwiping = false;
    elementBeingSwiped.style.transition = 'none'; // Nonaktifkan transisi saat drag

    // Tambahkan event listener untuk mousemove dan mouseup
    document.addEventListener('mousemove', handleMouseMoveTemp);
    document.addEventListener('mouseup', handleMouseUpTemp);
}

// Fungsi sementara untuk mousemove
function handleMouseMoveTemp(event) {
    if (!elementBeingSwiped) return;

    const diffX = event.clientX - touchStartX;
    const diffY = event.clientY - touchStartY;

    // Hanya swipe horizontal yang dihitung
    if (Math.abs(diffX) > 5) {
        isSwiping = true;
        const maxSwipe = 80; // Lebar tombol hapus
        const newTransform = Math.max(Math.min(diffX, maxSwipe), -maxSwipe);
        elementBeingSwiped.style.transform = `translateX(${newTransform}px)`;
    }
}

// Fungsi sementara untuk mouseup
function handleMouseUpTemp(event) {
    if (!elementBeingSwiped) return;

    const diffX = event.clientX - touchStartX;

    // Jika swipe cukup jauh ke kiri, tampilkan tombol hapus
    if (diffX < -30 && isSwiping) {
        elementBeingSwiped.style.transform = 'translateX(-80px)';
        // Tampilkan tombol hapus
        const deleteBtn = elementBeingSwiped.parentElement.querySelector('.delete-btn');
        deleteBtn.style.right = '0px';
    } else if (isSwiping) {
        // Kembalikan posisi
        elementBeingSwiped.style.transform = 'translateX(0px)';
    }

    elementBeingSwiped = null;
    isSwiping = false;

    // Hapus event listener
    document.removeEventListener('mousemove', handleMouseMoveTemp);
    document.removeEventListener('mouseup', handleMouseUpTemp);

    // Aktifkan kembali transisi
    if (elementBeingSwiped) {
        elementBeingSwiped.style.transition = 'transform 0.3s';
    }
}

// Fungsi untuk menangani pergerakan mouse (tanpa drag)
function handleMouseMove(event, index) {
    // Tidak melakukan apa-apa karena drag ditangani oleh event listener global
}

// Fungsi untuk menangani akhir klik mouse (tanpa drag)
function handleMouseUp(event, index) {
    // Tidak melakukan apa-apa karena mouseup ditangani oleh event listener global
}

// Fungsi untuk menangani mouse leave
function handleMouseLeave(event, index) {
    // Jika mouse meninggalkan elemen saat sedang tidak swiping, kembalikan posisi
    if (!isSwiping && elementBeingSwiped) {
        elementBeingSwiped.style.transform = 'translateX(0px)';
        elementBeingSwiped = null;
    }
}

// Fungsi untuk menghapus item riwayat
function deleteHistoryItem(index) {
    let history = JSON.parse(localStorage.getItem('scanHistory')) || [];

    // Konfirmasi penghapusan
    if (confirm('Apakah Anda yakin ingin menghapus item ini dari riwayat?')) {
        // Hapus item dengan indeks tertentu
        history.splice(index, 1);

        // Simpan kembali ke localStorage
        localStorage.setItem('scanHistory', JSON.stringify(history));

        // Tampilkan ulang history
        displayScanHistory();
    }
}

// Fungsi untuk men-toggle tampilan hasil scan
function toggleScanResult(index) {
    const resultDiv = document.getElementById(`result-${index}`);
    const arrow = document.getElementById(`arrow-${index}`);
    const tableResultDiv = document.getElementById(`table-result-${index}`);

    if (resultDiv.style.display === 'none') {
        resultDiv.style.display = 'block';
        arrow.style.transform = 'rotate(90deg)';

        // Muat tabel jika belum dimuat
        if (tableResultDiv && tableResultDiv.innerHTML.trim() === '') {
            const history = JSON.parse(localStorage.getItem('scanHistory')) || [];
            const scanData = history[index];
            if (scanData && scanData.result) {
                populateTableResultForHistory(scanData.result, index);
            }
        }
    } else {
        resultDiv.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Fungsi untuk memuat hasil scan dari history (lama - tetap ada untuk kompatibilitas)
function loadScanResult(index) {
    const history = JSON.parse(localStorage.getItem('scanHistory')) || [];
    const scanData = history[index];

    if (scanData) {
        // Tampilkan hasil scan di halaman utama
        document.getElementById('resultOutput').textContent = JSON.stringify(scanData.result, null, 2);
        document.getElementById('resultSection').style.display = 'block';

        // Isi tabel jika tab tabel sedang aktif
        if (document.getElementById('tableView').style.display !== 'none') {
            populateTableResult(scanData.result);
        }

        // Gulir ke hasil
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Pindah ke halaman home
        switchToHome();
    }
}

function clearAll() {
    document.getElementById('apkFile').value = '';
    document.getElementById('scanHash').value = '';
    document.getElementById('reScanCheckbox').checked = false;
    document.getElementById('resultOutput').textContent = '';
    document.getElementById('tableResult').innerHTML = ''; // Kosongkan tabel juga
    document.getElementById('uploadMessage').innerHTML = '';
    document.getElementById('scanMessage').innerHTML = '';
    document.getElementById('scanSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';

    // Reset button text if needed
    const uploadButton = document.querySelector('#uploadMessage').parentElement.querySelector('button');
    if (uploadButton) {
        uploadButton.textContent = 'Unggah APK';
        uploadButton.disabled = false;
    }
}

// ============================================
// PLUGIN-FUNGSI TAMBAHAN UNTUK MOBSF
// ============================================

// Fungsi untuk cordova-plugin-file
function checkFilePlugin() {
    if (window.cordova && window.cordova.file) {
        console.log('cordova-plugin-file tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-file tidak tersedia');
        return false;
    }
}

function getFileLocation() {
    if (checkFilePlugin()) {
        // Contoh penggunaan path dari plugin file
        console.log('Data Directory:', cordova.file.dataDirectory);
        console.log('Cache Directory:', cordova.file.cacheDirectory);
        console.log('External Data Directory:', cordova.file.externalDataDirectory);
        
        return {
            dataDirectory: cordova.file.dataDirectory,
            cacheDirectory: cordova.file.cacheDirectory,
            externalDataDirectory: cordova.file.externalDataDirectory
        };
    }
    return null;
}

// Fungsi untuk cordova-plugin-network-information
function checkNetworkPlugin() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.networkinformation) {
        console.log('cordova-plugin-network-information tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-network-information tidak tersedia');
        return false;
    }
}

function getConnectionInfo() {
    if (checkNetworkPlugin() && navigator.connection) {
        const networkState = navigator.connection.type;
        
        const connectionTypes = {
            [Connection.UNKNOWN]: 'Koneksi tidak diketahui',
            [Connection.ETHERNET]: 'Koneksi Ethernet',
            [Connection.WIFI]: 'Koneksi WiFi',
            [Connection.CELL_2G]: 'Koneksi 2G',
            [Connection.CELL_3G]: 'Koneksi 3G',
            [Connection.CELL_4G]: 'Koneksi 4G',
            [Connection.CELL]: 'Koneksi Seluler',
            [Connection.NONE]: 'Tidak ada koneksi'
        };
        
        const connectionInfo = {
            type: networkState,
            typeName: connectionTypes[networkState] || 'Tipe koneksi tidak dikenal'
        };
        
        console.log('Informasi koneksi:', connectionInfo);
        return connectionInfo;
    }
    
    // Fallback ke navigator.onLine
    return {
        type: navigator.onLine ? 'online' : 'offline',
        typeName: navigator.onLine ? 'Online' : 'Offline'
    };
}

// Fungsi untuk cordova-plugin-background-mode
function checkBackgroundModePlugin() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
        console.log('cordova-plugin-background-mode tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-background-mode tidak tersedia');
        return false;
    }
}

function enableBackgroundMode() {
    if (checkBackgroundModePlugin()) {
        cordova.plugins.backgroundMode.enable();
        console.log('Background mode diaktifkan');
    } else {
        console.warn('Tidak dapat mengaktifkan background mode, plugin tidak tersedia');
    }
}

function disableBackgroundMode() {
    if (checkBackgroundModePlugin()) {
        cordova.plugins.backgroundMode.disable();
        console.log('Background mode dinonaktifkan');
    } else {
        console.warn('Tidak dapat menonaktifkan background mode, plugin tidak tersedia');
    }
}

function setBackgroundModeConfig(config = {}) {
    if (checkBackgroundModePlugin()) {
        // Konfigurasi default
        const defaultConfig = {
            title: 'MobSF Scanner Sedang Berjalan',
            text: 'Proses scan masih berlangsung di belakang layar',
            icon: 'icon',
            ...config
        };
        
        cordova.plugins.backgroundMode.setDefaults(defaultConfig);
        console.log('Konfigurasi background mode diperbarui');
    }
}

// Fungsi untuk cordova-plugin-local-notification
function checkLocalNotificationPlugin() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification && window.cordova.plugins.notification.local) {
        console.log('cordova-plugin-local-notification tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-local-notification tidak tersedia');
        return false;
    }
}

function scheduleLocalNotification(notificationOptions) {
    if (checkLocalNotificationPlugin()) {
        const defaultOptions = {
            id: Date.now(),
            title: 'MobSF Scanner',
            text: 'Proses scan telah selesai',
            sound: 'res://platform_default',
            vibrate: true,
            ...notificationOptions
        };
        
        cordova.plugins.notification.local.schedule(defaultOptions);
        console.log('Notifikasi lokal dijadwalkan:', defaultOptions);
    } else {
        console.warn('Tidak dapat menjadwalkan notifikasi lokal, plugin tidak tersedia');
    }
}

function cancelLocalNotification(notificationId) {
    if (checkLocalNotificationPlugin()) {
        cordova.plugins.notification.local.cancel(notificationId, function() {
            console.log('Notifikasi dengan ID ' + notificationId + ' dibatalkan');
        });
    }
}

// Fungsi untuk cordova-plugin-dialogs
function checkDialogsPlugin() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.dialogs) {
        console.log('cordova-plugin-dialogs tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-dialogs tidak tersedia');
        return false;
    }
}

function showAlert(message, title = 'Peringatan', buttonName = 'OK') {
    if (checkDialogsPlugin()) {
        navigator.notification.alert(message, null, title, buttonName);
    } else {
        // Fallback ke alert browser
        alert(`${title}: ${message}`);
    }
}

function showConfirm(message, callback, title = 'Konfirmasi', buttonLabels = ['Batal', 'OK']) {
    if (checkDialogsPlugin()) {
        navigator.notification.confirm(message, callback, title, buttonLabels);
    } else {
        // Fallback ke confirm browser
        const result = confirm(`${title}: ${message}`);
        callback(result ? 2 : 1); // Sesuaikan dengan format callback plugin
    }
}

function showPrompt(message, callback, title = 'Masukkan Nilai', buttonLabels = ['Batal', 'OK'], defaultText = '') {
    if (checkDialogsPlugin()) {
        navigator.notification.prompt(message, callback, title, buttonLabels, defaultText);
    } else {
        // Fallback ke prompt browser
        const result = prompt(`${title}: ${message}`, defaultText);
        callback({
            buttonIndex: result !== null ? 2 : 1,
            input1: result
        });
    }
}

// Fungsi untuk cordova-plugin-file-opener2
function checkFileOpenerPlugin() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.fileOpener2) {
        console.log('cordova-plugin-file-opener2 tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-file-opener2 tidak tersedia');
        return false;
    }
}

function openFile(filePath, contentType) {
    if (checkFileOpenerPlugin()) {
        cordova.plugins.fileOpener2.open(
            filePath,
            contentType,
            {
                error: function(e) {
                    console.log('Error saat membuka file: ', e);
                },
                success: function() {
                    console.log('File berhasil dibuka: ' + filePath);
                }
            }
        );
    } else {
        console.warn('Tidak dapat membuka file, plugin tidak tersedia');
    }
}

function openPDF(pdfPath) {
    openFile(pdfPath, 'application/pdf');
}

function openJSON(jsonPath) {
    openFile(jsonPath, 'application/json');
}

// Fungsi untuk cordova-sqlite-storage
function checkSQLitePlugin() {
    if (window.cordova && window.sqlitePlugin) {
        console.log('cordova-sqlite-storage tersedia');
        return true;
    } else {
        console.warn('cordova-sqlite-storage tidak tersedia');
        return false;
    }
}

function getDatabase(dbName = 'mobsf_data.db') {
    if (checkSQLitePlugin()) {
        return window.sqlitePlugin.openDatabase({
            name: dbName,
            location: 'default'
        });
    }
    return null;
}

function initializeScanHistoryDB() {
    const db = getDatabase();
    if (db) {
        db.transaction(function(tx) {
            tx.executeSql(
                'CREATE TABLE IF NOT EXISTS scan_history (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT, file_name TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, result TEXT)',
                [],
                function(tx, result) {
                    console.log('Tabel scan_history siap digunakan');
                },
                function(tx, error) {
                    console.log('Error saat membuat tabel: ' + error.message);
                }
            );
        });
    }
}

function saveScanResultToDB(hash, fileName, result) {
    const db = getDatabase();
    if (db) {
        const resultString = typeof result === 'object' ? JSON.stringify(result) : result;
        
        db.transaction(function(tx) {
            tx.executeSql(
                'INSERT INTO scan_history (hash, file_name, result) VALUES (?, ?, ?)',
                [hash, fileName, resultString],
                function(tx, result) {
                    console.log('Hasil scan disimpan ke database');
                },
                function(tx, error) {
                    console.log('Error saat menyimpan ke database: ' + error.message);
                }
            );
        });
    }
}

function getScanHistory(callback) {
    const db = getDatabase();
    if (db) {
        db.transaction(function(tx) {
            tx.executeSql(
                'SELECT * FROM scan_history ORDER BY timestamp DESC',
                [],
                function(tx, resultSet) {
                    const results = [];
                    for (let i = 0; i < resultSet.rows.length; i++) {
                        results.push(resultSet.rows.item(i));
                    }
                    callback(results);
                },
                function(tx, error) {
                    console.log('Error saat mengambil data: ' + error.message);
                    callback([]);
                }
            );
        });
    } else {
        callback([]);
    }
}

// Fungsi untuk cordova-plugin-advanced-http
function checkAdvancedHttpPlugin() {
    if (window.cordova && window.cordova.plugin && window.cordova.plugin.http) {
        console.log('cordova-plugin-advanced-http tersedia');
        return true;
    } else {
        console.warn('cordova-plugin-advanced-http tidak tersedia');
        return false;
    }
}

function advancedHttpGet(url, options = {}) {
    if (checkAdvancedHttpPlugin()) {
        return new Promise((resolve, reject) => {
            cordova.plugin.http.get(
                url,
                options.params || {},
                options.headers || {'X-Mobsf-Api-Key': API_KEY},
                function(response) {
                    resolve(response);
                },
                function(response) {
                    reject(response);
                }
            );
        });
    } else {
        // Fallback ke fetch
        return fetch(url, {
            method: 'GET',
            headers: options.headers || {'X-Mobsf-Api-Key': API_KEY}
        });
    }
}

function advancedHttpPost(url, data, options = {}) {
    if (checkAdvancedHttpPlugin()) {
        return new Promise((resolve, reject) => {
            cordova.plugin.http.post(
                url,
                data,
                options.headers || {'X-Mobsf-Api-Key': API_KEY, 'Content-Type': 'application/x-www-form-urlencoded'},
                function(response) {
                    resolve(response);
                },
                function(response) {
                    reject(response);
                }
            );
        });
    } else {
        // Fallback ke fetch
        return fetch(url, {
            method: 'POST',
            headers: options.headers || {'X-Mobsf-Api-Key': API_KEY, 'Content-Type': 'application/x-www-form-urlencoded'},
            body: typeof data === 'object' ? new URLSearchParams(data).toString() : data
        });
    }
}

// Catatan: Fungsi untuk cordova-plugin-file-transfer tidak ditambahkan karena plugin ini
// sudah usang dan digantikan oleh XHR2/File API yang sudah digunakan dalam fungsi uploadFile()
// Jika tetap ingin menggunakan plugin ini, implementasinya akan serupa dengan contoh di atas
