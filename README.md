# ERD Studio — Visual Database Schema Designer

Web Studio interaktif untuk merancang diagram Entity-Relationship (ERD), skema database, relasi foreign key, dan mengekspor/mengimpor SQL DDL secara visual.

Dibangun dengan **React 19**, **Vite**, **Tailwind CSS v4**, dan **React Flow (@xyflow/react)** dengan estetika *Matte Dark Studio*.

---

## ✨ Fitur Utama

- 🎨 **Visual ER Canvas**:
  - Infinite zoom & pan canvas dengan dot-grid pattern.
  - Interactive table cards dengan indikator **PK** (*Primary Key*), **FK** (*Foreign Key*), **Unique**, **Nullable**, dan tipe data.
  - Port handle interaktif di setiap kolom untuk menghubungkan Foreign Key antar tabel secara visual.
  - Smart Bezier relation curves dengan badge kardinalitas (`1:1`, `1:N`, `N:M`).
- ⚡ **Auto-Layout Graph**:
  - Penataan posisi tabel dan garis relasi otomatis menggunakan algoritma graf **Dagre**.
- 🛠️ **Inspector & Property Panel**:
  - Edit nama tabel, tag warna, dan komentar tabel.
  - Manajemen kolom: nama, tipe data (PostgreSQL/MySQL/SQLite/Prisma), constraint, auto-increment, default value.
  - Konfigurasi referential rules (`ON DELETE`, `ON UPDATE`).
  - **Live SQL DDL Preview** secara *real-time*.
- 📥 **Import SQL DDL**:
  - Tempel script SQL `CREATE TABLE` / `ALTER TABLE ADD CONSTRAINT` untuk otomatis digambar menjadi diagram visual.
- 📤 **Multi-Dialect Export**:
  - Export ke **PostgreSQL**, **MySQL**, **SQLite**, **Prisma Schema**, dan **JSON Schema**.
  - Export diagram visual ke **Gambar High-Res PNG**.
- 🚀 **Built-in Presets**:
  - Starter template: *E-Commerce Store*, *RBAC Authentication*, dan tabel primitives siap pakai (`users`, `profiles`, `products`, `orders`, `audit_logs`).
- 💾 **Auto-Save**:
  - Sinkronisasi otomatis ke `localStorage` browser.

---

## 🚀 Menjalankan Project

### Menggunakan Bun (Direkomendasikan):
```bash
cd /home/fahmi/projects/er-studio
bun dev
```

Buka browser di: `http://localhost:5173`

### Build untuk Produksi:
```bash
bun run build
bun run preview
```

---

## 📂 Struktur Direktori

```
er-studio/
├── src/
│   ├── components/
│   │   ├── Canvas.tsx             # React Flow canvas wrapper & background
│   │   ├── TableNode.tsx          # Custom node visual untuk tabel & kolom
│   │   ├── CustomEdge.tsx         # Custom edge dengan kardinalitas & actions
│   │   ├── Navbar.tsx             # Studio header bar
│   │   ├── Sidebar.tsx            # Left explorer, search, & schema stats
│   │   ├── Inspector.tsx          # Right property panel & live DDL preview
│   │   └── Modals/
│   │       ├── SqlImportModal.tsx # Parser SQL DDL import
│   │       ├── ExportModal.tsx    # Multi-format exporter & image downloader
│   │       └── TemplatesModal.tsx # Starter schema picker
│   ├── types/
│   │   └── schema.ts              # Interface TypeScript skema ERD
│   ├── utils/
│   │   ├── sqlGenerator.ts        # Generator DDL Postgres/MySQL/SQLite/Prisma
│   │   ├── sqlParser.ts           # Parser SQL DDL ke diagram canvas
│   │   ├── layout.ts              # Algoritma auto-layout Dagre
│   │   └── presets.ts             # Template database bawaan
│   ├── App.tsx                    # State orchestrator
│   ├── main.tsx                   # Entry point React
│   └── index.css                  # Tailwind CSS v4 & theme styling
├── package.json
└── vite.config.ts
```
