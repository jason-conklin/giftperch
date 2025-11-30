<img width="2235" height="469" alt="giftperch_banner_github" src="https://github.com/user-attachments/assets/7e781345-22e5-4d12-98b1-17ca7363abe6" />
<img width="1533" height="908" alt="Screenshot 2025-11-28 171701" src="https://github.com/user-attachments/assets/b8a98fbb-a752-49cb-a605-f36bdec25297" />

GiftPerch is an AI-powered gifting platform that helps people remember the important people in their lives — their interests, personalities, occasions, budgets, and gift history — and delivers deeply personalized gift recommendations using PerchPal, your friendly AI gifting assistant.

GiftPerch turns chaotic last-minute gifting into a warm, organized, meaningful experience.

🔗 Live Site: https://giftperch.com

🔗 Portfolio: https://jasonconklin.dev

🌟 What GiftPerch Does

GiftPerch combines:

A Personal Gift CRM (recipient profiles, interests, budgets, history)

An AI Gift Assistant (PerchPal) that generates thoughtful suggestions

Occasion tracking with calendar navigation

User wishlists and identity profiles

Affiliate-ready gift links (Amazon Associates integration)

It’s designed for families, friends, couples, and anyone who wants gifting to feel personal — not stressful.

📸 Screenshots (Coming soon)

These are placeholders.

![Landing Page](screenshots/landing.png)
![Dashboard](screenshots/dashboard.png)
![Recipient Profile](screenshots/recipient.png)
![PerchPal Chat](screenshots/perchpal.png)

🚀 Key Features
1. Recipient Profiles (Your Gift CRM)

Each person in your life gets a reusable profile containing:

Interests & hobbies

Notes & preferences

Budget ranges

Relationship tags

Favorite brands

Past gifts

Occasions (birthdays, anniversaries, holidays)

Vibe / aesthetic tags

GiftPerch remembers everything so you don’t have to.

2. PerchPal — Your AI Gifting Assistant

PerchPal analyzes the profile, gift history, budgets, and vibe to generate:

Personalized gift recommendations

“Why this fits them” rationales

Budget-aware suggestions

Duplicate-gift prevention

Seasonal or event-specific ideas

Quick freeform answers (“What should I get my sister who loves hiking?”)

PerchPal also appears throughout the UI with smooth bird animations.

3. AI Gift Generator (Public Tool)

Visitors and logged-in users can generate gift ideas using:

Interests

Occasion type

Price range

Aesthetic/vibe

Quick-select filters

This feature helps with SEO (e.g., “AI gift generator”).

4. Occasion Tracking + Calendar

GiftPerch includes a polished calendar:

Monthly navigation + improved month/year selector

Birthday/anniversary reminders

Event-aware AI suggestions

“Plan ahead” nudges

5. Gift History

Track past gifts per recipient:

Title, URL, price

Occasion and date

Notes

Tags

Ensures you never repeat a gift and improves PerchPal’s reasoning.

6. Affiliate Integration (Amazon Associates)

All Amazon links are affiliate-ready:

tag=giftperch-20 automatically applied

Works for recommended gifts and general Amazon browsing links

Current setup uses mock data until your PAAPI access is activated

Complies with Amazon’s required disclosure:

As an Amazon Associate, I earn from qualifying purchases.

🧠 AI Architecture

GiftPerch uses:

OpenAI GPT-4o-mini (chat + suggestions)

Custom PerchPal prompt recipe system

Contextual embeddings (interests + history)

Gift qualification rules (budget logic + event filtering)

Animation-triggered AI loading states

🎨 Branding & Design

Evergreen + Gold + Cream color palette

Custom PerchPal bird mascot with multiple animation frames

Clean UI with rounded cards and subtle shadows

Consistent typography + layout spacing

Mobile-responsive across all pages

🏗️ Tech Stack

Frontend

Next.js (App Router)

React Server Components

TypeScript

Tailwind CSS

ShadCN UI (selective)

Backend

Supabase

Postgres

Auth

RLS (Row-Level Security)

Storage

AI

OpenAI API

Prompt recipes + gift logic engine

Other

Amazon Associates Integration (PAAPI-ready)

Resend (transactional email-ready)

Deployed on Vercel

🗂️ Project Structure (Simplified)
giftperch/
├── public/                # Images, icons animations
├── supabase/              # DB migrations + seed data
├── src/
│   ├── app/
│   │   ├── (marketing)/   # Landing, About, Blog
│   │   ├── recipients/    # Profiles CRUD
│   │   ├── dashboard/     # Logged-in hub
│   │   ├── gifts/         # AI gift generator
│   │   ├── occasions/     # Calendar views
│   │   └── api/           # Route handlers
│   ├── components/
│   │   ├── perchpal/      # Chat UI + animations
│   │   ├── recipient/
│   │   └── gifts/
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── ai/
│   │   │   ├── perchPal.ts
│   │   │   └── promptRecipes.ts
│   │   └── utils.ts
└── README.md


🐦 Animation Assets

GiftPerch includes a polished PerchPal animation set:

Up flap

Mid flap

Down flap

Gift-carrying frames

Loading loop

Retrieval loop

Used in loading states, fetching animations, and playful UI moments.

📦 Environment Setup

Create a .env.local:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_ID=
SUPABASE_GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
AMAZON_PA_PARTNER_TAG=giftperch-20
RESEND_API_KEY=
DATABASE_PASSWORD=
NEXT_PUBLIC_SITE_URL=https://giftperch.com

🧪 Development
npm install
npm run dev
npm run build
npm run lint


Supabase local DB:

supabase db reset

🚀 Deployment (Vercel)

Connect repository

Add environment variables (match .env.example)

Set NEXT_PUBLIC_SITE_URL=https://giftperch.com

Deploy

Favicon is handled via public/favicon.ico + layout metadata.

📈 Roadmap

Short Term

Refined PerchPal chat experience

Customizable gift vibes

Sharing recipient profiles

More calendar improvements

Long Term

Email notification system

Full Amazon PAAPI activation

Profile import/export

Mobile app version

📜 License

MIT

💬 Contact

Created by Jason Conklin
🔗 https://jasonconklin.dev

🔗 https://giftperch.com
