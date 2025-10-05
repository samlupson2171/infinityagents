# Offers Section Development Plan

## Overview
The **Offers Section** will display packages by destination (starting with **Benidorm**).  
Users will be able to:
1. Select a **Month**  
2. Choose between **Hotel** or **Self-Catering**  
3. View the **Price** and **Full Package Details**

---

## Destination: Benidorm

### Package Inclusions (for all offers)
- Return private transfers from and to the airport (6 pax or more)  
- Smashed group bar crawl with 5 shots and games (Fridays / Saturdays only)  
- Centrally located accommodation (usually with pools, bars, and 24 hr reception)  
- Based on 4-share apartments (no bed sharing)  
- Chilled bottle of bubbly on arrival for the stag/hen  
- Informative welcome pack on arrival (including “I’m lost cards”)  
- 24-hour rep service  
- **Hens**: Cava reception in a central venue  
- **Stags**: VIP Lap club entry with stag stitch-up (any night except Tuesday)  

---

### Pricing Structure

#### Hotel

| Month   | 2 Nights | 3 Nights | 4 Nights |
|---------|----------|----------|----------|
| January | €105     | €105     | €119     |
| February| €105     | €105     | €119     |
| March   | €123     | €123     | €139     |
| April   | €141     | €141     | €157     |
| **Easter (18–21 Apr)** | €173 | €173 | €189 |
| May     | €163     | €163     | €179     |
| June    | €173     | €173     | €188     |
| July    | €189     | €189     | €205     |
| August  | €193     | €193     | €209     |
| September| €163    | €163     | €179     |
| October | €140     | €140     | €156     |
| November| €128     | €128     | €144     |

#### Self-Catering

| Month   | 2 Nights | 3 Nights | 4 Nights |
|---------|----------|----------|----------|
| January | €101     | €101     | €115     |
| February| €101     | €101     | €115     |
| March   | €119     | €119     | €135     |
| April   | €137     | €137     | €153     |
| **Easter (18–21 Apr)** | €169 | €169 | €185 |
| May     | €159     | €159     | €175     |
| June    | €169     | €169     | €184     |
| July    | €185     | €185     | €201     |
| August  | €189     | €189     | €205     |
| September| €159    | €159     | €175     |
| October | €136     | €136     | €152     |
| November| €124     | €124     | €140     |

---

## Functional Requirements

- **Filter by Destination**  
  - Dropdown (e.g., Benidorm, future destinations to add)  

- **Filter by Month**  
  - Dropdown with months (Jan – Nov + Easter special)  

- **Filter by Accommodation Type**  
  - Options: Hotel / Self-Catering  

- **Output Display**  
  - Price table for selected month & accommodation type  
  - Package details displayed underneath  

---

## Next Steps
- [ ] Upload hotel and self-catering pricing tables to CMS / database.  
- [ ] Define **front-end layout** (cards, tables, or list view).  
- [ ] Build filters (destination, month, accommodation type).  
- [ ] Connect dynamic pricing via JSON/DB structure.  
- [ ] Add **booking CTA** (e.g., "Book Now" button with enquiry form).  
