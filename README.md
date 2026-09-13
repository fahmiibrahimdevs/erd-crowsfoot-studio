# ERD Studio — Visual Database Schema Designer

Web Studio interaktif modern untuk merancang diagram **Entity-Relationship (ERD)**, skema database, relasi *Foreign Key* dengan notasi **Crow's Foot**, manajemen multi-file workspace, serta generator dan parser SQL DDL multi-dialek secara visual.

Dibangun dengan **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, dan **React Flow (`@xyflow/react`)** dengan standar desain *Matte Dark Studio*.

---

## ✨ Fitur Utama

### 1. 🎨 Visual ER Canvas & Crow's Foot Notation
- **Notasi Relasi Crow's Foot**: Visualisasi kardinalitas eksplisit (*One-to-One*, *One-to-Many*, *Many-to-Many*).
- **Multi-Lane Orthogonal Routing**: Routing garis siku 90° presisi multi-jalur untuk mencegah tumpang tindih (*line overlaps*).
- **Arc Hop / Jump Crossover**: Lengkungan visual otomatis saat garis relasi saling bersilangan untuk keterbacaan tingkat tinggi.
- **Side Resolution Cerdas**: Port koneksi otomatis memilih sisi kiri/kanan berdasarkan posisi relatif antar tabel di canvas.
- **3 Gaya Garis Relasi**: Pilih antara **Siku 90° (Smoothstep)**, **Kurva Bezier**, atau **Garis Lurus (Straight)**.
- **Interaksi Port Per-Kolom**: Hubungkan Foreign Key langsung dengan menarik (*drag-and-connect*) handle pada baris kolom.

### 2. 🗂️ Multi-Table Grouping & Lock Management
- **Rigid Body Grouping (`Ctrl+G`)**: Kelompokkan beberapa tabel ke dalam grup visual beraksen warna. Menggeser grup akan memindahkan seluruh tabel anggotanya secara rigid (tersinkronisasi halus pada **60 FPS**).
- **Lock / Freeze Node (`Ctrl+Shift+L`)**:
  - Mengunci posisi tabel atau grup agar tidak dapat digeser secara tidak sengaja.
  - *Cascading Lock*: Mengunci grup secara otomatis mengunci seluruh tabel di dalamnya.
  - Node yang terkunci terlindungi dari pergeseran saat *Auto-Layout* dijalankan.

### 3. ⚡ Smart Connect & Junction Table Generator
- **Smart Connect**: Otomatis membuat kolom *Foreign Key* baru dengan tipe data yang cocok saat ditarik ke tabel lain, atau mempromosikan kolom menjadi *Primary Key* jika diperlukan.
- **One-Click Junction Table**: Otomatis membuat tabel perantara (pivot/junction table) untuk relasi Many-to-Many (N:M).

### 4. 📁 Multi-File & Folder Workspace Explorer
- Struktur pohon file dan folder direktori untuk mengelola banyak skema diagram (`.erd`) dalam satu tempat.
- Drag & drop pengorganisasian file/folder.
- Duplikasi file diagram, rename, import & export format JSON `.erd`.
- Auto-save persisten ke `localStorage` browser.

### 5. 🛠️ Inspector & Property Panel
- Edit detail tabel: nama tabel, warna aksen, dan deskripsi/komentar.
- Manajemen kolom: nama, tipe data, PK, FK, Unique, Not Null, Auto Increment, Default Value.
- Konfigurasi referential integrity rules (`ON DELETE`, `ON UPDATE`).
- **Live SQL DDL Preview** yang diperbarui secara *real-time*.

### 6. 🔍 Spotlight Command Palette (`Ctrl+K` / `Cmd+K`)
- Navigasi cepat dan pencarian tabel/perintah canvas.
- Akses instan ke fitur Auto-Layout, Export, Import, Fit View, Ganti Tema, dan Gaya Garis.

### 7. 🎬 Presentation Mode (`Alt+P`)
- Mode presentasi layar penuh bebas distraksi dengan floating toolbar.
- Navigasi tabel berurutan (*Next / Previous Table*) dengan animasi fokus kamera dan zoom yang halus.

### 8. 📥📤 Multi-Dialect SQL Import & Export
- **Import SQL DDL**: Parse skema SQL `CREATE TABLE` / `ALTER TABLE ADD CONSTRAINT` menjadi diagram visual.
- **Export Multi-Dialek**: **PostgreSQL**, **MySQL**, **SQLite**, **Prisma Schema**, dan **JSON Schema**.
- **Export Visual**: Unduh diagram ke format gambar resolusi tinggi **PNG** atau **SVG**.

---

## ⌨️ Pintasan Keyboard (Shortcuts)

| Shortcut | Aksi |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Buka Spotlight Command Palette |
| `Ctrl + Z` / `Cmd + Z` | Batalkan aksi (*Undo*) |
| `Ctrl + Y` / `Cmd + Shift + Z` | Ulangi aksi (*Redo*) |
| `Ctrl + G` | Kelompokkan tabel yang dipilih ke dalam Grup (*Group*) |
| `Ctrl + Shift + G` | Lepas pengelompokan grup (*Ungroup*) |
| `Ctrl + Shift + L` | Kunci / Buka Kunci tabel atau grup (*Toggle Lock*) |
| `Delete` / `Backspace` | Hapus tabel, grup, atau relasi yang dipilih |
| `Alt + P` | Masuk / Keluar Mode Presentasi (*Presentation Mode*) |
| `Escape` | Tutup modal, batal seleksi, atau keluar mode presentasi |

---

## 🏗️ Arsitektur Kode (Clean Modular Hooks)

Project ini mengadopsi prinsip *Separation of Concerns* (SoC) dengan membagi fungsionalitas ke dalam domain-driven custom hooks di folder `src/hooks/`:

- **`useWorkspaceManager`**: Logika pohon workspace (file/folder), perpindahan diagram, dan sinkronisasi state.
- **`useLockManager`**: Manajemen status penguncian tabel/grup dan mekanisme *cascading lock*.
- **`useSelectionState`**: State seleksi tunggal/multi-node, relasi aktif, dan *column highlight*.
- **`useCanvasDragSync`**: Sinkronisasi drag grup 60 FPS rAF dan pencegahan drag pada node terkunci.
- **`useCanvasElements`**: Transformasi skema database ke nodes & edges React Flow dengan Crow's Foot & Orthogonal Routing.
- **`useTableOperations`**: Operasi CRUD tabel & kolom, duplikasi, batch color update, smart connect, & junction table.
- **`useGroupOperations`**: Pembuatan, pembongkaran (*ungroup*), rename, dan penghapusan grup.
- **`useKeyboardShortcuts`**: Manajemen event listener keyboard shortcut global.
- **`useHistory`**: Manajemen state stack Undo / Redo.

---

## 📂 Struktur Direktori

```
er-studio/
├── src/
│   ├── components/
│   │   ├── Modals/
│   │   │   ├── ExportModal.tsx        # Modal ekspor SQL, Prisma, JSON, PNG, SVG
│   │   │   ├── SqlImportModal.tsx     # Modal parser SQL DDL import
│   │   │   └── TemplatesModal.tsx     # Modal template skema starter
│   │   ├── Canvas.tsx                 # Wrapper React Flow canvas & interaksi viewport
│   │   ├── CommandPalette.tsx         # Spotlight Command Palette (Ctrl+K)
│   │   ├── ContextMenu.tsx            # Menu klik kanan canvas, tabel, dan grup
│   │   ├── CustomEdge.tsx             # Garis relasi kustom dengan Crow's Foot & Arc Hop
│   │   ├── EnumPillEditor.tsx         # Editor visual untuk tipe data enum
│   │   ├── GroupNode.tsx              # Komponen node kontainer grup visual
│   │   ├── Inspector.tsx              # Panel samping inspeksi tabel, kolom, & relasi
│   │   ├── Navbar.tsx                 # Header navigasi & toolbar utama
│   │   ├── PresentationToolbar.tsx    # Floating toolbar untuk Presentation Mode
│   │   ├── ProjectExplorer.tsx        # File & folder workspace tree explorer
│   │   ├── SearchableSelect.tsx       # Dropdown select dengan fitur pencarian
│   │   ├── Sidebar.tsx                # Panel sidebar kiri (Explorer & Schema Stats)
│   │   ├── StudioToast.tsx            # Sistem notifikasi toast non-blocking
│   │   └── TableNode.tsx              # Komponen node tabel, badge constraint, & port handle
│   ├── hooks/
│   │   ├── useCanvasDragSync.ts       # Sinkronisasi drag grup & throttle rAF
│   │   ├── useCanvasElements.ts       # Builder nodes & edges dengan orthogonal routing
│   │   ├── useGroupOperations.ts      # Operasi grup (group, ungroup, rename, color)
│   │   ├── useHistory.ts              # State stack Undo & Redo
│   │   ├── useKeyboardShortcuts.ts    # Hotkeys global studio
│   │   ├── useLockManager.ts          # State penguncian tabel & grup
│   │   ├── useSelectionState.ts       # State seleksi canvas & highlight
│   │   ├── useTableOperations.ts      # Operasi tabel, kolom, connect, & junction
│   │   └── useWorkspaceManager.ts     # Manajemen multi-file workspace & persistensi
│   ├── types/
│   │   └── schema.ts                  # Deklarasi tipe data & interface TypeScript
│   ├── utils/
│   │   ├── alert.ts                   # Utilitas trigger toast notification
│   │   ├── enumHelper.ts              # Parser & helper tipe data enum
│   │   ├── imageExporter.ts           # Utilitas render & download PNG/SVG canvas
│   │   ├── layout.ts                  # Algoritma auto-layout Dagre
│   │   ├── orthogonalRouter.ts        # Algoritma routing siku multi-lane & arc hop
│   │   ├── presets.ts                 # Preset skema database bawaan
│   │   ├── sqlGenerator.ts            # Generator SQL DDL multi-dialek & Prisma
│   │   └── sqlParser.ts               # Parser SQL DDL ke skema visual
│   ├── App.tsx                        # Root orchestrator komponen
│   ├── main.tsx                       # Entry point aplikasi React
│   └── index.css                      # Tailwind CSS v4 & theme tokens
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Memulai (Getting Started)

### Prasyarat
- [Bun](https://bun.sh/) (sangat direkomendasikan) atau Node.js 18+

### Menjalankan Server Development:
```bash
# Clone repository
git clone https://github.com/fahmiibrahimdevs/erd-crowsfoot-studio.git
cd erd-crowsfoot-studio

# Install dependensi & jalankan
bun install
bun dev
```

Buka browser di: `http://localhost:5173`

### Build untuk Produksi:
```bash
bun run build
bun run preview
```

---

## 📄 Lisensi

Distributed under the MIT License.
