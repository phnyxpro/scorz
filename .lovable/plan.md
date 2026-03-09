

## Insert Missing Performance Durations for 6 Contestants

### Data to Insert

All records go into the `performance_durations` table for sub-event `14ae92f2-a730-4c72-9aa1-19b0e3561722`, using tabulator `e9a05993-c615-425a-afb6-dd0a270cf0d2`.

| Contestant | Registration ID | Duration | Seconds |
|---|---|---|---|
| Jael Reyes | `cfd821d2-9f1b-4926-a282-9c447fab3f6f` | 03:01 | 181 |
| Semira Bradshaw | `4c35777b-ce9d-4581-b6c8-887589b8d834` | 03:31 | 211 |
| Miguel Jagarnath | `8b1a76af-4893-46c7-bad3-687315e129cf` | 03:26 | 206 |
| Kayla Martin | `27611e81-ba7a-480d-abb7-d1ecdb660367` | 03:28 | 208 |
| Shaunelle Noble | `fae92c97-ebfd-4a6f-a1b9-52fc99bf29f7` | 03:51 | 231 |
| Shakir Gray | `8d110a4a-eab4-4dc9-be44-b15bc0ea4541` | 02:38 | 158 |

### Implementation

Single SQL INSERT into `performance_durations` with all 6 rows. Each row includes `sub_event_id`, `contestant_registration_id`, `tabulator_id`, and `duration_seconds`.

After insertion, verify all 61 contestants now have duration records, and the Score Tables page reflects the updated data.

