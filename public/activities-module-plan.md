# Travel Agent Portal - Activities Module

## Overview
This module allows travel agents to search, browse, and add activities to custom holiday packages. Activities are uploaded via CSV files.

---

## CSV Upload Format
The system accepts `.csv` files with the following headers:

- **Activity**: Name of the activity
- **Category**: Type (Excursion, Show, Transport, etc.)
- **Location**: Destination or city
- **PricePerPerson**: Price per person in EUR
- **MinPersons**: Minimum persons required
- **MaxPersons**: Maximum persons allowed
- **AvailableFrom**: Start date (YYYY-MM-DD)
- **AvailableTo**: End date (YYYY-MM-DD)
- **Duration**: Time length (e.g., 3h, Full Day)
- **Description**: Text description of the activity

---

## Features

### Upload & Store
- Admin can upload CSV with activities.
- System validates and imports to database.

### Browse & Search
- Filter by destination, category, date range, and price.
- Search by activity name or keyword.

### Activity Detail Page
- Shows all details (price, description, availability).
- Option to add to package.

### Package Builder
- Agents can add multiple activities.
- System calculates total cost.
- Save as draft or export as branded PDF quote.

---

## User Flow

1. Agent logs in.
2. Goes to "Activities" section.
3. Searches or browses activities.
4. Adds selected activities to package.
5. Exports package as PDF or saves it.

---
