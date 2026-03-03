

# Role-Based Dashboard Cards

## Revised Role Definitions

Based on your clarification, the **Admin** is a platform-level superuser who manages the Scorz infrastructure itself -- they don't run competitions directly. Here's the corrected mapping:

## Card Sets by Role

### Admin (Platform Superuser)
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| Admin Panel | Manage users, settings & billing | `/admin` | `Shield` |
| Platform Analytics | View metrics across all events | `/admin` | `BarChart3` |
| All Competitions | Browse all hosted competitions | `/competitions` | `Trophy` |
| Support Mode | Masquerade as an organiser | `/admin` | `Eye` |

### Organiser
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| My Competitions | Manage your events & stages | `/competitions` | `Trophy` |
| Judging Hub | Monitor all scoring | `/judging` | `ClipboardList` |
| Contestants | Registrations & profiles | `/profile` | `Users` |
| Payments | View ticket sales & revenue | `/competitions` | `CreditCard` |
| People's Choice | Audience voting | `/competitions` | `Mic` |

### Judge
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| My Assignments | View and score your sessions | `/judge-dashboard` | `ClipboardList` |
| Rules & Rubric | Competition rules and criteria | `/competitions` | `BookOpen` |
| Judging Hub | Monitor scoring progress | `/judging` | `BarChart3` |

### Chief Judge
All Judge cards, plus:
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| Certify Results | Review and certify results | `/chief-judge` | `ShieldCheck` |

### Tabulator (includes Witness duties)
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| Tabulator Dashboard | Verify scores & witness results | `/tabulator` | `BarChart3` |
| Judging Hub | Monitor scoring progress | `/judging` | `ClipboardList` |

### Contestant
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| My Profile | View registration & profile | `/profile` | `User` |
| Public Events | Browse competitions | `/public-events` | `Calendar` |

### Audience
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| Public Events | Browse competitions | `/public-events` | `Calendar` |
| People's Choice | Cast your votes | `/competitions` | `Mic` |

### No Roles (New User)
| Card | Description | Route | Icon |
|------|-------------|-------|------|
| Public Events | Browse competitions | `/public-events` | `Calendar` |
| Pricing | View plans & get started | `/pricing` | `DollarSign` |

## Multi-Role Handling
Users with multiple roles see the union of all their role cards, deduplicated by route (first occurrence wins for title/description).

## Technical Details

**Single file change:** `src/pages/Dashboard.tsx`

1. Define a `ROLE_CARDS` map keyed by role, each containing an array of card configs (title, desc, icon, color, route)
2. Iterate user's `roles` array, collect all matching cards, deduplicate by route
3. If no roles, show the fallback "new user" set
4. Import new icons: `Shield`, `BarChart3`, `Eye`, `CreditCard`, `BookOpen`, `ShieldCheck`, `User`, `Calendar`, `DollarSign`
5. Keep existing animation variants, greeting, and card component structure unchanged
6. No database changes or new API calls required
