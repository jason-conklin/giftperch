🎁 GiftPerch — AI-Powered Gifting, Reinvented

A modern, personalized, AI-driven gifting platform.

GiftPerch is an AI-powered gifting app that helps users remember every important person in their life — their interests, personalities, past gifts, budgets, and life events — and delivers deeply personalized gift recommendations powered by PerchPal, your friendly AI gifting assistant.

GiftPerch makes gifting meaningful, organized, and effortless.

🔗 Coming Soon Page: https://giftperch.com

🔗 Portfolio: https://jasonconklin.dev

🌟 Core Value Proposition

GiftPerch = a Personal Gift CRM + AI Gift Assistant + Wishlists + Amazon-powered revenue engine

Users can:

Build reusable profiles for friends/family

Track birthdays & occasions

Store gift history

Maintain wishlists

Get deeply personalized AI gift ideas

Reduce gift stress year after year

🚀 Key Features
🎯 1. Recipient Profiles (“Gift CRM”)

Each recipient gets a reusable profile containing:

Interests & hobbies

Personality traits

Aesthetic & vibe tags

Favorite brands

Wishlist items

Budget ranges

Relationship to user

Past gifts

Life events

Notes & reminders

Occasion calendar (birthdays, anniversaries, holidays)

GiftPerch remembers everything — even years later.

🧠 2. PerchPal — Your AI Gift Assistant

PerchPal helps users from onboarding → discovery → gifting.
Capabilities include:

Auto-filling profiles from short descriptions

Predicting interests

Generating thoughtful gift ideas with explanations

Detecting personality patterns

Filtering by budgets, vibes, and brands

Avoiding duplicate gifts using history

Warning users about upcoming events

Answering any freeform gifting question

Acting as the warm, friendly UI mascot

PerchPal Mascot

Stylized evergreen-gold bird (your custom vector mascot)

Includes flying loading animations (up flap, mid-frame, down flap)

Includes “retrieving gift” variant (bird flying backwards carrying a gold gift)

🎁 3. AI Gift Generator (Public Tool)

Interactive “AI Gift Finder” with:

Interest filters

Occasion filters

Price range

Aesthetic / vibe

Amazon Product Advertising API integration

Affiliate links (your revenue engine)

“Why this gift fits” explanations

Multi-tier recommendations (budget / mid / premium)

Repeat-prevention

This acts as an SEO magnet for “AI Gift Generator” searches.

💌 4. User Identity & Wishlists

Every user has their own:

Wishlist

Interests

Shareable profile

Optional Amazon wishlist import (future)

Two-sided value:
You create profiles for others → They create profiles for you → Gifting becomes collaborative.

📅 5. Occasion Tracking

Built-in reminder system with:

Birthdays

Anniversaries

Holidays

Custom occasions

Early warnings (“2 weeks until Sarah’s birthday”)

Optional email notifications (later SMS)

📚 6. Gift History

For each recipient, GiftPerch stores:

Title

URL

Price

Occasion

Date

Notes

Tags

This prevents duplicate gifting and increases AI accuracy.

💵 7. Budget Tracking

Per user + per recipient:

Annual budgets

Occasion budgets

Gift price limits

Running totals

AI suggestions are budget-aware

💰 8. Monetization & Affiliate Revenue

Amazon Associates (primary revenue source)
Users click → Buy on Amazon → You earn a commission.

This includes:

Clicking recommended gifts

Clicking any Amazon link via the site

Clicking Amazon from dashboards, reminders, or wishlists

Clicking “Shop Now on Amazon” persistent navbar button (your idea)

Additionally:

Etsy / Target / Best Buy (future)

Premium membership upgrade (wishlist syncing, early alerts, more AI credits)

Corporate gifting tools

Postgres tracks affiliate click-throughs.

🔍 9. Full SEO Optimization Strategy

GiftPerch is designed from day one to rank for:

“AI gift generator”

“gift ideas for boyfriend/girlfriend/friend/coworker/etc.”

“personalized gift finder”

“smart gift ideas”

“AI gift search”

“gift ideas [year]”

“[interest] gift ideas” clusters

SEO pillars include:
Pillar Pages (Evergreen Mega-Guides)

Long-form content (1,500–4,000 words) such as:

“The Ultimate AI Gift Ideas Guide”

“Best Gifts by Personality Type”

“Minimalist Gift Ideas”

“Gifts for People Who Have Everything”

“Gift Ideas by Age / Budget / Vibe”

These anchor your SEO clusters.

Weekly Blog Posts

Posted at: /blog/[slug]

Cover trending searches, seasonal queries, and interest-based gift ideas.

Optimized Metadata

Rich previews

JSON-LD structured data

Occasional schema

Fast load times (Vercel)

Image alt tags

Clear <h1> <h2> <h3> hierarchy

Interactive Tool SEO Boost

Search engines LOVE interactive tools → your AI Gift Generator will act as a traffic magnet.

🎨 Branding & Design

Evergreen + Gold + Cream Color System

Name	Hex	Usage
Evergreen	#0F3D3E	Primary brand color
Gold	#D9C189	Accents / highlights
Cream	#F8F5E0	Background
Sand	#EAE5D3	Light accents
Forest	#13402B	Dark accents

Design Feel:

Clean

Warm

Premium

Minimalist

Trustworthy

Mascot: PerchPal (stylized bird), with:

Idle pose

Flying cycle (3–6 frames)

“Carrying gift” variant

Used in loading animations, onboarding, and PerchPal Chat UI

🏗️ Tech Stack
Frontend

Next.js 15 (App Router)

TypeScript

Tailwind CSS

React Server Components

ShadCN UI (optional)

Backend

Supabase (Postgres, Auth, RLS, Storage)

Supabase Edge Functions

Row Level Security for user data protection

AI

OpenAI API

Custom PerchPal prompt recipes

Gift logic engines

Deployment

Vercel (auto-deploy on push to main)

Supabase (managed backend)

🗂️ Project Structure (Finalized)
giftperch/
├── supabase/                    # SQL migrations, RLS, seed data
├── src/
│   ├── app/
│   │   ├── (marketing)/         # Landing, blog, SEO pages
│   │   ├── dashboard/           # Logged-in home
│   │   ├── recipients/          # Recipient CRUD
│   │   ├── wishlist/            # User wishlist identity
│   │   ├── gifts/               # AI gift generator
│   │   ├── api/                 # Route handlers
│   │   └── page.tsx             # Homepage (marketing)
│   ├── components/
│   │   ├── ui/
│   │   ├── perchpal/            # Chat UI + animations
│   │   ├── recipient/
│   │   └── gifts/
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── ai/
│   │   │   ├── perchPal.ts
│   │   │   └── promptRecipes.ts
│   │   └── utils.ts
│   └── styles/
└── .env.local

🧩 Full Database Schema (Updated)

Users

id

email

display_name

avatar_url

bio

Recipients

id

user_id

name

relationship

pet_type

gender

birthday

annual_budget

gift_budget_min

gift_budget_max

favorite_brands

vibe_tags

notes

Recipient Interests

id

recipient_id

interest_name

category

Wishlists

id

user_id

title

Wishlist Items

id

wishlist_id

title

url

image_url

estimated_price

Past Gifts

id

recipient_id

title

url

price

occasion

date_given

notes

Gift Suggestions

id

recipient_id

ai_model

suggestions_json

created_at

Affiliate Clicks

id

user_id

suggestion_id

product_url

clicked_at

AI Interaction Logs

id

user_id

recipient_id

message

response

created_at

🐦 Animation Assets

Published frames include:

Upward flap

Mid flap

Downward flap

Downward flap (carrying gift)

Upward flap (carrying gift)

Used for:

Loading animations

PerchPal “thinking”

Retrieval animations (“Fetching gifts…”)

🚀 Roadmap (Updated)
Phase 1 — Foundation

Next.js + Tailwind + Supabase wiring

Auth

Recipient CRUD

User Wishlist

Basic PerchPal UI

SEO Marketing pages scaffolded

Phase 2 — AI Engine

PerchPal signature prompt system

Gift suggestion generator

Budget logic

Duplicate-prevention logic

Improvements from user history

Phase 3 — Amazon API + Monetization

Amazon PA-API integration

Affiliate tracking

Analytics dashboard

Optional Premium tier

Phase 4 — Growth & SEO

Blog system

Pillar pages

Shareable profiles

Social meta cards

Email notifications

🧪 Development
npm install
npm run dev
npm run build


.env.local

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_PASSWORD=

📜 License

MIT (Recommended)

💬 Contact

Created by Jason Conklin
Portfolio: https://jasonconklin.dev

Project: https://giftperch.com
## Database & Migrations
GiftPerch stores data in Supabase Postgres. SQL migrations live in supabase/migrations/ and seed data lives in supabase/seed/seed_giftperch.sql.

```bash
# Apply migrations (requires Supabase CLI)
supabase db push

# Reset local database (drops, migrates, seeds)
supabase db reset
```

Before running the seed file, replace the placeholder demo_user_id with a real auth.users.id from your project. When you are ready to generate typed helpers, run:

```bash
supabase gen types typescript --project-id "<project-id>" --schema public > src/lib/database.types.ts
```
