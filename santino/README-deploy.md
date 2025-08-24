This repository includes a GitHub Actions workflow that builds the project and deploys the generated `public/` folder to an SFTP server (Reg.ru).

Setup steps

1) Add the following secrets to your GitHub repository (Settings → Secrets → Actions):

- SFTP_HOST (e.g. 37.140.192.190)
- SFTP_PORT (22)
- SFTP_USER (e.g. u2852181)
- SFTP_PASSWORD (or use SFTP_PRIVATE_KEY instead)
- SFTP_PRIVATE_KEY (optional, if using SSH key auth)
- DEPLOY_REMOTE_DIR (e.g. /www/santino.com.ru/beta)

2) Optional: set up Netlify/Vercel tokens if you want automatic staging deployments.

Usage

- Push to `develop` branch to run the build job.
- Run "Run workflow" (Actions → CI / Build & SFTP Deploy → Run workflow) to trigger the full job and deploy to the server.

Notes

- The workflow uses `appleboy/scp-action` to copy the `public/` files to the remote server.
- Ensure the remote path is correct and the server user has permissions to write there.
- Keep secrets private.
