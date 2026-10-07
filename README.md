# Enemites Internal Analytics

Dashboard internal untuk [Enemites/Waitlist-landing-page](https://github.com/Enemites/Waitlist-landing-page).

## Stack dan sumber data

- Next.js App Router, React, TypeScript, Recharts, Geist.
- Frontend dan server routes di Vercel project `enemites-analytics`.
- Neon project `floral-flower-85390584`, database `neondb`, branch `production` yang sama dengan landing page.
- Role khusus `dashboard_reader`. Aplikasi hanya membaca tabel waitlist dan formulir; tidak menjalankan migrasi, insert, update, atau delete terhadap datanya.
- Pool Postgres dengan TLS terverifikasi, maksimum 3 koneksi, timeout query 10 detik, dan `attachDatabasePool` untuk Vercel Fluid compute.

## Menjalankan secara lokal

```sh
npm ci
npm run dev
```

Buka http://127.0.0.1:3000. Untuk setup baru, isi `.env.local` berdasarkan `.env.example`. Konfigurasi lokal awal sudah dibuat dan diabaikan Git. Kunci akses tim disimpan di `.setup/access-key.txt`; file ini juga diabaikan Git.

Variabel server yang wajib tersedia: `DATABASE_URL`, `DASHBOARD_ACCESS_KEY`, `SESSION_SECRET`. Jangan menggunakan prefix `NEXT_PUBLIC_` untuk secret.

Koneksi `DATABASE_URL` harus memakai role yang hanya memiliki izin pada tabel yang diperlukan. Panduan grant ada di `database/reader-grants.sql`; jalankan hanya sebagai database owner setelah membuat role LOGIN khusus, bukan dari dashboard. Jangan mengganti koneksi dengan role pemilik database.

## Fitur dan definisi metrik

- Ringkasan pendaftaran, jumlah yang setuju menerima update, negara yang tercatat, serta grafik harian dan kumulatif.
- Segmentasi umur, perangkat, negara, browser, dan sistem operasi.
- Daftar waitlist dengan pencarian nama/email/telepon, pagination 10 baris, detail, dan ekspor CSV.
- Ringkasan formulir, status aktif/belum kedaluwarsa, dan jumlah respons pada periode terpilih.
- Halaman sumber data untuk status koneksi, waktu data terakhir, dan cakupan metrik.
- Filter tersimpan di URL, dapat disegarkan dan dibagikan kepada anggota tim yang memiliki akses.

Waktu laporan menggunakan **Asia/Jakarta (WIB)**. Filter 7/30/90 hari memasukkan hari ini, mulai pukul 00:00 WIB pada hari pertama sampai waktu pembacaan data. Perbandingan menggunakan rentang sebelumnya dengan durasi sama; ketika periode sebelumnya nol, tidak ada persentase pertumbuhan yang dibuat. Grafik kumulatif dihitung mulai dari awal periode dan segmen yang dipilih. Semua waktu adalah default agar riwayat pendaftaran tetap terlihat meskipun tidak ada pendaftaran baru belakangan ini.

Filter audiens berlaku pada statistik, grafik, segmentasi, daftar dan ekspor waitlist. Pencarian teks hanya membatasi daftar dan ekspor; tidak mengubah statistik audiens. Formulir mengikuti filter periode saja. Lokasi kosong dan lokasi `Local (timezone)` bukan negara terverifikasi dan dikelompokkan sebagai tidak diketahui. Informasi browser/perangkat adalah metadata saat pendaftaran, bukan jumlah pengunjung situs.

Data kunjungan, pageview, UTM/referrer dan rasio konversi **belum tersedia di Neon**. Dashboard menampilkan status tersebut secara eksplisit; tidak menggunakan data contoh maupun estimasi. Tracking landing page tidak diubah oleh project ini.

## Akses internal

Login menggunakan kunci akses tim acak 256 bit. Tidak ada pendaftaran akun publik. Sesi dienkripsi dan diautentikasi dengan iron-session, berakhir setelah 8 jam, memakai cookie HttpOnly, SameSite=Strict, dan Secure dalam production. Semua pembacaan data dan ekspor diperiksa di server. Percobaan login dibatasi per instance; throttle ini bukan rate limiter global. Untuk rollout besar, tambahkan aturan Vercel Firewall atau provider identitas tim.

Untuk mengganti akses: buat kunci baru menggunakan generator kriptografis, simpan sebagai `DASHBOARD_ACCESS_KEY`, dan ganti `SESSION_SECRET` untuk membatalkan seluruh sesi yang lama. Secret sesi minimal 32 karakter. Kunci akses minimal 32 karakter dan harus tetap memiliki entropi tinggi; jangan menggantinya dengan password pendek.

CSV mengikuti filter aktif, dibatasi 10.000 baris per ekspor, memakai UTF-8 BOM dan escape kutip/baris baru. Nilai yang dapat menjadi formula spreadsheet dinetralkan. Data kontak di CSV tetap merupakan data internal.

## Validasi

```sh
npm run build
npm run typecheck
npm test
```

## Vercel

Project Vercel dan tiga environment variables sudah disiapkan untuk development, preview, dan production. Workspace lokal ditautkan melalui `.vercel/project.json` yang diabaikan Git. Tidak ada integrasi Git otomatis yang dipasang.

Deployment awal sudah aktif di https://enemites-analytics.vercel.app. Vercel menandai deployment pertama project baru sebagai production, meskipun dibuat dengan target preview. Domain dashboard meminta kunci akses tim; URL deployment unik juga dilindungi Vercel Authentication. Website landing page yang lama tidak diubah. Source project tersedia di [Enemites/Dashboard](https://github.com/Enemites/Dashboard).

Untuk melakukan deployment setelah diotorisasi:

```sh
npx vercel --scope nafiszs-projects
# Production, hanya setelah persetujuan publikasi:
npx vercel --prod --scope nafiszs-projects
```

CLI memerlukan login Vercel; connector Vercel di Codex juga dapat digunakan untuk deploy. Kunci akses tetap wajib meskipun Vercel Deployment Protection aktif. Jangan memasukkan `.env.local`, `.setup`, atau hasil ekspor ke Git atau paket deployment.
