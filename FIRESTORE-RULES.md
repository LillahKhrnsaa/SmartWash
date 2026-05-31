# Firestore Security Rules untuk Development

Gunakan rules ini di Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Langkah:
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project **pilates-reservation-next**
3. Pergi ke **Firestore Database** → **Rules**
4. Ganti rules dengan yang di atas
5. Klik **Publish**

> ⚠️ **WARNING**: Rules ini untuk development saja! Untuk production, gunakan rules yang lebih ketat berdasarkan authentication.
