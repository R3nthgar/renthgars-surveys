## Getting Started

This project uses Firestore to store it's data.

To continue using Firestore, [http://localhost:3000](create a database).
Once you've done that, you need a service account and private key. [https://console.cloud.google.com/iam-admin/serviceaccounts](Go to IAM & admin > Service accounts) in the Google Cloud console. Generate a new private key and save the JSON file. Then create a new .env file and set the following environmental variables:
Set FIREBASE_PRIVATEKEY to your private key.
Set FIREBASE_PROJECTID to your project id.
Set FIREBASE_CLIENTEMAIL to your client email.

If you're not using Firestore, then replace the functions in app/components/dataModifier.ts, under //Firestore functions

This project also uses functions to secure passwords.

To continue using these functions, create an environmental variable called ENCODED_PRIVATEKEY, and set it to a random string.

If you don't want to use these functions, replace the functions in app/components/dataModifier.ts, under //Encoding functions, and where it calls it in the Sign Up button in app/editor/page.tsx.

## Running the server

Running the development server:

```bash
npm run dev
```

Running the production server:

```bash
npm run build
npm run start
```
