# Budget+ Cloud Functions（極簡記帳）

[![CI](https://github.com/kevinguitar/budgetplus-cloud-functions/actions/workflows/ci.yaml/badge.svg)](https://github.com/kevinguitar/budgetplus-cloud-functions/actions/workflows/ci.yaml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

Budget+ is an easy to use co-spending tracker to track expenses together with your friends and family.

This repository contains all the cloud functions that deal with database interactions and
push notifications for Budget+ app.

## Functions Overview
- Handle Google Play voided purchases: [handlePlayNotification.ts](functions/src/handlePlayNotification.ts)
- Send push notifications when new members join the accounting book: [newMemberNotification.ts](functions/src/newMemberNotification.ts)
- Send general push notifications via topic: [pushNotificationSender.ts](functions/src/pushNotificationSender.ts)
- Send push notifications to internal users on every new purchases: [purchaseNotification.ts](functions/src/purchaseNotification.ts)
- Clean up the stale accounting book joining links in database: [cleanUpJoinInfo.ts](functions/src/cleanUpJoinInfo.ts)
- Clean up the archived accounting books and their records in database: [cleanUpArchivedBooks.ts](functions/src/cleanUpArchivedBooks.ts)
- Clean up the inactive users and their books in database: [cleanUpInactiveUsers.ts](functions/src/cleanUpInactiveUsers.ts)
- Delete a user account and all owned books upon request: [deleteUserAccount.ts](functions/src/deleteUserAccount.ts)

## Build and Deploy

Build the project:
```bash
cd functions && npm run build
```

Host a function that declared in `package.json`'s `main` locally:
```bash
firebase serve --only functions
```

Deploy all functions to the cloud:
```bash
firebase deploy
```

Deploy a specific function to the cloud:
```bash
firebase deploy --only functions:myFunction
```

Delete functions on the cloud:
```bash
firebase functions:delete myFunction myOtherFunction
```

For more usages, refer to:
- Official samples: https://github.com/firebase/functions-samples
- Official docs: https://firebase.google.com/docs/reference/functions

## Mobile Client
https://github.com/kevinguitar/budgetplus

---

License
-------

    Copyright (c) 2024 Kevin Chiu

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    
    http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
