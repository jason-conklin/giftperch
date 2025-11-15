🎁 GiftPerch — AI-Powered Gifting, Reinvented

GiftPerch is an AI-powered gifting platform designed to make meaningful gift-giving effortless.
Users create reusable recipient profiles (a “Gift CRM”), build their own wishlist identity, and receive deeply personalized AI gift recommendations powered by PerchPal — your friendly AI assistant.

GiftPerch is built for people who want thoughtful, personal gifts without the stress of remembering details, preferences, occasions, budgets, or past purchases.

Live site (Coming Soon Page): https://giftperch.com

🌟 Key Features

🎯 1. Recipient Profiles (Gift CRM)

Users build rich profiles for friends, partners, family, coworkers, and anyone they shop for:

Interests & hobbies

Personality traits

Aesthetic & vibe tags

Favorite brands

Wishlists

Life events

Budgets

Past gifted items

Their relationship to the user

Profiles are reusable across years and events — GiftPerch remembers everything.

🧠 2. PerchPal — Your AI Gift Assistant

The signature feature of GiftPerch.

PerchPal can:

Auto-fill recipient profiles from short descriptions

Suggest interests during onboarding

Generate tailored gift recommendations with explanations

Detect personality patterns

Provide rationale for each suggested gift

Analyze budgets, avoid duplicates, prevent bad fits

Answer freeform gift questions

Warn users about upcoming birthdays & events

Increase engagement with warm, friendly guidance

PerchPal is also the UI mascot, styled to match the Evergreen + Gold + Cream palette.

🎁 3. AI Gift Generator

An interactive gift finder with deep personalization:

Filters for price range, brand, interests, vibe, occasion

Amazon Product Advertising API integration

Affiliate links for monetization

Gift explanations (“why this fits”)

Avoids repeats using gift history

Multi-tier suggestions (budget / mid / premium)

💌 4. User Identity & Wishlist

Every user also has their own:

Personal wishlist

Interests

Profile card

Amazon wishlist import (future feature)

Friends can use your profile to get AI suggestions for you.

This makes GiftPerch a two-sided platform:

You create profiles for others

Others create profiles for you

Everyone wins

📅 5. Occasion Tracking

Built-in reminder system:

Birthdays

Holidays

Anniversaries

Custom events

Smart notifications via email / SMS (later)

📚 6. Gift History

Tracks what a user gifted to each recipient:

Prevents accidental duplicates

Improves AI over time

Creates a sentimental archive

💵 7. Budget Tracking

Each profile can have:

Annual budget

Occasion budgets

Gift limits

Running totals

AI suggestions within budget constraints

💰 8. Monetization & Affiliate Tracking

GiftPerch earns revenue through:

Amazon Associates (primary)

Etsy / Target / Best Buy (future)

Premium membership tier

Corporate/advisory gifting tools

Affiliate link clicks are tracked in Postgres for analytics.

🔍 9. Full SEO Optimization

GiftPerch is built from day one to dominate:

“AI gift generator”

“gift ideas for him/her/friends/coworkers”

“personalized gift finder”

“smart gift ideas”

“wish list sharing platform”

SEO features include:

Pillar pages (curated, large evergreen guides)

Weekly blog posts

Structured content clusters

Optimized metadata

2-second load times via Vercel

Semantic HTML

Social meta images

Fast Lighthouse scores

🎨 Branding & Design System
Palette (Saved in Default Memory)

Evergreen + Gold + Cream

#0F3D3E — Evergreen

#F8F5E0 — Cream

#D9C189 — Soft Gold

Slate accents

UI Philosophy

Clean

Warm

Minimal

Premium feel

Personalized & human-centered

Mascot

PerchPal, a small stylized bird (from the GiftPerch logo), integrated into chat UI and onboarding flows.

🏗️ Tech Stack
Frontend

Next.js (App Router)

TypeScript

Tailwind CSS

React Server Components

ShadCN UI (optional)

Backend

Supabase

Postgres

Auth

Storage

RLS policies

Edge Functions

AI Layer

OpenAI API

Local models (LM Studio) during development

Deployment

Vercel (Production)

Supabase (Managed Postgres backend)

🗂️ Project Structure (Recommended)
giftperch/
├── supabase/              # SQL migrations, policies (Codex will generate)
├── src/
│   ├── app/
│   │   ├── (marketing)/   # Landing pages, blog, pillar content
│   │   ├── dashboard/     # Logged-in experience
│   │   ├── recipients/    # Recipient CRUD
│   │   ├── wishlist/      # User wishlist identity
│   │   ├── gifts/         # Suggestion UI
│   │   ├── api/           # Route handlers (server actions)
│   │   └── page.tsx       # Homepage
│   ├── components/
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── ai/
│   │   │   ├── promptRecipes.ts
│   │   │   └── perchPal.ts
│   │   └── utils.ts
│   └── styles/
└── .env.local

🧩 Database Schema (Supabase) Summary
Users

id

email

display_name

avatar_url

bio

Recipient Profiles

id

user_id (owner)

name

relationship

age

gender

budget_annual

budget_per_gift

birthday

notes

Interests

id

recipient_id

interest_name

category

Wishlists

id

user_id

Wishlist Items

id

wishlist_id

title

url

image_url

price_estimate

Gift Suggestions

id

recipient_id

ai_model

suggestions_json

created_at

Past Gifts

id

recipient_id

title

url

price

date_given

notes

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

🚀 Roadmap
Phase 1 — Core Infrastructure

Next.js + Supabase wired

Auth (Login/Signup/Magic Links)

Recipient CRUD

User wishlist

PerchPal chat skeleton

Gift Suggestions UI (mock data)

Phase 2 — AI Layer

PerchPal prompt system

Gift recommendation pipeline

Amazon API integration

Gift rationale generator

Avoid duplicates

Budget-aware recommendations

Phase 3 — Monetization

Affiliate tracking

Premium plans

Stripe integration (later)

Phase 4 — SEO & Growth

Pillar content

Weekly blog posts

Shareable profile URLs

Public gift guides

Social preview cards

🧪 Development Setup
Install dependencies
npm install

Run dev server
npm run dev

Build for production
npm run build

Environment variables

Create .env.local with:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_PASSWORD=

☁️ Deployment

GiftPerch deploys via Vercel automatically on every push to main.

Staging/previews available per Pull Request.

Supabase project is managed separately.

🔧 Codex Usage Instructions

Codex should always be given:

This README

The database schema

The desired file or component to implement

Example Codex command:

“Generate the Recipient Profile Creation page using the GiftPerch README as the project spec.
Use Supabase for data persistence and the Evergreen+Gold+Cream palette.”

Codex will follow the spec exactly.

📜 License

TBD (MIT recommended)

💬 Contact

Created by Jason Conklin
Portfolio: https://jasonconklin.dev

Project: https://giftperch.com