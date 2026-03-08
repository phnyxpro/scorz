

## Plan: Mark 3 Contestants as No Show

### What
Update the status of **Darcelle Rodrigo**, **Kedisha Thomas**, and **Khadeem John** from `approved` to `no_show` in the Trinidad sub-event.

### Found Records
| Contestant | Registration ID | Current Status |
|---|---|---|
| Darcelle Rodrigo | `7e64f43a-...` | approved |
| Kedisha Thomas | `347c2e1b-...` | approved |
| Khadeem John | `a974a8d2-...` | approved |

### Implementation
Call the existing `withdraw_contestant` database function for each contestant with `_new_status = 'no_show'`. This function:
- Sets status to `no_show`
- Clears `sub_event_id` to `NULL`
- Deletes any associated scoring data, timer events, audience votes, and slot assignments

Since these three contestants have **zero scores** (confirmed in the previous analysis), no scoring data will be lost.

Three sequential data operations — no code file changes needed.

