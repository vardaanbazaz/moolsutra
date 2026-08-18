# MoolSutra (मूलसूत्र)

> **The thread connecting modern India to its roots.**  
> *A verifiable cultural knowledge vault and micro-publishing discourse engine.*

---

## 🌟 Overview

**MoolSutra** is a modern web platform built with **Next.js 16** and **Supabase**. It is architected to combat cultural misinformation and pop-historical myths by grounding public social discourse in verified, immutable etymological and textual citations directly from primary ancient sources.

---

## 🚀 Core Modules

### 🛡️ Module 1: The Pramaan Vault (`/pramaan`)
An immutable repository of verified cultural and linguistic facts. Each record provides:
- **Popular Misconception Callout**: Highlighting common myths and pop interpretations in red alert banners.
- **Verified Vedic Root**: Emerald-accented textual evidence and Sanskrit root etymology.
- **Stateful Dual-View Interface**: Toggle seamlessly between **Summary Mode** (bulleted takeaways) and **Scholar Mode** (prominent Indic script and primary verse citations).

### ⚡ Module 2: Sutra Threads (`/sutra`)
A Town Square micro-publishing feed and thread composer:
- **Multi-Card Drafting**: Compose sequential 4-card thought threads.
- **Truth Citation Chips**: Attach verified fact citations directly from the **Pramaan Vault** via an embedded search modal.
- **Live Social Feed**: Displays posts, author handles, card nodes, and linked verification chips in real-time.

### 🔠 Dynamic Script Engine
A global state system (`ScriptContext`) accessible throughout the platform:
- Seamlessly toggles the entire UI between **Romanized English (`A`)** and **Native Indic Scripts (`अ`)** (Devanagari, Tamil, etc.).
- Translates card titles and citation chips dynamically across all feed views.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Components)
- **Frontend Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Backend**: [Supabase](https://supabase.com/) (PostgreSQL with PostgREST relational joins)
- **Iconography**: [Lucide React](https://lucide.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## ⚙️ Local Setup Instructions

Follow these steps to run **MoolSutra** locally on your machine:

### 1. Clone the Repository
```bash
git clone https://github.com/vardaanbazaz/moolsutra.git
cd moolsutra
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory and populate your Supabase credentials:

```bash
touch .env.local
```

Add the following keys to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📂 Project Structure

```
moolsutra/
├── data/
│   └── seed_pramaan.json      # Seed etymology records
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root Layout (Navbar, ScriptProvider, Footer)
│   │   ├── page.tsx           # Home Dashboard
│   │   ├── pramaan/
│   │   │   └── page.tsx       # Module 1 (Pramaan Vault Route)
│   │   └── sutra/
│   │       └── page.tsx       # Module 2 (Sutra Town Square Route)
│   ├── components/
│   │   ├── Navbar.tsx         # Sticky navigation header
│   │   ├── ThemeToggle.tsx    # Light/Dark mode switcher
│   │   ├── ScriptContext.tsx  # Global script mode state ('roman' | 'indic')
│   │   ├── ScriptToggle.tsx   # Transliteration button (Languages icon + 'A / अ')
│   │   ├── SearchBar.tsx      # Real-time search input component
│   │   ├── PramaanCard.tsx    # Module 1 verification card
│   │   ├── PramaanVaultView.tsx # Client feed wrapper with live filtering
│   │   ├── SutraPostCard.tsx  # Module 2 social feed post card
│   │   └── ComposeSutra.tsx   # Multi-card thread composer & citation modal
│   └── lib/
│       └── supabaseClient.ts  # Supabase JS SDK client helper
└── README.md
```

---

## 📄 License
Licensed under the [MIT License](LICENSE).
