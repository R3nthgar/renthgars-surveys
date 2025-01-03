## Getting Started

This project uses Firestore to store its data.

To continue using Firestore, [create a database](https://firebase.google.com/docs/firestore/quickstart).
Once you've done that, you need a service account and private key. [Go to IAM & admin > Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) in the Google Cloud console. Generate a new private key and save the JSON file. Then create a new .env file and set the following environmental variables:
Set FIREBASE_PRIVATEKEY to your private key.
Set FIREBASE_PROJECTID to your project id.
Set FIREBASE_CLIENTEMAIL to your client email.

If you're not using Firestore, then replace the functions in app/components/firestore.ts.

This project also uses functions to secure passwords.

To continue using these functions, create an environmental variable called ENCRYPTER_PRIVATEKEY, and set it to a random string.

If you don't want to use these functions, replace the functions in app/components/encrypter.ts.

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

## How To Use

Once the server is running, create surveys by going to the editor subdirectory of your domain and creating an account. To take surveys, go to the main directory of your domain.

## Customizing

You can change the title by modifying the metadata export in app/layout.tsx

You can add survey templates for users by creating your own survey, downloading it as a JSON, and pasting the contents into the array in app/surveyTemplates.ts
