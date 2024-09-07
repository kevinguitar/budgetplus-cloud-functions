# Budget+ Cloud Functions（極簡記帳）
Budget+ is an easy to use co-spending tracker to track expenses together with your friends and family.

This repository contains all the cloud functions that deal with database interactions and
push notifications for Budget+ app.

## Functions Overview
- Send push notifications when new members join the accounting book: [newMemberNotification.ts](functions/src/newMemberNotification.ts)
- Send general push notifications via topic: [pushNotificationSender.ts](functions/src/pushNotificationSender.ts)
- Send push notifications to internal users on every new purchases: [purchaseNotification.ts](functions/src/purchaseNotification.ts)
- Clean up the stale accounting book joining links in database: [cleanUpJoinInfo.ts](functions/src/cleanUpJoinInfo.ts)
- Clean up the archived accounting books and their records in database: [cleanUpArchivedBooks.ts](functions/src/cleanUpArchivedBooks.ts)

## Build and Deploy

Build the project:
```bash
npm run build
```

Host a function that declared in `package.json`'s `main` locally:
```bash
firebase serve --only functions
```

Deploy a function to the cloud:
```bash
firebase deploy
```

For more usages, refer to:
- Official samples: https://github.com/firebase/functions-samples
- Official docs: https://firebase.google.com/docs/reference/functions

## Android Client
https://github.com/kevinguitar/budgetplus-android

## License
![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
```
Copyright (c) 2024 kevinguitar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
