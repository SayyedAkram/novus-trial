# API Test Steps — 4821 Item management

## System Under Test
| Item | Value |
|------|-------|
| Environment | DEV — the fixture app (`app/server.js`) |
| Development branch | `develop` |
| This item's PR | (fixture) |
| Confirm it is deployed | The fixture server answers on its port |
| Services the test needs | none |
| Test data / accounts to seed | admin user (token) |

### TC-API-01 — List items

| Field | Value |
|-------|-------|
| **Traces to** | AC-4 |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | The fixture app is running |
| **Test data** | admin user (bearer token) |

**Steps**
1. Send GET /api/items with the admin user's bearer token

**Expected result**
- Status 200
- The body contains `items`

**Pass/Fail criteria**: both expectations hold
**Cleanup**: none

### TC-API-02 — Create an item

| Field | Value |
|-------|-------|
| **Traces to** | AC-4 |
| **Type** | API |
| **Priority** | P1 |
| **Preconditions** | The fixture app is running |
| **Test data** | admin user (bearer token); body `{"name": "Gadget"}` |

**Steps**
1. Send POST /api/items with the admin user's bearer token and the body

**Expected result**
- Status 201
- The body contains the item name

**Pass/Fail criteria**: both expectations hold
**Cleanup**: restart the fixture app
