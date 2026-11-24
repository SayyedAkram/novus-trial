# E2E Test Steps — 4821 Item management

## System Under Test
| Item | Value |
|------|-------|
| Environment | DEV — the fixture app (`app/server.js`) |
| Development branch | `develop` |
| This item's PR | (fixture) |
| Confirm it is deployed | The fixture server answers on its port |
| Services the test needs | none |
| Test data / accounts to seed | admin user |

### TC-E2E-01 — Save an item from the items page

| Field | Value |
|-------|-------|
| **Traces to** | AC-1 |
| **Type** | E2E |
| **Priority** | P1 |
| **Preconditions** | The fixture app is running |
| **Test data** | admin user; item name "Widget" |

**Steps**
1. Open the items page
2. Enter the item name "Widget"
3. Press Save

**Expected result**
- The confirmation "Item stored" is shown

**Pass/Fail criteria**: the confirmation text is shown
**Cleanup**: restart the fixture app

### TC-E2E-02 — Upload an attachment

| Field | Value |
|-------|-------|
| **Traces to** | AC-2 |
| **Type** | E2E |
| **Priority** | P2 |
| **Preconditions** | The fixture app is running |
| **Test data** | admin user; a small text file |

**Steps**
1. Open the upload page
2. Choose a small text file
3. Press Upload

**Expected result**
- The file is accepted

**Pass/Fail criteria**: no error is shown
**Cleanup**: none

### TC-E2E-03 — Item list ordering

| Field | Value |
|-------|-------|
| **Traces to** | AC-3 |
| **Type** | E2E |
| **Priority** | P3 |
| **Preconditions** | Two items exist |
| **Test data** | admin user |

**Steps**
1. Open the items page
2. Read the item list

**Expected result**
- TO CONFIRM: newest first or oldest first?

**Pass/Fail criteria**: the agreed order
**Cleanup**: none
