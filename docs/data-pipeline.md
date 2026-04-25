# Blaniko Data Pipeline

This document explains how venue and activity data should move from the team Google Sheet into the Blaniko frontend.

## Goal

Blaniko helps people discover activities, places, and things to do in Casablanca.

The MVP should focus on discovery, not bookings, payments, accounts, or backend systems.

## Category Policy

Blaniko should not become a restaurant directory.

The official policy is:

Include a place only if it answers:

"What can I do there?"

Do not include a place only because it answers:

"Where can I eat?"

## Food and Café Rule

Cafés and restaurants are allowed only when they are experience-based.

Allowed examples:

- Rooftop café with a strong view or atmosphere
- Beach club
- Game café
- Date-night experience
- Brunch experience
- Theme restaurant
- Unique social hangout
- Food spot connected to an activity or outing

Avoid:

- Generic restaurant
- Generic café
- Normal fast food place
- Hotel restaurant
- Place that is only useful as a food listing

## Current Data Sources

There are currently three data layers:

1. Google Sheet

The team uses the Google Sheet to collect raw venue/activity information.

2. frontend/src/data/mockData.ts

This is the current source of truth for venue data inside the website.

3. Admin page

The Admin page is currently a local prototype. It stores changes in browser localStorage, so it is not a real shared database yet.

Do not treat Admin page edits as permanent project data unless they are manually converted into code.

## Current Google Sheet Columns

The Google Sheet currently includes fields such as:

- ID
- Venue Name
- Category
- Subcategory
- Audience
- City
- Neighborhood
- Address
- Maps Link
- Instagram
- Website
- Phone / WhatsApp
- Price Range
- Indoor / Outdoor
- Booking Method
- Booking Link / Contact URL
- Best For
- Highlights
- Fetched By
- Contact Status

These are good research and operations fields.

## Current Website Venue Fields

The frontend currently expects venue data in frontend/src/data/mockData.ts.

Important website fields include:

- slug
- name
- category
- categorySlug
- area
- coordinates
- description
- shortDescription
- overview
- vibe
- vibeSummary
- audience
- priceLevel
- bestForTags
- timeOfDay
- energyLevel
- socialLevel
- spaceType
- translations

## Sheet to Website Mapping

Use this mapping when converting sheet rows into website data:

| Google Sheet Field | Website Field |
| --- | --- |
| Venue Name | name |
| Category | category |
| Category | categorySlug after slug conversion |
| Neighborhood + City | area |
| Maps Link | reference only for now |
| Address | reference only for now |
| Instagram | reference only for now |
| Website | reference only for now |
| Phone / WhatsApp | reference only for now |
| Price Range | priceLevel |
| Indoor / Outdoor | spaceType |
| Best For | bestForTags |
| Highlights | overview, vibe, vibeSummary |
| Audience | audience |
| Booking Method | reference only for now |
| Booking Link / Contact URL | reference only for now |

Some sheet fields are not displayed yet, but they are still useful for future outreach, partnerships, and verification.

## MVP Data Pipeline

For now, use this process:

1. Team fills the Google Sheet.
2. Team avoids generic restaurants and generic cafés.
3. Achraf or the data lead reviews rows for quality.
4. Only strong MVP-fit venues are selected.
5. Selected venues are converted into frontend/src/data/mockData.ts.
6. Run npm run build.
7. Run npm run lint.
8. Open a Pull Request into dev.

## Required Quality Rules

Every selected venue should have:

- Clear name
- Clear category
- Casablanca area or neighborhood
- Short description
- Reason why it belongs on Blaniko
- Best-for tags
- Indoor/outdoor classification if known
- Price range if known
- Source link if possible

Do not add weak rows just to increase quantity.

Quality matters more than number of venues.

## Recommended MVP Categories

Recommended categories for now:

- Escape rooms
- Cinema
- Theme parks
- Karting
- Gaming
- Sports
- Outdoor
- Beach and seaside
- Kids activities
- Museums and culture
- Events
- Wellness and spa
- Experience-based cafés
- Experience-based food spots

Avoid making Restaurants a main MVP category unless the place is clearly experience-based.

## Contact Status

The Contact Status column is useful for business/outreach, not necessarily for the public website.

Suggested values:

- Not Started
- Contacted
- Replied
- Interested
- Not Interested
- Needs Follow-up
- Verified

## Who Does What

Achraf:

- Defines MVP data rules
- Reviews final data before it enters code
- Decides what belongs in the product

Benmoussa and Ouassim:

- Research venues
- Fill missing data
- Check if places are real and relevant
- Avoid low-quality generic listings

Mohamed:

- Helps convert cleaned data into frontend format
- Checks that data works in pages, filters, maps, and venue details

Bekkali:

- Tracks partnership potential
- Notes which venues are worth contacting
- Helps with outreach status and business value

Akram:

- Uses the data to improve UI display and user experience

## Future Improvements

Later, the pipeline can become more automated:

- Google Sheet export to CSV
- Script that converts CSV into TypeScript venue data
- Validation for missing required fields
- Automated slug generation
- Better admin system
- Backend database

For now, keep it simple and reliable.
