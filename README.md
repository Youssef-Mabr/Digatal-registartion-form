# Digital Registration Form

If you want this project on your PC in your **Downloads** folder, run one of these commands:

## Windows (PowerShell)
```powershell
cd $HOME\Downloads
git clone https://github.com/Youssef-Mabr/Digatal-registartion-form.git
```

## macOS / Linux (Terminal)
```bash
cd ~/Downloads
git clone https://github.com/Youssef-Mabr/Digatal-registartion-form.git
```

This creates:
- `Downloads/Digatal-registartion-form`

> Note: the repository slug is currently `Digatal-registartion-form`, so keep that exact name in clone commands.

## Deployment

### Backend on Google Cloud Run

The backend already has a production Docker entrypoint in [backend/Dockerfile](backend/Dockerfile). Deploy it as a Cloud Run service and set these environment variables:

- `MONGODB_URI`
- `DB_NAME`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CORS_ORIGIN` with your GitHub Pages origin and any local origins you still use
- `RESEND_API_KEY` for automatic approval emails

The app loads [backend/.env](backend/.env) locally, but in Cloud Run you should set the variables in the service configuration instead of relying on a file.

The easiest Cloud Run flow is:

1. Build the image from `backend/`.
2. Deploy the image to Cloud Run.
3. Use the Cloud Run service URL `https://hispeedcity-backend-635388135964.us-central1.run.app/api` in the frontend `API_BASE_URL` secret described below.

### Frontend on GitHub Pages

The frontend is static and can be deployed from GitHub Pages with the workflow in [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml).

Set a repository variable named `API_BASE_URL` to your Cloud Run API base, for example `https://hispeedcity-backend-635388135964.us-central1.run.app/api`.

The workflow writes that value into [frontend/public/config.js](frontend/public/config.js) before building so the browser can reach the deployed backend.
